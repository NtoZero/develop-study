---
title: "HTTP 측정과 통계의 의미"
description: "k6 HTTP timing, metric type, expected response와 percentile을 정확히 해석한다"
domain: "infra"
topic: "k6"
difficulty: "advanced"
last_verified: "2026-07-16"
---

# HTTP 측정과 통계의 의미

## 숫자는 측정 정의보다 정확할 수 없다

`p(95)=280ms`라는 출력은 그 자체로 성능 결론이 아니다. 어떤 요청이 표본에 들어갔는지, 실패 응답을 포함했는지, 어느 구간을 합쳤는지, client-side timing의 어느 부분인지 알아야 한다. k6는 sample을 metric에 기록하고 tag로 차원을 붙인다. threshold와 요약은 그 sample 집합에 대한 계산이다.

## HTTP timing 분해

일반적인 요청에서 `http_req_duration`은 `sending + waiting + receiving`이다. DNS·TCP·TLS·connection pool 대기는 별도 timing으로 관측된다.

```text
iteration
└─ request
   ├─ blocked       : 사용 가능한 connection slot 대기 등
   ├─ looking_up    : DNS 조회
   ├─ connecting    : TCP 연결
   ├─ tls_handshaking
   └─ http_req_duration
      ├─ sending
      ├─ waiting    : 요청 전송 완료부터 첫 byte까지(TTFB)
      └─ receiving  : 첫 byte부터 body 수신 완료까지
```

`waiting`은 서버 애플리케이션 함수 시간과 동일하지 않다. 네트워크 왕복, proxy queue, upstream 처리 모두 포함한다. `blocked` 상승은 서버 코드보다 generator connection limit나 keep-alive 재사용 문제를 먼저 의심하게 한다.

## metric type과 가능한 연산

| type | 저장 의미 | 대표 metric | 유효한 판단 |
| --- | --- | --- | --- |
| Counter | 누적 합 | `http_reqs`, `data_received` | count, rate |
| Gauge | 최신·최소·최대 값 | `vus`, `vus_max` | value, min, max |
| Rate | 조건이 참인 비율 | `http_req_failed`, check rate | `rate < ...` |
| Trend | 값의 분포 | `http_req_duration`, custom Trend | avg, med, min, max, percentile |

Rate의 `rate`는 초당 이벤트 수가 아니라 `true / total` 비율이다. 반대로 Counter의 `rate`는 시간당 증가율이다. 같은 단어가 type에 따라 다른 계산을 가리키므로 metric type을 먼저 확인해야 한다.

## 평균이 tail을 숨기는 방식

요청 100개 중 95개가 100ms, 5개가 3s라고 하자.

```text
mean = (95 × 0.1 + 5 × 3.0) / 100 = 0.245s
```

평균 245ms만 보면 대체로 양호해 보이지만 사용자 20명 중 1명꼴로 3초를 경험한다. `p(95)`의 경계 해석은 quantile 구현과 표본 수의 영향을 받지만, 적어도 tail 분포를 직접 드러내는 기준이 필요하다. 실무에서는 p95 하나만 쓰기보다 오류율, p90/p95/p99, 처리량을 함께 보고 너무 적은 표본의 percentile을 신뢰하지 않는다.

## expected response와 실패율

k6의 기본 HTTP expected-response callback은 상태 코드 `200–399`를 정상으로 본다. 이 판정이 `http_req_failed`를 만든다. 따라서 `404`가 비즈니스상 기대된 lookup 결과라도 기본 설정에서는 실패 sample이다. 반대로 `200` body에 오류 코드가 담긴 애플리케이션은 성공으로 보일 수 있다.

```javascript
import http from 'k6/http';

http.setResponseCallback(
  http.expectedStatuses({ min: 200, max: 399 }, 404)
);
```

전역 callback을 바꾸기보다 요청별 check와 operation tag로 시스템 오류와 비즈니스 오류를 분리하는 편이 더 설명력이 좋을 때가 많다. 중요한 것은 “실패”라는 metric이 어떤 계약을 구현하는지 명시하는 것이다.

## check는 관측이고 threshold가 판정이다

```javascript
import { check } from 'k6';
import http from 'k6/http';

const res = http.get('http://target.test/orders/42', {
  tags: { operation: 'get-order' },
});

check(res, {
  'status is 200': (r) => r.status === 200,
  'schema has id': (r) => typeof r.json('id') === 'number',
});
```

check 실패만으로 k6 프로세스가 실패 종료하지는 않는다. check는 성공 비율을 기록한다. CI 품질 게이트로 쓰려면 check metric 또는 다른 metric에 threshold를 정의해야 한다.

## 표본 집합을 설계하라

전체 `http_req_duration`에 login, health check, checkout을 모두 섞으면 어떤 사용자 여정도 대표하지 않는 percentile이 된다. system tag와 custom tag로 operation을 구분하고 threshold도 submetric에 적용한다.

```javascript
thresholds: {
  'http_req_duration{operation:get-order}': ['p(95)<300'],
  'http_req_failed{operation:get-order}': ['rate<0.01'],
}
```

단, tag value가 사용자 ID나 원본 URL처럼 계속 달라지면 time series cardinality가 폭증한다. 분리는 의미 있는 유한 차원으로 제한해야 한다.

## 진단 매트릭스

| 관측 | 해석 후보 | 다음 증거 |
| --- | --- | --- |
| `blocked`↑, server CPU 안정 | generator connection/FD 제한 | 열린 FD, connection reuse, generator CPU |
| `connecting`·TLS↑ | 연결 재사용 저하·network | `Connection` header, handshake count |
| `waiting`↑, SUT CPU↑ | app/queue 병목 가능 | trace span, queue depth, DB pool |
| `receiving`↑ | 큰 payload·network throughput | response bytes, NIC throughput |
| `http_req_failed`↑, check 안정 | expected status 계약 차이 | status 분포, callback 설정 |
| check 실패↑, HTTP 실패 안정 | 2xx 비즈니스 오류 | response body·서버 log |

## 근거와 한계

- [HTTP requests](https://grafana.com/docs/k6/latest/using-k6/http-requests/): timing, expected response, URL tag 주의.
- [Metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/): built-in metric과 type.
- [Checks](https://grafana.com/docs/k6/latest/using-k6/checks/): check가 기록하는 의미.
- client timing은 분산 tracing의 서버 내부 span을 대체하지 않는다.
