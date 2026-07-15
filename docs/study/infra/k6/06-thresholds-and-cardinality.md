---
title: "6장. 품질 게이트와 cardinality"
description: "SLO를 threshold로 구현하고 표본 수, 조기 중단, time-series cardinality를 함께 설계한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# 6장. 품질 게이트와 cardinality

check가 “무슨 일이 일어났는가”를 관측한다면 threshold는 “이 run을 받아들일 것인가”를 판정한다. 품질 게이트는 latency 하나가 아니라 delivery, system, business 네 축을 함께 본다.

## 1. 계약을 metric 식으로 번역한다

```javascript
export const options = {
  thresholds: {
    'http_req_duration{operation:checkout}': [
      'p(95)<400',
      'p(99)<900',
    ],
    'http_req_failed{operation:checkout}': ['rate<0.005'],
    checks: ['rate>0.999'],
    dropped_iterations: ['count==0'],
  },
};
```

- latency: 정상/전체 표본 중 무엇인지 명시
- system error: expected response 계약
- business error: check 계약
- delivery: 약속한 workload를 시작했는지

## 2. 작은 표본의 p99를 경계한다

100개 표본의 p99는 사실상 가장 느린 몇 개 값에 달려 있다. 짧은 PR smoke에서 p99를 엄격한 회귀 판정으로 쓰면 환경 noise에 흔들린다. smoke는 연결·기능·명백한 threshold 오류, nightly steady run은 충분한 표본의 tail과 error budget처럼 목적을 나눈다.

오류 budget도 절대 수로 다시 본다.

```text
allowed failures ≈ R × e
50,000 × 0.001 = 50
```

50건이 실제 비즈니스 영향상 허용 가능한지도 별도 판단한다.

## 3. abort는 안전장치이면서 표본 절단이다

`abortOnFail`은 명백한 실패 부하를 멈추는 데 유용하지만 run을 조기에 잘라 이후 회복 데이터를 얻지 못한다. `delayAbortEval`은 warm-up noise를 피하지만 그동안 위험 부하가 계속될 수 있다.

결정 기준:

- 대상 보호가 목적이면 빠른 error/drop abort
- capacity curve가 목적이면 단계별 threshold와 안전 상한
- warm-up이 알려져 있으면 최소 평가 지연
- 회복 관측이 필요하면 즉시 abort 대신 별도 보호 조건

## 4. cardinality budget을 먼저 정한다

tag는 분석 차원이고 모든 값 조합은 잠재 time series다.

```text
metrics × operation × scenario × status × dynamic-id
```

마지막에 user/order ID가 들어가면 거의 무한히 커진다. URL은 `/orders/9182` 대신 안정된 `name=GET /orders/:id`로 그룹화한다. 요청 하나를 찾는 correlation ID는 metric tag가 아니라 sampled log/trace에 둔다.

### 판단 표

| tag | cardinality | metric 차원 적합성 |
| --- | --- | --- |
| `operation=checkout` | 낮음·고정 | 좋음 |
| `scenario=peak` | 낮음·고정 | 좋음 |
| `status=201` | 제한적 | 대체로 좋음 |
| `region=kr` | 제한적 | 목적이 있으면 좋음 |
| `user_id=...` | 매우 높음 | 피함 |
| raw URL with ID | 매우 높음 | stable name으로 대체 |

## 5. summary와 원인 분석을 분리한다

종료 summary와 threshold는 빠른 판정에 좋다. 하지만 8분째 30초 동안만 생긴 latency spike를 전체 p95가 희석할 수 있다. 외부 output의 time series와 SUT dashboard에서 동일 시간·run ID로 본다. `handleSummary`로 예쁜 리포트를 만들어도 시간축 정보가 새로 생기지는 않는다.

## 6. 장 연습

- 계산: operation 12, status 6, region 4, raw order ID 50만일 때 단순 조합 상한을 계산하고 어느 차원을 제거할지 정하라.
- 해석: threshold는 통과했지만 30초 장애가 있었다. 전체 집계가 놓칠 수 있는 이유는?
- 설계: PR/nightly/release 성능 게이트를 표본 수와 비용 관점에서 나눠라.
- 진단: `abortOnFail`이 시작 3초에 발동했다. 설정 오류와 실제 장애를 구분할 증거는?

## 더 읽기

- [조사 06: checks·thresholds·cardinality](../../../research/infra/k6/06-quality-gates.md)
