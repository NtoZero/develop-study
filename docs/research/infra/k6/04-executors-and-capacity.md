---
title: "executor와 VU 용량 계획"
description: "제어 변수에 맞는 executor를 고르고 arrival-rate 실행에 필요한 VU를 추정하며 dropped iteration을 해석한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# executor와 VU 용량 계획

## executor는 무엇을 고정하는가

| executor 계열 | 고정·예약하는 것 | 대표 용도 |
| --- | --- | --- |
| `shared-iterations` | 여러 VU가 나눠 완료할 총 iteration 수 | 고정 작업량 처리 |
| `per-vu-iterations` | VU마다 완료할 iteration 수 | 계정별 동일 반복 |
| `constant-vus` | 일정 VU 수와 시간 | steady closed workload |
| `ramping-vus` | 시간에 따른 VU 수 | closed ramp/soak |
| `constant-arrival-rate` | 일정 iteration 시작률 | 고정 외부 도착률 |
| `ramping-arrival-rate` | 시간에 따른 시작률 | open ramp/capacity 탐색 |

VU executor의 처리량은 iteration duration의 영향을 받는다. arrival-rate executor의 VU 수는 목표가 아니라 그 rate를 구현하기 위한 자원이다.

## preAllocatedVUs 추정

공식 가이드가 제시하는 출발점은 다음이다.

```text
preAllocatedVUs = median_iteration_duration × rate + variance allowance
```

단위를 맞춰야 한다. 목표 `rate = 120 iter/s`, median iteration duration `W50 = 0.4s`라면 최소 중심값은 `48 VU`다. 그러나 p95가 1.2s이고 burst와 GC가 있다면 48은 쉽게 부족해진다.

실무에서는 다음 순서로 보정한다.

1. 작은 probe run에서 iteration duration 분포를 얻는다.
2. `λ × W`로 중앙 동시성을 구한다.
3. p90/p95 지연, 예상 jitter, 초기 연결 비용을 반영해 headroom을 둔다.
4. 목표 구간에서 `dropped_iterations = 0` 또는 명시된 budget 이하인지 검증한다.
5. generator CPU·RAM이 여유 있는지 함께 확인한다.

정확한 VU 수를 공식 하나로 결정할 수는 없다. arrival process와 duration 분포가 변하고 VU 초기화도 비용을 갖기 때문이다.

## maxVUs가 안전망이 아닌 이유

`maxVUs`를 크게 두면 런타임에 VU를 동적으로 할당할 수 있지만, 공식 문서는 충분한 `preAllocatedVUs`를 먼저 확보하고 `maxVUs` 의존을 피하라고 권한다. 테스트 도중 VU 생성은 generator CPU·memory를 추가로 소비해 측정 자체를 흔들 수 있다. 즉, 부하 대상의 지연으로 VU가 늘고, 그 VU 생성 때문에 generator가 느려져 지연이 더 커지는 교란이 생길 수 있다.

## dropped_iterations의 두 의미

`dropped_iterations`는 예정되었지만 시작하지 못한 iteration이다.

- iteration-based executor: `maxDuration` 안에 할당된 작업을 시작하지 못함
- arrival-rate executor: 예정 시점에 사용할 자유 VU가 없음

초기부터 drop이 지속되면 대개 pre-allocation 또는 script 자체가 목표 rate에 맞지 않는다. 정상으로 시작했다가 SUT 지연 상승과 함께 drop이 생기면 시스템 열화로 필요한 concurrency가 커졌을 수 있다. 그러나 generator CPU 100%도 같은 현상을 만들 수 있으므로 단일 지표로 원인을 확정하면 안 된다.

### 진단 순서

```text
dropped_iterations 증가
  ├─ run 시작부터? → VU 산정·iteration duration·설정 점검
  └─ 부하 중간부터?
       ├─ generator CPU/RAM/network 포화 → 부하 생성기 병목
       └─ generator 여유 + SUT latency/resource 상승 → SUT 포화 가능성
```

## gracefulRampDown과 중단된 iteration

ramping-vus에서 VU를 줄일 때 실행 중 iteration을 즉시 끊으면 응답 표본과 비즈니스 흐름이 잘린다. `gracefulRampDown`은 VU가 iteration을 마칠 시간을 준다. 값이 최대 정상 iteration duration보다 짧으면 여전히 중단될 수 있다. 긴 transaction을 시험한다면 단계 길이와 graceful window를 함께 설계해야 한다.

## worked configuration

```javascript
export const options = {
  scenarios: {
    checkout: {
      executor: 'constant-arrival-rate',
      rate: 120,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 90,
      maxVUs: 120,
      gracefulStop: '30s',
      tags: { flow: 'checkout' },
    },
  },
};
```

`90`은 요구사항에서 바로 나온 숫자가 아니다. probe run의 duration 분포와 headroom을 근거로 기록해야 한다. 본 실행에서 max VU 근처까지 계속 올라간다면 “테스트가 성공했다”가 아니라 다음 run의 사전 할당과 SUT 상태를 재검토할 신호다.

## 근거와 한계

- [Executors](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/): executor별 제어 변수.
- [Arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/): VU 추정식, 동적 할당 비용.
- [Dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/): executor별 drop 의미와 원인.
- [Graceful stop](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/): 실행 중 iteration 종료 규칙.
- 예시 VU 수는 설명용이며 실제 시스템의 duration 분포로 재산정해야 한다.
