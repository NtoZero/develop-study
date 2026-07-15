---
title: "3장. closed/open과 Little's Law"
description: "응답시간이 부하 생성률에 주는 피드백을 추적하고 동시성·도착률·체류시간을 정량적으로 연결한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# 3장. closed/open과 Little's Law

성능 테스트에서 가장 중요한 선택 중 하나는 VU 수와 arrival rate 중 무엇을 고정할지다. 둘은 비슷한 부하를 만드는 두 문법이 아니라, 시스템이 느려질 때 서로 다른 세계를 만든다.

## 1. feedback loop를 그린다

closed model에서 VU는 iteration이 끝나야 다음 iteration을 시작한다.

```text
latency ↑ → VU 점유 시간 ↑ → 새 iteration 시작률 ↓ → 입력 압력 완화
```

open model에서 scheduler는 이전 완료와 무관하게 새 iteration을 예약한다.

```text
latency ↑ → 필요한 동시성 ↑ → VU/queue 부족 시 drop·error ↑
```

웹 사용자의 다음 클릭은 앞 응답을 기다리므로 closed 특성이 있다. 메시지 broker로 유입되는 주문은 소비자의 완료와 무관하므로 open 특성이 있다. 실제 시스템은 두 구조가 섞일 수 있어 scenario별로 나눈다.

## 2. Little's Law를 도출 도구로 쓴다

안정 구간에서 단위 시간당 평균 `λ`개가 들어오고 각 작업이 평균 `W`시간 머문다면, 관측 시점에 평균 `λW`개가 시스템 안에 있다.

```text
N = λW
```

차원도 확인할 수 있다.

```text
(iterations / second) × second = iterations in progress
```

### worked example A

목표 60 iter/s, 평균 iteration duration 0.25s:

```text
N = 60 × 0.25 = 15
```

평균적으로 15 VU가 바쁘다. 하지만 duration p95가 0.9s라면 burst 순간에는 더 많은 슬롯이 필요하다. 15를 그대로 `preAllocatedVUs`로 쓰면 분산을 무시한 것이다.

### worked example B: 지연 악화

같은 60 iter/s에서 평균 duration이 1.5s로 상승하면 `N=90`이다. open executor는 약 90개 이상의 실행 슬롯을 요구한다. closed executor를 15 VU로 고정했다면 완료율의 근사는 `X≈N/W=10 iter/s`로 떨어진다.

같은 서버 열화가 open에서는 concurrency 폭증으로, closed에서는 throughput 하락으로 나타난다.

## 3. coordinated omission을 시간선으로 본다

목표 도착 간격이 100ms인데 서버가 1초 멈췄다고 하자.

```text
planned arrivals: 0 .1 .2 .3 .4 .5 .6 .7 .8 .9 1.0
open samples:     요청들이 예약됨 → 대기/실행/drop으로 압력 노출
1-VU closed:      첫 요청 -------------------- 완료 → 다음 요청
```

closed 측정은 멈춘 동안 도착했어야 할 표본을 만들지 않는다. 운영 입력이 외부 arrival라면 이 누락이 tail 위험을 과소평가한다. 운영 사용자도 실제로 기다리는 흐름이라면 누락이 아니라 시스템의 정상 feedback이다.

## 4. think time은 모델의 일부다

closed 사용자 여정에서 `sleep(2)`는 사용자 생각 시간을 나타낼 수 있다. 이때 `W`에는 서버 응답뿐 아니라 2초가 포함된다. 100명의 사용자가 평균 2.5초 iteration을 반복하면 대략 40 iter/s다.

arrival-rate executor에서 rate 조절용으로 sleep을 추가하면 scheduler의 pacing과 script pacing을 이중 적용한다. 비즈니스 행동에 필요한 think time이 아니라면 제거한다.

## 5. 장 연습

- 계산: 150 iter/s, 평균 duration 320ms에서 평균 concurrency를 구하라. duration이 800ms가 되면 얼마나 변하는가?
- 해석: constant-vus run에서 latency가 오르면서 RPS가 내려갔다. 서버가 부하를 “잘 견딘 것”처럼 보일 수 있는 이유를 설명하라.
- 설계: browse와 webhook을 각각 어떤 model로 만들지, feedback 구조를 근거로 정하라.
- 진단: arrival run에 drop이 생겼다. VU 부족과 generator 포화를 구분하는 증거를 나열하라.

## 더 읽기

- [조사 03: closed/open workload와 정량 모델](../../../research/infra/k6/03-workload-models.md)
