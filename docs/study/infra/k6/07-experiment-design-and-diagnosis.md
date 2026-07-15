---
title: "7장. 실험 설계와 병목 진단"
description: "운영 traffic을 workload로 가공하고 generator·client·SUT 증거로 경쟁 가설을 검증한다"
domain: "infra"
topic: "k6"
difficulty: "advanced-application"
last_verified: "2026-07-16"
---

# 7장. 실험 설계와 병목 진단

성능 테스트는 재현 가능한 과학 실험에 가깝다. 한 run에서 설정, 배포, 데이터, shared 환경 noise를 모두 바꾸면 좋아진 이유도 나빠진 이유도 설명할 수 없다.

## 1. 운영 자료를 workload로 축약한다

peak 200 iter/s의 flow가 browse 70%, search 25%, checkout 5%라면 첫 arrival 목표는 140/50/10이다. 그러나 checkout duration이 2초, browse가 300ms면 평균 동시성은 각각 20과 42다. 작은 traffic 비율이 무시 가능한 자원 비율은 아니다.

흐름 경계는 다음으로 정한다.

- 서로 독립적으로 도착하면 별도 scenario
- 같은 session의 인과적 연속이면 한 iteration
- 서로 다른 SLO·data·executor가 필요하면 분리
- 지나친 endpoint 분해로 실제 상태 흐름을 잃지 않기

## 2. 구간마다 다른 질문을 둔다

```text
warm-up → steady state → stress steps → recovery
```

- warm-up: connection, cache, JIT/초기화 효과
- steady: 정상 SLO와 분포
- stress: knee와 saturation
- recovery: queue가 빠지고 SLO가 복구되는 시간

전체 summary 하나로 합치지 말고 time series에서 구간을 나눈다.

## 3. 세 관측면으로 경쟁 가설을 만든다

```text
generator telemetry + k6 client outcome + SUT telemetry
```

증상: arrival rate 300/s 단계에서 p95 증가 후 drop 발생.

- 가설 A: SUT DB pool 포화
- 가설 B: generator CPU 포화
- 가설 C: preAllocatedVUs 부족

구분 증거:

| 증거 | A | B | C |
| --- | --- | --- | --- |
| DB pool wait·query span 증가 | 강함 | 약함 | 약함 |
| generator CPU 100%, blocked 증가 | 약함 | 강함 | 중간 |
| 시작부터 drop, SUT 안정 | 약함 | 가능 | 강함 |
| latency 상승 후 active VU=max | 가능 | 가능 | 강함 |

하나의 관측으로 확정하지 않고, 가설마다 달라야 하는 예측을 찾는다.

## 4. knee 이전을 운영 용량으로 잡는다

입력 rate를 높일 때 completion throughput이 따라오다가 어느 시점부터 평평해지고 tail latency·queue·error가 비선형적으로 커진다. 이 knee는 최대 처리량보다 중요하다. 운영 목표는 knee 바로 위가 아니라 SLO를 만족하며 변동 headroom이 남는 아래 구간이다.

## 5. 수정 후에는 인과 예측을 검증한다

DB pool을 늘렸다면 기대 변화는 pool wait 감소다. 동시에 DB CPU나 lock wait가 증가할 수 있다. 단지 p95가 좋아졌다는 이유만으로 원인이 증명되지 않는다. 동일 workload·seed·환경에서 반복하고 관련 지표가 예측대로 함께 움직이는지 확인한다.

## 6. 장 연습

- 계산: browse 300/s·W=0.2s, checkout 20/s·W=1.8s의 평균 VU 요구량을 각각 구하라.
- 해석: 오류율이 상승하면서 latency가 오히려 낮아졌다. fast reject/circuit breaker 가설을 설명하라.
- 설계: average-load, spike, soak가 각각 필요로 하는 구간과 관측값을 작성하라.
- 진단: app CPU는 낮고 waiting과 DB pool wait가 오른 run의 경쟁 가설과 재실험을 설계하라.

## 더 읽기

- [조사 07: 현실적인 테스트 설계](../../../research/infra/k6/07-test-design.md)
- [조사 08: 관측성과 병목 진단](../../../research/infra/k6/08-diagnosis.md)
