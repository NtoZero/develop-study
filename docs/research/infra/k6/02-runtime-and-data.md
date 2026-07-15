---
title: "런타임 생명주기와 데이터 격리"
description: "init, setup, VU code, teardown의 실행 위치와 VU별 JavaScript VM, 데이터 직렬화 비용을 분석한다"
domain: "infra"
topic: "k6"
difficulty: "detail"
last_verified: "2026-07-16"
---

# 런타임 생명주기와 데이터 격리

## 생명주기는 단순한 hook 순서가 아니다

k6 스크립트는 `init → setup → VU code → teardown → handleSummary` 순서로 보이지만, 각 단계는 실행 횟수와 격리 수준이 다르다. 이 차이가 대용량 fixture의 메모리 사용, 인증 토큰의 공유, 테스트 재현성을 결정한다.

| 단계 | 실행 횟수·위치 | 네트워크 요청 | 주 용도 |
| --- | --- | --- | --- |
| init context | VU마다 별도 VM 초기화 | 금지 | import, 옵션, 로컬 파일 로드, `SharedArray` 구성 |
| `setup()` | 전체 테스트에서 한 번 | 허용 | 공통 사전 조건·토큰·seed |
| VU code | 각 VU가 iteration마다 | 허용 | 실제 workload |
| `teardown(data)` | 전체 테스트에서 한 번 | 허용 | 정리와 후처리 |
| `handleSummary(data)` | 실행 종료 후 한 번 | 해당 용도 아님 | 종료 요약 출력 가공 |

## VU별 JavaScript VM

k6 v2는 Go 안에 Sobek JavaScript 엔진을 내장한다. VU는 독립된 JS VM을 가지므로 module-scope 변수도 VU 간에 직접 공유되지 않는다. 이는 동시 접근 race를 줄이고 사용자별 상태를 유지하기 쉽게 하지만, 큰 배열을 평범하게 import하면 VU 수만큼 메모리가 증폭될 수 있다.

```javascript
import http from 'k6/http';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', () =>
  JSON.parse(open('./users.json'))
);

export const options = { vus: 20, duration: '30s' };

export function setup() {
  return { runId: `run-${Date.now()}` };
}

export default function (data) {
  const user = users[(__VU - 1) % users.length];
  http.get(`http://target.test/users/${user.id}`, {
    tags: { operation: 'read-user', run_id: data.runId },
  });
}
```

## SharedArray가 절약하는 것과 절약하지 않는 것

`SharedArray` factory는 init context에서만 호출할 수 있다. 배열 원본을 공유된 메모리 형태로 보관하고, 인덱스로 읽은 원소는 VU에 복사해 반환한다. 그래서 읽기 전용 대형 fixture에는 유리하지만 다음 오해는 피해야 한다.

- `map()`이나 `filter()` 결과는 일반 배열이므로 다시 VU별 메모리를 차지한다.
- `setup()`이 반환한 데이터는 VU에 전달되며 직렬화된다. 대형 fixture를 `setup()`에서 반환하면 `SharedArray`의 이점을 잃는다.
- 매 iteration마다 거대한 객체를 꺼내면 역직렬화 비용이 커질 수 있다.
- 배열을 공유한다고 테스트 계정의 서버 상태가 격리되는 것은 아니다.

### 정량적 사고 모델

평범한 fixture 크기를 `D`, VU 수를 `N`, VM별 객체 overhead를 `α`라고 두면 단순화된 메모리 증폭은 다음처럼 생각할 수 있다.

```text
ordinary array memory ≈ N × D × α
SharedArray memory     ≈ D_shared + active element copies
```

실제 값은 엔진 표현과 데이터 형태에 따라 달라져 공식처럼 예측할 수 없지만, `N`이 커질수록 구조적 차이는 커진다. “SharedArray가 항상 빠르다”가 아니라 **메모리 중복과 원소 복사 비용 사이의 trade-off**다.

## setup 데이터는 스냅샷이지 공유 저장소가 아니다

`setup()` 반환값을 각 VU가 수정해도 다른 VU와 공유되는 전역 상태로 사용하면 안 된다. 테스트 계정 할당이 필요하면 실행 context의 `vu.idInTest`, `scenario.iterationInTest`처럼 테스트 전체에서 고유한 식별자를 사용해 결정적으로 매핑하는 편이 안전하다.

```javascript
import exec from 'k6/execution';

export default function () {
  const index = exec.vu.idInTest - 1;
  const credential = users[index % users.length];
  // 동일 VU는 안정적으로 같은 계정을 선택한다.
}
```

`__VU`와 `__ITER`는 간편하지만 복수 scenario·분산 실행에서 전역 고유성 요구를 표현하기에는 execution context API가 더 명확하다.

## 실패 진단

| 증상 | 우선 가설 | 확인 증거 | 조치 |
| --- | --- | --- | --- |
| VU 증가에 비례해 generator RAM 증가 | 큰 일반 배열이 VM마다 복제 | fixture 제거 전후 RSS, VU별 증가량 | `SharedArray`, fixture 축소·분할 |
| 여러 VU가 같은 계정을 충돌 사용 | 랜덤 선택 또는 식별자 범위 오해 | 계정별 request tag와 서버 log | `idInTest` 기반 결정적 할당 |
| setup은 빠른데 본 실행 시작이 늦음 | 반환 데이터 직렬화·복제 | setup payload 크기, 시작 구간 CPU/RAM | setup에는 작은 token/ID만 반환 |
| 파일을 VU code에서 열려다 실패 | `open()` 위치 오류 | init context 관련 오류 | init에서 `open`, 필요하면 SharedArray factory 내부 |
| teardown이 실행되지 않음 | 강제 중단·프로세스 종료 | 종료 signal·exit 상태 | teardown을 유일한 데이터 무결성 수단으로 두지 않음 |

## 설계 판단

- 정적 읽기 전용 대용량 데이터: `SharedArray`
- 짧은 공통 사전 조건 결과: `setup()` 반환
- VU별 세션 상태: VU module scope 또는 iteration 내부
- 실행 전체 고유 인덱스: `k6/execution`
- 테스트 종료 결과 포맷: `handleSummary()`

## 근거와 한계

- [Test lifecycle](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/): 단계별 실행 규칙과 init 제한.
- [SharedArray](https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/): init-only, 공유·복사 의미와 주의점.
- [Execution context variables](https://grafana.com/docs/k6/latest/using-k6/execution-context-variables/): VU·scenario 식별자.
- [Glossary](https://grafana.com/docs/k6/latest/reference/glossary/): Sobek 엔진과 핵심 용어.
- 메모리 식은 구조를 비교하기 위한 근사이며 실제 heap 크기를 보장하지 않는다.
