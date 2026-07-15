---
title: "k6 심층 조사 지도"
description: "k6 v2.1.0의 제품 철학·라이선스·관리 구조, 실행 의미론, 부하 모델, 측정 통계, 용량 산정과 병목 진단을 연결하는 조사 문서"
domain: "infra"
topic: "k6"
document_type: "research-index"
last_verified: "2026-07-16"
---

# k6 심층 조사 지도

이 조사 묶음은 `k6 사용법`이 아니라 **k6가 어떤 철학과 제품 경계에서 관리되는지, 성능 테스트가 어떤 모델을 세우고 그 모델을 어떻게 실행하며 결과를 어디까지 믿을 수 있는지**를 설명한다. 단순 API 목록 대신 제품 정체성, 실행 의미론, 정량 모델, 구현·버전 경계, 실패 진단을 서로 연결했다.

## 조사 경계

- 기준 버전: Grafana k6 OSS `v2.1.0` (2026-06-30 공개된 최신 정식 릴리스)
- 실행 환경: 로컬 CLI와 공식 Docker 이미지
- 포함: VU/iteration/scenario, 런타임 생명주기, open·closed workload, executor 용량 계획, HTTP timing, 통계·threshold, cardinality, 관측성과 병목 진단, 자동화
- 제외: Grafana Cloud 전용 기능, browser 모듈 심화, Kubernetes 분산 실행, xk6 확장 개발
- 문서 페이지는 2026-07-16의 Grafana 공식 최신 문서를 확인했고, 실제 배포 버전 여부는 GitHub Releases로 교차 검증했다.

## 깊이 커버리지

| 문서 | 정확한 의미 | 내부 실행 | 정량 모델 | 구현·버전 경계 | 실패 진단 | 설계 판단 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 제품·시스템 모델 | 철학·제품군과 VU·iteration·request 분리 | 관리 구조와 scenario→VU→iteration | 처리량·동시성 관계 | AGPL·Cloud·client 측정 경계 | 잘못된 제품·단위 해석 | 도구·테스트 질문 정의 |
| 02 런타임·데이터 | init/setup/VU/teardown | VU별 JS VM, 직렬화 | 메모리 증폭 | Sobek, SharedArray | 데이터 중복·오염 | 공유 방식 선택 |
| 03 부하 모델 | closed/open 의미 | pacing과 backpressure | Little's Law, coordinated omission | arrival-rate 동작 | 허위 안정성 | 모델 선택 |
| 04 executor 용량 | executor별 제어 변수 | VU 할당·iteration drop | `N ≈ λW` | graceful stop | dropped iteration | pre-allocation |
| 05 측정 의미론 | HTTP timings·metric type | sample·tag·submetric | percentile·rate | expected_response | 평균의 함정 | SLI 선택 |
| 06 품질 게이트 | check와 threshold | 평가·종료·요약 | error budget | abort 지연 | cardinality 폭증 | CI 기준 설계 |
| 07 테스트 설계 | workload model | 시나리오·데이터 결합 | traffic mix | 실험 유효성 | 비현실적 테스트 | 단계별 전략 |
| 08 병목 진단 | client/SUT 경계 | time series 상관 | 자원 포화 신호 | OS·generator 제한 | 원인 분기 | 관측성 설계 |
| 09 실습·자동화 | 재현 계약 | 로컬→CI 흐름 | pass/fail 기준 | v2.1.0 이미지 | 의도적 실패 | 회귀 운영 |

## 권장 읽기 순서

1. [k6의 정체성과 성능 테스트 시스템 모델](./01-system-model.md)
2. [런타임 생명주기와 데이터 격리](./02-runtime-and-data.md)
3. [closed/open workload와 정량 모델](./03-workload-models.md)
4. [executor와 VU 용량 계획](./04-executors-and-capacity.md)
5. [HTTP 측정과 통계의 의미](./05-http-metrics.md)
6. [checks·thresholds·cardinality](./06-quality-gates.md)
7. [현실적인 테스트 설계](./07-test-design.md)
8. [관측성과 병목 진단](./08-diagnosis.md)
9. [실습과 자동화 검증](./09-practice-and-automation.md)

```mermaid
flowchart LR
    A["질문과 시스템 경계"] --> B["런타임 의미론"]
    B --> C["부하 모델"]
    C --> D["executor 용량"]
    D --> E["측정 의미론"]
    E --> F["품질 게이트"]
    F --> G["테스트 설계"]
    G --> H["관측성과 진단"]
    H --> I["실습·자동화"]
```

## 1차 출처

- [Grafana k6 공식 문서](https://grafana.com/docs/k6/latest/)
- [k6 v2.1.0 공식 릴리스](https://github.com/grafana/k6/releases/tag/v2.1.0)
- 각 조사 문서 끝에는 그 문서에서 실제 사용한 공식 페이지와 주장 범위를 별도로 기록한다.
