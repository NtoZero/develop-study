---
title: "closed/open workload와 정량 모델"
description: "응답 지연이 부하 발생량에 미치는 피드백을 Little's Law와 coordinated omission 관점에서 분석한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# closed/open workload와 정량 모델

## 두 모델의 차이는 설정 문법이 아니라 피드백 구조다

**closed model**은 일정 수의 VU가 이전 iteration을 끝낸 뒤 다음 iteration을 시작한다. 시스템 응답이 느려지면 같은 VU가 더 오래 묶이고 새로운 iteration 시작률은 자연스럽게 떨어진다.

**open model**은 시스템 응답시간과 독립적으로 외부 도착률을 예약한다. 느려지면 더 많은 VU가 동시에 필요해지고, 가용 VU가 부족하면 `dropped_iterations`가 생긴다.

```text
closed: response time ↑ → iteration start rate ↓
open:   response time ↑ → required concurrency ↑ → queue/drop risk ↑
```

이 차이는 실제 시스템의 backpressure를 모델에 포함할지 결정한다. 제한된 thread pool처럼 사용자가 완료 후 다시 요청하는 폐쇄형 시스템은 closed model과 닮았다. 외부 이벤트, webhook, 공개 API 트래픽처럼 이전 완료와 무관한 도착은 open model이 더 가깝다.

## Little's Law로 연결하기

안정된 구간에서 평균 동시 작업 수 `N`, 평균 도착률 `λ`, 평균 체류시간 `W`는 다음 관계를 가진다.

```text
N = λW
```

예를 들어 80 iteration/s를 유지하고 평균 iteration duration이 0.5s라면 평균적으로 약 40개의 실행 슬롯이 필요하다.

```text
N ≈ 80 iter/s × 0.5 s = 40 VUs
```

지연이 1.5s로 늘면 같은 도착률을 유지하는 데 평균 120 VU가 필요하다. 이 값은 평균이므로 분산, 초기화, 네트워크 흔들림을 위한 여유가 필요하다.

## coordinated omission

closed model에서 서버가 느려지면 부하 생성기도 요청을 덜 보낸다. 가장 느린 시점에 애초에 도착했어야 할 요청을 만들지 않기 때문에, 실제 외부 도착 시스템보다 안정적으로 보일 수 있다. 이 관측 누락을 coordinated omission이라 부른다.

### worked trace

목표가 10 iter/s이고 정상 iteration duration이 100ms라고 하자.

1. open model은 100ms마다 새 iteration을 예약한다.
2. 서버가 1초 멈추면 그동안 약 10개의 도착 요구가 누적되며 충분한 VU가 있으면 실행된다.
3. 1 VU closed model은 첫 iteration이 1초 동안 막혀 그 사이 새 iteration을 전혀 시작하지 않는다.
4. 결과적으로 closed run은 “느린 요청 1개”를 기록하지만, 실제 외부 도착 관점에서는 대기하거나 실패했을 여러 작업을 표본에서 빼 버린다.

모든 테스트를 open model로 해야 한다는 뜻은 아니다. 실제 사용자도 응답을 기다린 뒤 다음 행동을 하는 흐름이라면 closed model의 feedback이 현실적이다. 핵심은 executor 편의가 아니라 생산 트래픽의 인과 구조를 선택하는 것이다.

## pacing과 think time

closed 사용자 여정을 모델링할 때 `sleep()`은 사용자 think time을 표현한다. iteration duration은 서비스 시간뿐 아니라 think time도 포함하므로 필요한 VU 계산에 포함해야 한다.

```text
iteration duration = service/response time + client work + think time
```

반면 arrival-rate executor는 이미 iteration 시작 간격을 fractional하게 조절한다. 공식 문서는 iteration 끝에 `sleep()`을 넣어 rate를 조절하지 말라고 안내한다. sleep이 비즈니스 행동 자체가 아니라 단순 pacing 용도라면 목표 arrival rate를 왜곡한다.

## 모델 선택 질문

| 질문 | closed가 자연스러운 경우 | open이 자연스러운 경우 |
| --- | --- | --- |
| 다음 작업이 이전 완료를 기다리는가? | 예 | 아니오 |
| 제어하려는 값은? | 동시 세션/VU | 초당 도착 iteration |
| 느려질 때 실제 입력도 줄어드는가? | 사용자 흐름상 줄어듦 | 외부 도착은 유지됨 |
| 포화를 드러내고 싶은가? | 일정 concurrency에서 처리량 관찰 | 목표 arrival rate 유지 능력 관찰 |

## 실패 진단

| 결과 | 가능한 원인 | 추가 확인 |
| --- | --- | --- |
| VU는 일정한데 RPS가 하락 | closed feedback, iteration 지연 | `iteration_duration`, request별 timing |
| arrival rate는 설정했지만 완료율이 낮음 | VU 부족 또는 SUT 지연 | `dropped_iterations`, active VU, generator 자원 |
| 평균 지연은 안정적인데 실제 장애 재현 실패 | coordinated omission | 동일 목표를 arrival-rate executor로 비교 |
| rate가 기대보다 낮음 | iteration에 pacing용 sleep | script trace, sleep 제거 비교 |

## 근거와 한계

- [Open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/): feedback 구조와 모델 의미.
- [Constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/): fractional spacing과 sleep 주의.
- [Arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/): iteration과 VU 관계.
- Little's Law는 장기 평균이 안정된 시스템에 적용되는 관계다. 급격한 ramp, 무한 증가 queue, heavy-tail 분포의 순간 peak 용량을 직접 보장하지 않는다.
