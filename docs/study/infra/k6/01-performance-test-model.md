---
title: "1장. 테스트는 실행 가능한 모델이다"
description: "모호한 성능 요구를 시스템 경계, workload, SLI와 성공 조건으로 변환한다"
domain: "infra"
topic: "k6"
difficulty: "foundation"
last_verified: "2026-07-16"
---

# 1장. 테스트는 실행 가능한 모델이다

“동시 사용자 1,000명을 견뎌야 한다”는 문장은 흔하지만 성능 테스트 명세로는 부족하다. 사용자가 30초마다 한 번 조회한다면 약 33 req/s일 수 있고, 1초마다 네 요청을 병렬로 보낸다면 4,000 req/s일 수 있다. 같은 사용자 수가 전혀 다른 시스템을 요구한다.

## 0. k6는 어떤 관점으로 만들어진 제품인가

k6는 성능 테스트를 별도 전문 도구의 일회성 작업이 아니라 개발 과정의 반복 가능한 코드로 다룬다. 2016년에 시작해 2017년 오픈소스로 공개된 뒤, 2021년 Grafana Labs가 k6 회사를 인수했다. 현재 Grafana Labs가 공개 저장소의 개발을 주도하고 커뮤니티 기여를 받는다. 공식 저장소가 밝힌 핵심 설계 목표는 개발자 경험이며, 그 결과가 JavaScript·TypeScript tests as code, CLI와 CI 자동화, threshold 기반 판정, 확장 가능한 output으로 나타난다.

이 과정에서 말하는 k6는 기본적으로 **AGPL-3.0으로 배포되는 Grafana k6 OSS CLI v2.1.0**이다. Grafana Cloud k6 Free·Pro는 같은 테스트 자산을 활용할 수 있지만 Grafana Labs가 운영하는 managed service이며, 서비스 약관·과금·보존·협업 기능은 OSS 라이선스와 별개의 경계다. extension 역시 각 저장소의 라이선스와 유지보수 상태를 따로 확인해야 한다.

| 선택 관점 | k6가 유리한 조건 | 먼저 확인할 대가·대안 |
| --- | --- | --- |
| 코드 리뷰와 CI에서 성능 계약을 관리 | 테스트를 애플리케이션 코드처럼 버전 관리하는 팀 | GUI authoring을 선호하는 팀의 학습 비용 |
| open·closed workload를 명시적으로 구분 | 운영 트래픽의 도착 구조를 모델링해야 할 때 | 모델이 틀리면 결과도 정교하게 틀림 |
| 로컬에서 시작해 관측·분산 실행으로 확장 | 같은 스크립트로 반복 범위를 넓힐 때 | Cloud는 별도 비용·약관, self-managed는 운영 비용 |

따라서 k6의 특장점은 “빠른 부하 생성” 하나가 아니다. **개발자가 부하 모델과 품질 기준을 코드로 명시하게 만드는 제품 철학**이 이 교재의 전개 방식과 맞닿아 있다.

이 장의 핵심 명제는 다음과 같다.

> 성능 테스트는 트래픽 복제가 아니라, 입력과 결과 사이의 관계를 검증하는 제한된 시스템 모델이다.

## 1. 모델의 일곱 요소

테스트를 다음 튜플로 적어 보자.

```text
E = (B, M, D, F, Data, SLI, C)
```

- `B` boundary: 부하 생성기부터 DB까지 어떤 경계를 포함하는가
- `M` workload model: concurrency를 고정할지 arrival rate를 고정할지
- `D` duration: warm-up, steady, ramp 구간
- `F` flow mix: browse, search, write, checkout 비율
- `Data`: 계정, hot key, cache, payload 분포
- `SLI`: latency, error, throughput, saturation 중 관측값
- `C` criteria: 성공과 실패를 나누는 수치 계약

한 요소라도 비어 있으면 결과 해석에는 숨은 가정이 들어간다. 예를 들어 target server만 관측하고 generator CPU를 빼면 generator 포화를 서버 병목으로 오판할 수 있다.

## 2. 실행 단위를 정확히 분리한다

하나의 k6 run에는 여러 scenario가 있고, scenario는 VU 또는 arrival rate를 제어한다. VU는 함수를 반복 실행하며, 함수 한 번이 iteration이다. iteration 안에는 여러 request가 있다.

```text
test
└─ scenario checkout (10 iter/s)
   └─ VU execution slots
      └─ iteration
         ├─ POST /login
         ├─ GET /cart
         └─ POST /orders
```

여기서 `10 iter/s`는 `10 req/s`가 아니다. 정상 흐름이 세 요청이면 대략 30 req/s이고, 로그인 redirect나 retry가 있으면 더 많다. 반대로 한 request가 세 내부 microservice call을 일으켜도 k6의 `http_reqs`는 client 요청 하나로 기록된다.

## 3. worked example: 요구를 명세로 바꾸기

제품 요구가 다음과 같다고 하자.

> 점심 peak에 5,000명이 주문 서비스를 사용해도 빨라야 한다.

운영 자료를 더해 다음처럼 바꾼다.

```text
boundary: k6 → ingress → order API → DB
peak arrival: 120 checkout iterations/s
flow: cart-read 1회 + order-create 1회 + status-poll 평균 2회
duration: 2m warm-up + 15m steady + 2m ramp-down
data: VU별 계정, 상품은 Zipf-like hot distribution
SLI: order-create latency, system failure, business check, dropped iteration
criteria:
  p95(order-create) < 400ms
  p99(order-create) < 900ms
  system failure < 0.5%
  business check failure < 0.1%
  dropped iterations = 0
```

이제 “빠르다”는 말이 측정 가능한 계약이 되었고, 어떤 데이터와 경계를 사용했는지도 재현할 수 있다.

## 4. client 관측과 원인 설명을 구분한다

k6가 `waiting=600ms`를 기록했다면 첫 byte를 받기까지 client가 600ms를 기다렸다는 뜻이다. DB가 600ms 걸렸다는 뜻은 아니다. ingress queue 100ms, app 80ms, DB 350ms, network와 기타 70ms일 수 있다. 서버 내부 원인은 trace와 자원 metric으로 보충한다.

좋은 보고서는 다음 두 문장을 구분한다.

- 관측: “steady 구간에서 checkout p95가 400ms threshold를 73ms 초과했다.”
- 가설: “동일 시점 DB pool wait 상승과 trace의 query span 증가로 DB concurrency ceiling을 의심한다.”

## 5. 장 연습

### 계산

한 iteration이 평균 5개 request를 보내고 40 iter/s로 도착한다. redirect가 전체 request의 10%에서 한 번 발생한다면 기대 client request rate를 계산하라.

해설 방향: 기본 `200 req/s`에 redirect 기대값 약 `20 req/s`를 더한다. 정확한 값은 redirect 정의와 재귀 여부를 명시해야 한다.

### 해석

`http_req_duration`은 안정적인데 checkout check failure가 증가했다. “성능 문제 없음”이라고 결론 내릴 수 있는가?

해설 방향: 2xx body의 비즈니스 실패는 HTTP latency·expected status만으로 잡히지 않는다.

### 설계

“검색 1,000명” 요구를 일곱 요소 튜플로 바꾸기 위해 제품·운영 팀에 물을 질문을 작성하라.

### 진단

RPS와 latency가 동시에 흔들린다. generator 문제와 SUT 문제를 나누기 위한 최소 telemetry 세 개를 고르라.

## 더 읽기

- [조사 01: k6의 정체성과 성능 테스트 시스템 모델](../../../research/infra/k6/01-system-model.md)
