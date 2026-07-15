---
title: "checks·thresholds·cardinality"
description: "관측을 실행 가능한 품질 게이트로 바꾸고 표본 수, 중단 시점, tag cardinality 위험을 통제한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# checks·thresholds·cardinality

## threshold는 SLO를 실행 코드로 옮긴 것이다

threshold는 metric에 대한 pass/fail 표현식이다. 하나라도 실패하면 k6는 전체 run을 실패 상태로 종료할 수 있어 자동화 게이트가 된다.

```javascript
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    checks: ['rate>0.995'],
    dropped_iterations: ['count<1'],
  },
};
```

이 설정은 네 개의 서로 다른 계약을 표현한다: transport/system failure, tail latency, 비즈니스 assertion, workload delivery 능력이다. 한 metric으로 모두 대체할 수 없다.

## 통계적 분모를 확인하라

오류율 1% threshold에서 요청이 20개뿐이라면 오류 1개가 곧 5%다. 반대로 0개 오류도 진짜 오류율이 0이라고 증명하지 않는다. 짧은 smoke test는 script·연결 검증에는 좋지만 좁은 error budget이나 p99를 판정하기에는 표본 수가 부족하다.

경험적 최소 표본을 무조건 정하기보다 다음을 기록해야 한다.

- threshold가 적용된 sample count
- warm-up과 steady-state 구간 분리 여부
- retry와 중복 요청 포함 여부
- 표본이 독립적이지 않을 수 있는 session·cache 효과

### error budget으로 바꾸기

목표 오류율 `e`, 총 요청 수 `R`라면 허용 실패 수의 직관적 상한은 `eR`이다.

```text
R = 50,000 requests, e = 0.1% = 0.001
allowed failures ≈ 50
```

threshold는 비율을 판정하지만 운영자는 이 절대 실패 수가 사용자 영향과 맞는지도 검토해야 한다.

## 조기 중단의 trade-off

threshold 객체는 `abortOnFail`과 `delayAbortEval`을 지원한다.

```javascript
thresholds: {
  http_req_failed: [{
    threshold: 'rate<0.03',
    abortOnFail: true,
    delayAbortEval: '30s',
  }],
}
```

- 너무 빨리 평가하면 초기 connection·cache warm-up 때문에 false abort가 난다.
- 너무 늦게 평가하면 이미 명백히 실패한 테스트가 자원을 낭비하거나 대상에 위험한 부하를 계속 준다.
- Grafana Cloud에서는 일부 threshold 평가가 최대 약 60초 간격일 수 있어 즉시 중단을 보장하지 않는다.

따라서 warm-up 길이, 최소 sample, 시스템 보호 목적을 근거로 delay를 정한다.

## tag submetric과 cardinality

tag 조합마다 별도 time series가 만들어질 수 있다. `operation=checkout`, `status=200`, `scenario=browse`처럼 제한된 값은 분석에 유용하다. `user_id=923847`, 원본 `/orders/923847`처럼 사실상 무한한 값은 저장소와 출력 시스템을 압박한다.

```text
rough series count ≈ metrics × combinations(tag values)
```

metric 20개, operation 10개, status 6개, raw URL 100,000개를 순진하게 곱하면 조합 상한은 거대해진다. 모든 조합이 실제 생성되지는 않지만 cardinality 위험을 판단하기에는 충분한 경고 모델이다.

```javascript
http.get(`http://target.test/orders/${orderId}`, {
  tags: { name: 'GET /orders/:id', operation: 'get-order' },
});
```

동적 URL 자체 대신 안정적인 `name` tag를 사용한다. 사용자별 디버깅이 필요하면 모든 요청에 ID tag를 붙이기보다 제한된 sample의 log나 trace correlation을 사용한다.

## summary와 time series의 차이

종료 summary는 전체 run을 압축한 집계다. “언제” 지연이 발생했는지, ramp 어느 구간인지 알 수 없다. threshold 판정은 자동화에 유용하지만 원인 분석에는 외부 time-series output과 SUT telemetry가 필요하다. `handleSummary()`는 출력 형식을 바꾸지만 이미 소실된 시간축을 되살리지는 못한다.

## 품질 게이트 설계 순서

1. 사용자 또는 서비스 계약에서 SLI를 고른다.
2. operation별 안정적인 tag 집합을 정한다.
3. 충분한 sample을 만드는 duration과 rate를 정한다.
4. latency·error·delivery threshold를 분리한다.
5. warm-up과 abort 정책을 명시한다.
6. 실패 시 남길 time series·server telemetry를 연결한다.

## 근거와 한계

- [Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/): 표현식, tag submetric, abort 옵션, 종료 상태.
- [Tags and groups](https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/): system/custom tag와 그룹.
- [End-of-test summary](https://grafana.com/docs/k6/latest/results-output/end-of-test/): summary와 `handleSummary()`.
- cardinality 식은 위험 규모를 설명하는 상한 모델이며 실제 backend의 series 생성 규칙과 retention 비용은 출력 대상에 따라 다르다.
