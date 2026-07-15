---
title: "현실적인 성능 테스트 설계"
description: "운영 traffic과 SLO에서 workload model, 데이터, 단계와 테스트 유형을 도출한다"
domain: "infra"
topic: "k6"
difficulty: "application"
last_verified: "2026-07-16"
---

# 현실적인 성능 테스트 설계

## 스크립트보다 먼저 workload profile을 만든다

운영 로그에서 endpoint별 RPS만 복사하면 사용자 흐름의 상태, cache hit, 데이터 편향, think time을 잃는다. 반대로 실제 사용자 여정을 그대로 재현하려 하면 테스트가 복잡해져 원인을 통제하기 어렵다. 목적에 맞는 추상화가 필요하다.

### 필요한 입력

- 정상·peak 시간대의 iteration 또는 request arrival rate
- browse/search/write/checkout 같은 비즈니스 흐름 비율
- 흐름별 request fan-out과 데이터 분포
- session 길이, think time, 인증 갱신
- cache hit/miss, hot key, payload 크기 분포
- latency·availability SLO와 허용 error budget

## request mix를 scenario로 변환하기

peak 200 iter/s가 browse 70%, search 25%, checkout 5%라면 첫 근사는 다음과 같다.

```text
browse   140 iter/s
search    50 iter/s
checkout  10 iter/s
```

각 흐름의 duration이 다르면 필요한 VU도 다르다. browse `W=0.3s`면 평균 42 VU, checkout `W=2s`면 평균 20 VU다. 비율이 작다고 용량도 항상 작은 것이 아니다.

복수 scenario로 분리하면 executor, function, tag, start time, threshold를 흐름별로 정의할 수 있다. 다만 모든 endpoint를 scenario로 쪼개면 사용자 session 상관관계를 잃는다. “독립 arrival stream인가, 한 iteration의 연속 행동인가”를 기준으로 경계를 고른다.

## 테스트 유형은 질문이 다르다

| 유형 | 주 질문 | 부하 모양 | 흔한 오용 |
| --- | --- | --- | --- |
| smoke | 스크립트와 환경이 유효한가 | 최소 VU·짧은 시간 | 성능 용량 결론 |
| average-load | 정상 부하에서 SLO를 만족하는가 | 점진 ramp→steady→down | warm-up 없이 전체 집계 |
| stress | SLO를 처음 위반하는 경계는 어디인가 | 단계적 증가 | 대상 보호 없이 무제한 증가 |
| spike | 급격한 도착 증가를 흡수·회복하는가 | 급증→유지→감소 | steady capacity와 혼동 |
| soak | 장시간 누수·열화를 찾는가 | 장시간 정상/상한 | 짧은 run으로 대체 |
| breakpoint | 실패 한계를 탐색하는가 | 통제된 지속 증가 | 공유 환경에서 실행 |

## 단계와 측정 구간

하나의 summary에 ramp-up, warm-up, steady-state, ramp-down을 섞으면 steady 성능을 흐린다. scenario tag나 외부 time series로 구간을 구분하고, acceptance threshold가 어느 구간을 대상으로 하는지 명시한다. k6 core threshold는 시간 구간 필터가 제한적이므로 필요하면 scenario를 나누거나 backend query에서 steady window를 평가한다.

## 데이터 모델이 성능을 바꾼다

- 동일 계정 반복: session/row lock 충돌로 비현실적 병목
- 매번 새 데이터: cache miss만 측정해 실제 분포 왜곡
- 데이터 무한 생성: DB 크기 증가가 run 간 조건을 바꿈
- 존재하지 않는 ID: 빠른 404 path만 측정

데이터는 고유해야 하는 범위, 반복 가능한 seed, 정리 전략, cache 분포를 명세한다. teardown 실패에도 환경을 복구할 수 있도록 run ID와 TTL/별도 cleanup을 둔다.

## 실험 유효성 위협

| 위협 | 결과 왜곡 | 통제 방법 |
| --- | --- | --- |
| generator 포화 | latency 상승·drop을 SUT 탓으로 오판 | generator telemetry, 분산/상향 |
| shared staging noise | run 간 분산 증가 | 변경 동결, 반복 run, baseline |
| cold cache만 포함 | 운영 steady 상태와 불일치 | warm-up 분리, cold/warm 별도 질문 |
| retry 활성화 | 부하 증폭과 원 오류 은폐 | retry count tag, 원 요청과 분리 |
| 로그·trace 과다 | 관측 자체가 병목 | sampling과 비용 baseline |

## 실행 전 안전 계약

성능 테스트는 명시적으로 허가된 환경에서만 수행한다. 최대 rate/VU, 중단 threshold, 연락 담당, 테스트 데이터 범위, 복구 절차를 runbook에 적는다. 공개 데모나 제3자 API는 실습 대상으로 사용하지 않는다.

## 근거와 한계

- [Test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/): 유형별 목적과 실행 패턴.
- [Scenarios](https://grafana.com/docs/k6/latest/using-k6/scenarios/): 복수 workload 구성.
- [Data parameterization](https://grafana.com/docs/k6/latest/examples/data-parameterization/): 입력 데이터 배분 패턴.
- traffic log만으로 사용자의 의도와 미래 peak를 완전히 알 수 없으므로 제품·SRE 요구와 교차 검증해야 한다.
