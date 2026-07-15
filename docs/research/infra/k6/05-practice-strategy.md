---
title: "k6 테스트 전략과 안전한 실습 설계"
description: "smoke부터 평균 부하와 도착률 실험까지 로컬에서 반복 가능한 실습 순서"
domain: "infra"
topic: "k6"
order: 5
level: "application"
subtopic: "practice-strategy"
prerequisites:
  - "02-test-lifecycle.md"
  - "03-scenarios-and-executors.md"
  - "04-metrics-checks-thresholds.md"
tags:
  - "practice"
  - "test-strategy"
last_verified: "2026-07-16"
---

# k6 테스트 전략과 안전한 실습 설계

> 성능 테스트는 큰 부하부터 시작하지 않는다. 로컬 대상에서 스크립트가 맞는지 smoke test로 확인하고, 평균 부하와 open-model 실험으로 모델 차이를 관찰한 뒤 threshold를 자동화 계약으로 사용한다.

## 조사 질문

- k6 개념을 실제로 검증하면서 대상 시스템과 실행 환경을 안전하게 보호하는 실습 순서는 무엇인가?

## 범위

- 포함: 설치와 Docker 실행, smoke·average load·stress 계열의 목적, 로컬 실습 단계
- 제외: 운영 환경 부하 승인 절차, 대규모 분산 generator 산정

## 핵심 개념

공식 문서는 macOS Homebrew, 패키지, standalone binary와 Docker 이미지를 설치 경로로 제공한다. 이 저장소는 로컬에 k6가 없어도 `grafana/k6:2.0.0` 컨테이너로 같은 스크립트를 실행할 수 있게 구성한다. [Install k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)

| 테스트 유형 | 핵심 질문 | 부하 형태 |
| --- | --- | --- |
| Smoke | 스크립트와 시스템이 최소 부하에서 정상인가? | 매우 적은 iteration/VU |
| Average load | 예상되는 평상시 부하 목표를 만족하는가? | 점진 상승 후 유지 |
| Stress | 평상시보다 높은 부하에서 어떻게 저하되는가? | 평균 이상으로 단계 상승 |
| Spike | 급격한 유입에 어떻게 반응하고 회복하는가? | 짧고 큰 급상승 |
| Soak | 장시간 유지 시 누수와 누적 저하가 있는가? | 중간 부하 장시간 유지 |
| Breakpoint | 어느 지점에서 목표를 위반하는가? | 실패 기준까지 점진 상승 |

Grafana의 시작 예제도 작은 smoke test 후 average-load scenario, threshold 위반 지점을 찾는 breakpoint 흐름으로 확장한다. [Test for performance](https://grafana.com/docs/k6/latest/examples/get-started-with-k6/test-for-performance/)

## 실습 구조

```text
practice/infra/k6/
├── README.md
├── compose.yaml
├── target/server.mjs
└── scenarios/
    ├── 01-smoke.js
    ├── 02-ramping-vus.js
    ├── 03-arrival-rate.js
    └── 04-threshold-failure.js
```

공개 데모 서버가 아니라 로컬 대상 서버를 사용한다. `/slow?ms=`와 `/unstable?rate=`를 조작해 latency와 오류율을 의도적으로 바꾸고, 같은 변화가 closed/open model과 threshold에 어떻게 나타나는지 비교한다.

## 단계별 실습

1. 대상 서버를 시작하고 `/health` 응답을 확인한다.
2. smoke test를 실행해 스크립트, 환경 변수와 check가 맞는지 확인한다.
3. `ramping-vus`로 닫힌 모델에서 지연 증가가 iteration 처리량에 미치는 영향을 관찰한다.
4. `constant-arrival-rate`로 같은 지연에서도 시작률을 유지할 때 VU 수와 `dropped_iterations`가 어떻게 달라지는지 관찰한다.
5. 엄격한 threshold를 일부러 실패시켜 check 결과와 프로세스 성공·실패의 차이를 확인한다.
6. 목표 사용자 행동과 서비스 목표를 기준으로 자신만의 scenario와 threshold를 작성한다.

## 인터랙티브 시각화 설계

| 요소 | 설계 |
| --- | --- |
| 핵심 상태 | 테스트 유형, executor, 시간, 목표 부하, 지연·오류율, threshold 상태 |
| 사용자 조작 | VU/rate, duration, latency, error rate, p95 threshold |
| 상태 전이 | 시간축 load profile과 예측 metric을 결정론적으로 계산 |
| 관찰 피드백 | 예상 k6 설정 코드, active VU, throughput, p95, PASS/FAIL |
| 접근성 | 모든 slider에 수치 입력과 결과 표를 제공하고 자동 재생을 끌 수 있게 함 |

## 예제 실행

```bash
# 터미널 1: 로컬 대상 서버
node practice/infra/k6/target/server.mjs

# 터미널 2: 로컬 k6 CLI가 있는 경우
BASE_URL=http://localhost:3001 k6 run practice/infra/k6/scenarios/01-smoke.js

# Docker를 사용하는 경우
docker compose -f practice/infra/k6/compose.yaml run --rm k6 run /scripts/01-smoke.js
```

Docker 안에서 호스트의 대상 서버에 접근할 때 macOS/Windows에서는 `host.docker.internal`을 사용한다. compose 설정은 이 값을 기본 `BASE_URL`로 제공한다.

## v2.0.0 적용 범위

이 실습은 k6 `v2.0.0`을 기준으로 한다. v2에서 제거된 `k6 pause`, `k6 resume`, `k6 scale`, `k6 status`, `externally-controlled` executor는 사용하지 않는다. [k6 v2.0.0 release notes](https://github.com/grafana/k6/releases/tag/v2.0.0)

## 트레이드오프와 경계 조건

- 로컬 단일 노트북 결과는 운영 환경의 절대 성능을 대표하지 않는다. 실습 목적은 모델과 metric 관계를 배우는 것이다.
- load generator의 CPU·네트워크 한계도 결과를 왜곡할 수 있으므로 높은 부하에서는 generator 자원을 함께 관찰해야 한다.
- 실제 운영 부하는 소유자 승인, 비용·장애 안전장치와 중단 조건을 갖춘 별도 계획으로 실행해야 한다.

## 흔한 오해

### smoke test가 통과했으니 성능 목표도 충족한다

smoke test는 스크립트와 최소 기능의 sanity check다. 예상 부하, 장시간 부하, 급증과 한계점에 대한 결론은 각 목적에 맞는 별도 테스트가 필요하다.

## 이해도 점검

1. 큰 stress test 전에 smoke test가 필요한 이유는 무엇인가?
2. 로컬 대상의 응답 지연을 늘렸을 때 ramping-vus와 arrival-rate 결과에서 각각 무엇을 볼 것인가?
3. 실제 서비스에 부하 테스트를 실행하기 전에 어떤 승인과 중단 기준이 필요한가?

## 참고 자료

- [Install k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) — Grafana Labs, latest/v2 계열, 2026-07-15 확인
- [Test for performance](https://grafana.com/docs/k6/latest/examples/get-started-with-k6/test-for-performance/) — Grafana Labs, latest/v2 계열, 2026-07-15 확인
- [Automated performance testing](https://grafana.com/docs/k6/latest/testing-guides/automated-performance-testing/) — Grafana Labs, latest/v2 계열, 2026-07-15 확인
- [k6 v2.0.0 release](https://github.com/grafana/k6/releases/tag/v2.0.0) — Grafana Labs, v2.0.0, 2026-07-15 확인
