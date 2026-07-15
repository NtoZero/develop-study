---
title: "2장. k6 런타임과 데이터 격리"
description: "VU별 JavaScript VM과 생명주기를 따라 데이터의 소유권, 복제, 직렬화 비용을 이해한다"
domain: "infra"
topic: "k6"
difficulty: "detail"
last_verified: "2026-07-16"
---

# 2장. k6 런타임과 데이터 격리

대형 CSV를 import한 script가 10 VU에서는 잘 돌지만 2,000 VU에서 generator memory를 소진했다면 HTTP API 사용법이 아니라 데이터 소유권 모델을 이해해야 한다.

## 1. 한 run을 실행 trace로 읽기

```text
load script
├─ init context: module import, options, open(), SharedArray factory
├─ setup(): once
├─ each VU VM
│  ├─ init context
│  └─ default/scenario function: every iteration
├─ teardown(): once
└─ handleSummary(): once after run
```

init context는 “테스트 전체에서 딱 한 번”이라는 뜻이 아니다. VU별 runtime을 준비하는 과정과 archive 생성 과정 등에서 평가될 수 있으므로 side effect를 두지 않는다. HTTP 요청은 init에서 허용되지 않으며 setup이나 VU code에서 수행한다.

## 2. 독립 VM이 주는 안전과 비용

VU별 VM 덕분에 다음 module variable은 VU별 상태가 된다.

```javascript
let sessionRequests = 0;

export default function () {
  sessionRequests += 1;
}
```

다른 VU와 lock 없이 안전하지만 전역 counter는 아니다. 100 VU가 한 번씩 실행해도 어느 VM에도 `100`이 저장되지 않는다. 전체 합은 custom Counter metric으로 관측해야 한다.

같은 이유로 큰 일반 배열은 VM별로 복제될 수 있다. 데이터 크기 `D`, VU 수 `N`이면 첫 사고 모델은 `O(ND)`다. 실제 엔진 overhead는 달라도 VU 증가에 따른 방향은 맞다.

## 3. SharedArray의 정확한 역할

```javascript
import { SharedArray } from 'k6/data';

const accounts = new SharedArray('accounts', () =>
  JSON.parse(open('./accounts.json'))
);
```

공유되는 것은 읽기 전용 원본 표현이다. `accounts[i]`로 얻은 원소는 VU 쪽으로 복사된다. 따라서 전체 대형 fixture를 VU마다 복제하지 않는 데 유리하지만, 매번 큰 원소를 읽거나 `accounts.map(...)`으로 일반 배열을 만들면 비용이 다시 생긴다.

## 4. setup 반환값의 경계

setup에서 인증 토큰을 얻어 작은 객체로 반환하는 것은 자연스럽다. 500MB fixture를 반환하는 것은 그렇지 않다. setup 결과는 VU code와 teardown으로 전달되기 위해 직렬화된다.

```javascript
export function setup() {
  return { token: authenticate(), runId: crypto.randomUUID() };
}
```

공통 token을 모든 VU가 공유해도 되는지는 시스템 계약의 문제다. 실제 사용자가 각자 token을 가져야 한다면 setup에서 한 개만 만드는 것은 빠르지만 잘못된 workload다.

## 5. 계정 할당을 결정적으로 만들기

```javascript
import exec from 'k6/execution';

export default function () {
  const account = accounts[(exec.vu.idInTest - 1) % accounts.length];
  // account를 사용한 사용자 흐름
}
```

무작위 선택은 hot account 충돌을 만들 수 있다. 결정적 mapping은 재현성이 높지만 계정 수보다 VU가 많으면 modulo 충돌이 생긴다. “고유 계정 필요”가 invariant라면 시작 전에 `accounts.length >= planned max VUs`를 검증해야 한다.

## 6. 실패 사례 해부

증상: VU가 500을 넘으면 RAM이 급격히 늘고 arrival rate가 떨어진다.

1. 가설 A: 각 VM이 20MB JSON 배열을 가진다.
2. 가설 B: SUT가 느려져 max VU가 동적 할당된다.
3. 증거: fixture를 작은 배열로 바꾼 run의 RSS, `vus`, `dropped_iterations`, SUT latency를 비교한다.
4. A가 맞으면 SharedArray/fixture 분할 후 `N`에 따른 RSS 기울기가 줄어야 한다.
5. B가 맞으면 fixture 변경보다 SUT latency와 active VU 곡선이 함께 움직인다.

## 7. 장 연습

- 계산: 12MB 일반 fixture가 300 VU에서 단순 복제될 때 payload만의 상한 근사치를 구하라. 엔진 overhead를 왜 별도로 봐야 하는가?
- 해석: module variable counter가 VU 수만큼 서로 다른 값을 갖는 이유를 설명하라.
- 설계: 2,000개의 고유 계정과 peak 2,500 VU 요구가 충돌한다. 테스트 모델을 바꾸는 세 방법을 비교하라.
- 진단: setup 이후 본 실행 전 20초 pause가 생긴다. 어떤 payload·CPU·memory 증거를 수집할 것인가?

## 더 읽기

- [조사 02: 런타임 생명주기와 데이터 격리](../../../research/infra/k6/02-runtime-and-data.md)
