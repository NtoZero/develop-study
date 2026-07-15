---
title: "실습과 자동화 검증"
description: "로컬 대상 서버에서 smoke, closed ramp, open arrival, threshold failure를 재현하고 CI로 연결한다"
domain: "infra"
topic: "k6"
difficulty: "application"
last_verified: "2026-07-16"
---

# 실습과 자동화 검증

## 실습의 검증 질문

이 저장소의 `practice/infra/k6`는 네 개의 서로 다른 질문을 재현한다.

| script | 검증 질문 | 핵심 관측 |
| --- | --- | --- |
| `01-smoke.js` | 대상·script·check가 유효한가 | status/check |
| `02-ramping-vus.js` | closed workload에서 지연 시 처리량이 어떻게 변하는가 | VU, iteration rate, duration |
| `03-arrival-rate.js` | 고정 arrival rate에 필요한 concurrency와 drop은? | active VU, dropped iteration |
| `04-threshold-failure.js` | 품질 계약 위반이 비정상 종료로 전달되는가 | threshold, process exit |

대상 서버는 의도적으로 `delay`, 일정 주기의 failure, payload를 조절할 수 있어 원인과 결과를 통제한다. 공개 서버에 부하를 보내지 않는다.

## 재현 절차

```bash
cd practice/infra/k6
npm run target
npm run k6:smoke
npm run k6:ramp
npm run k6:arrival
npm run k6:fail
```

로컬 k6가 없어도 공식 `grafana/k6:2.0.0` 이미지를 사용하는 compose profile을 제공한다. 버전을 floating `latest`로 두지 않아 실행 의미가 바뀌는 것을 막는다.

## 실험 기록 계약

각 run은 최소 다음을 남겨야 비교 가능하다.

```text
commit/script hash
k6 version and execution mode
target version/configuration
generator machine/resource state
scenario profile and thresholds
test-data seed
start/end time and run ID
summary + time-series location
SUT telemetry link
```

## CI에서 나눌 것

- PR: 짧은 smoke와 아주 낮은 average-load로 script·회귀 계약 확인
- nightly: 충분한 sample의 steady load와 baseline 비교
- release candidate: 격리 환경에서 stress/spike/soak
- 운영 대상: 별도 승인·보호 장치·중단 조건이 있는 경우에만

PR마다 큰 stress test를 돌리면 비용과 변동성이 크고 shared runner가 generator 병목이 되기 쉽다. 반대로 smoke 결과로 capacity를 보증해서도 안 된다.

## threshold 실패를 정상적인 실습 결과로 다루기

`04-threshold-failure.js`는 실패하도록 설계되었다. 자동화에서는 “명령이 0으로 끝났다”가 아니라 **예상한 threshold 때문에 비정상 종료했고 다른 실행 오류는 아니었다**를 검증해야 한다. 학습자는 summary의 실패 metric, check 결과, process exit를 함께 기록한다.

## 버전 경계

k6 `v2.0.0`은 Go module path가 `/v2`로 바뀌고 과거 기능 일부가 제거된 major release다. 이 실습은 core HTTP·scenario·threshold API에 한정한다. 향후 버전 갱신 시 공식 release note, image digest, script 회귀 실행을 함께 검토한다.

## 근거와 한계

- [Local execution](https://grafana.com/docs/k6/latest/get-started/running-k6/): CLI 실행 방식.
- [Results output](https://grafana.com/docs/k6/latest/get-started/results-output/): summary와 granular output 구분.
- [k6 v2.0.0 release](https://github.com/grafana/k6/releases/tag/v2.0.0): 버전·breaking change 근거.
- 로컬 의도적 지연 서버는 모델 이해에 적합하지만 실제 proxy, DB, autoscaling 특성까지 재현하지는 않는다.
