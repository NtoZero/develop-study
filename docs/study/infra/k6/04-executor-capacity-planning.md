---
title: "4장. executor 용량 계획"
description: "질문의 제어 변수에 맞는 executor를 고르고 VU headroom과 drop budget을 설계한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# 4장. executor 용량 계획

executor를 고르는 가장 짧은 질문은 “무엇을 약속해야 하는가?”다. 동시 사용자 수를 약속하면 VU executor, 초당 외부 도착을 약속하면 arrival-rate executor가 출발점이다.

## 1. 제어 변수와 결과 변수를 바꾸지 않는다

`constant-vus`에서 VU는 입력이고 throughput은 결과다. `constant-arrival-rate`에서 arrival rate는 입력이고 필요한 VU는 결과다.

| 질문 | 적합한 제어 | 관찰할 결과 |
| --- | --- | --- |
| 200개 세션이 반복할 때 처리량은? | 200 VU | iteration rate, latency |
| 300 iter/s를 유지할 때 SLO는? | arrival 300/s | VU, latency, drop |
| 계정마다 정확히 10회 수행 가능한가? | per-vu iterations | 완료·오류 |
| 총 10만 작업을 제한 시간 안에 처리하는가? | shared iterations | duration·완료 |

## 2. VU 추정은 분포를 포함한 절차다

공식 출발식 `preAllocatedVUs ≈ median W × λ + allowance`를 사용한다.

probe 결과가 다음과 같다고 하자.

```text
target λ = 100 iter/s
W50 = 0.35s
W95 = 0.90s
```

중앙 요구량은 35 VU다. p95가 적용되는 순간의 단순 요구량은 90 VU다. 모든 iteration이 동시에 p95가 되는 것은 아니므로 90도 정확한 peak 공식은 아니다. 60, 75, 90처럼 후보를 작은 run에서 비교하고 다음을 기록한다.

- 목표 시작률 달성 여부
- `dropped_iterations`
- active VU와 max VU 접근
- generator CPU·RAM
- SUT latency 변화

## 3. maxVUs는 모델을 구해 주지 않는다

동적 VU 생성은 자원 비용이 있다. `preAllocatedVUs=10, maxVUs=1000`은 유연한 설정처럼 보이지만 테스트 도중 generator 상태를 크게 바꾼다. max VU 증가는 정상적인 성공 신호가 아니라 예상 duration 분포가 틀렸거나 SUT가 느려진 신호다.

## 4. dropped iteration을 error budget처럼 다룬다

목표가 “외부 100 iter/s를 받는다”라면 drop은 workload 자체를 전달하지 못한 것이다. HTTP 오류율이 0이어도 테스트 입력 계약은 실패할 수 있다.

```javascript
thresholds: {
  dropped_iterations: ['count==0'],
}
```

대규모·긴 테스트에서 transient drop을 허용한다면 왜 허용하는지와 절대 수·비율을 함께 기록한다. 초기부터 drop이면 산정/설정, 중간부터 latency와 함께 drop이면 포화, generator CPU와 함께면 생성기 병목을 우선 본다.

## 5. ramp-down도 표본을 바꾼다

긴 checkout iteration이 진행 중인데 VU를 즉시 줄이면 실행이 잘리고 마지막 request가 기록되지 않을 수 있다. `gracefulRampDown`과 `gracefulStop`은 정상 최대 iteration duration보다 충분해야 한다. 너무 길면 테스트 종료가 늦고, 너무 짧으면 incomplete flow를 만든다.

## 6. 장 연습

- 계산: 목표 240 iter/s, W50 250ms, W95 700ms다. 중앙 요구 VU와 보수적 실험 후보 범위를 제시하라.
- 해석: max VU가 지속적으로 증가하지만 threshold는 통과했다. 다음 run 전 무엇을 바꿔야 하는가?
- 설계: stress test에서 ramping-vus와 ramping-arrival-rate가 각각 답하는 질문을 비교하라.
- 진단: run 시작 5초 안에 drop이 발생한 경우와 8분 뒤 발생한 경우의 우선 가설을 다르게 세워라.

## 더 읽기

- [조사 04: executor와 VU 용량 계획](../../../research/infra/k6/04-executors-and-capacity.md)
