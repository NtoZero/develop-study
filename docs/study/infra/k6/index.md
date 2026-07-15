---
title: "k6로 배우는 성능 테스트 공학"
description: "부하 생성 문법을 넘어 workload modeling, 측정 통계, 용량 계획과 병목 진단을 연결하는 교재"
domain: "infra"
topic: "k6"
document_type: "study-index"
target_reader: "웹 애플리케이션 구조를 이해하고 성능 테스트를 설계·해석하려는 개발자"
last_verified: "2026-07-16"
---

# k6로 배우는 성능 테스트 공학

이 교재의 목표는 k6 옵션을 외우는 것이 아니다. 운영 트래픽을 실행 가능한 workload로 모델링하고, k6가 만드는 표본의 의미를 설명하며, threshold 실패를 서버의 병목 가설로 연결할 수 있어야 한다.

대상 제품은 `AGPL-3.0`의 Grafana k6 OSS CLI `v2.1.0`이다. Grafana Cloud k6와 extension은 제품군 경계를 이해하기 위해 다루지만 Cloud 전용 기능과 개별 extension 구현은 학습 범위에서 제외한다. 철학·라이선스·관리 주체와 선택 조건은 첫 장에서 설명한다.

## 학습 후 할 수 있어야 하는 것

- VU·iteration·request rate를 서로 바꿔 말하지 않는다.
- k6 OSS·Grafana Cloud·extension의 경계와 라이선스·관리 주체를 구분한다.
- 생산 시스템의 feedback 구조에 따라 closed/open model을 선택한다.
- `N = λW`로 arrival-rate workload의 VU 요구량을 추정하고 drop을 진단한다.
- 평균·percentile·오류율의 표본과 분모를 설명한다.
- checks, thresholds, tags를 SLO와 cardinality budget에 맞게 설계한다.
- generator, client outcome, SUT telemetry를 시간축으로 결합해 병목 가설을 검증한다.

## 선수 지식

- HTTP 요청·응답과 상태 코드
- 평균, 비율, percentile의 기초 의미
- JavaScript module과 함수
- CPU, memory, connection pool, queue의 기본 개념

## 표기와 분석 도구

| 기호 | 뜻 | 단위 예시 |
| --- | --- | --- |
| `λ` | iteration 도착률 | iter/s |
| `X` | 완료 처리량 | iter/s 또는 req/s |
| `W` | 평균 체류/iteration 시간 | s |
| `N` | 평균 동시 실행 수 | VU/작업 수 |
| `e` | 실패 비율 | 0~1 |
| `R` | 전체 요청·표본 수 | count |

중심 관계는 `N = λW`다. 단, 안정된 평균 구간에서 성립하는 관계이지 peak VU를 보장하는 공식이 아니다.

## 학습 경로

| 장 | 핵심 질문 | 분석 방법 | 연결 조사·실습 |
| --- | --- | --- | --- |
| [01. 제품 철학에서 실행 가능한 모델까지](./01-performance-test-model.md) | 왜 k6는 tests as code를 택했고 무엇을 견딘다는 말의 정확한 뜻은? | 제품·단위·경계 분해 | research 01, smoke |
| [02. k6 런타임과 데이터 격리](./02-runtime-and-data-isolation.md) | 데이터는 언제, 몇 번, 어디에 존재하는가? | 실행 trace·메모리 모델 | research 02 |
| [03. closed/open과 Little's Law](./03-open-closed-and-littles-law.md) | 느려질 때 입력은 왜 달라지는가? | feedback·수식 | research 03, ramp/arrival |
| [04. executor 용량 계획](./04-executor-capacity-planning.md) | 목표 rate에 VU가 몇 개 필요한가? | 분포·headroom·drop | research 04, arrival |
| [05. 측정과 통계](./05-measurement-and-statistics.md) | p95와 실패율은 어떤 표본을 말하는가? | timing·분포·분모 | research 05 |
| [06. 품질 게이트](./06-thresholds-and-cardinality.md) | SLO를 어떻게 종료 상태로 바꾸는가? | error budget·tag 차원 | research 06, fail |
| [07. 실험 설계와 진단](./07-experiment-design-and-diagnosis.md) | 실패 원인을 어떻게 증명하는가? | 경쟁 가설·상관 관측 | research 07~08 |
| [08. 종합 실습](./08-capstone-lab.md) | 설계부터 CI 판정까지 연결할 수 있는가? | 로컬 실험·보고서 | research 09, practice |

## 권장 방식

각 장의 worked example을 손으로 계산한 뒤 실습 결과와 비교한다. 수치가 다르면 공식을 버리기보다 모델에서 생략한 duration 분산, think time, retry, generator 자원을 찾는다. 이 차이를 설명하는 과정이 학습의 핵심이다.

## 근거 문서

학습 자료는 [`docs/research/infra/k6`](../../../research/infra/k6/index.md)의 9개 공식 출처 기반 조사 문서를 가공했다. 버전과 API 사실은 연구 문서의 1차 출처를 따른다.
