---
title: "5장. 측정과 통계"
description: "HTTP timing을 분해하고 metric type, percentile, expected response의 표본 의미를 해석한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# 5장. 측정과 통계

성능 결과에서 가장 위험한 문장은 “평균 응답시간이 200ms다”이다. 어떤 operation과 상태가 포함되었고 tail이 어떤지 말하지 않기 때문이다. 이 장에서는 숫자를 보기 전에 표본 집합을 정의한다.

## 1. 한 HTTP 요청의 시간을 해체한다

```text
blocked → DNS → connect → TLS → send → wait(TTFB) → receive
                                └── http_req_duration ──┘
```

`http_req_duration = sending + waiting + receiving`이며 `blocked`, DNS, connect, TLS는 바깥에 있다. 그래서 전체 사용자 체감과 `http_req_duration`은 상황에 따라 다를 수 있다.

- `blocked`만 상승: generator connection slot, file descriptor, connection reuse를 확인한다.
- `waiting` 상승: server/queue/network를 포함한 첫 byte 지연이다. trace로 내부를 나눈다.
- `receiving` 상승: response size와 network throughput을 확인한다.

## 2. metric type이 가능한 문장을 제한한다

Counter는 누적 event, Gauge는 현재/범위, Rate는 true 비율, Trend는 분포다. `checks` Rate의 `rate=0.99`는 초당 0.99회가 아니라 99% 성공이다. `http_reqs` Counter의 rate는 초당 요청 수다.

코드에서 custom metric을 만들 때도 질문과 type이 맞아야 한다.

```javascript
import { Counter, Trend } from 'k6/metrics';

const orders = new Counter('orders_created');
const orderLatency = new Trend('order_business_latency', true);
```

두 번째 인자 `true`를 사용한 시간 Trend는 값 단위가 시간임을 표시한다. 단위가 다른 값을 같은 Trend에 넣지 않는다.

## 3. 평균과 percentile을 함께 읽기

100개 표본 중 95개 100ms, 5개 3s:

```text
avg = 245ms
tail group = 3,000ms
```

평균은 전체 자원 시간의 직관에는 유용하지만 tail 사용자 경험을 숨긴다. p95/p99는 tail을 드러내지만 작은 표본에서는 몇 개 값에 민감하고 원인을 말하지 않는다. 다음 묶음으로 읽는다.

```text
sample count + median + p90/p95/p99 + max + error rate + throughput
```

## 4. 실패의 정의를 코드로 드러낸다

기본 `http_req_failed`는 200–399를 expected response로 본다. 하지만 주문 API가 `200 {"ok": false}`를 반환하면 HTTP 관점 성공, 비즈니스 관점 실패다. 반대로 조회에서 404가 기대 가능한 결과일 수도 있다.

```javascript
check(res, {
  'order accepted': (r) => r.status === 201 && r.json('state') === 'accepted',
});
```

따라서 최소 두 실패 축을 둔다.

- system/transport contract: status, timeout, connection
- business contract: schema, state transition, 값의 invariant

## 5. aggregation이 Simpson's paradox를 만들 수 있다

빠른 browse 요청 99,000개와 느린 checkout 1,000개를 전체로 합치면 전체 p95는 거의 browse만 반영할 수 있다. checkout 사용자에게 중요한 tail이 사라진다. operation tag로 표본을 나누되 사용자 ID 같은 무한 차원은 피한다.

```javascript
'http_req_duration{operation:checkout}': ['p(95)<400']
```

## 6. worked diagnosis

결과: 전체 p95 220ms 통과, checkout p95 920ms 실패, SUT CPU 45%.

1. 전체 수치로 checkout 실패를 덮지 않는다.
2. checkout의 `waiting`, status, check, payload를 분리한다.
3. trace에서 DB pool wait와 downstream span을 비교한다.
4. CPU가 낮다는 사실은 lock/I/O 병목을 배제하지 않는다.
5. 동일 rate에서 checkout data 분포를 통제해 재실험한다.

## 7. 장 연습

- 계산: 10,000요청에서 실패 37개의 error rate와 0.5% budget 대비 여유를 구하라.
- 해석: `waiting`은 올랐지만 `receiving`은 동일하다. 가능한 경로를 세 개 제시하라.
- 설계: login, browse, checkout의 tag와 threshold 표본을 설계하라.
- 진단: HTTP failure는 안정적이고 check failure만 급증할 때 server log에서 찾을 증거는?

## 더 읽기

- [조사 05: HTTP 측정과 통계의 의미](../../../research/infra/k6/05-http-metrics.md)
