---
title: "8장. 종합 실습: 모델에서 CI 판정까지"
description: "로컬 대상 서버로 closed/open 차이, VU 용량, threshold 실패와 진단 보고서를 재현한다"
domain: "infra"
topic: "k6"
difficulty: "application"
last_verified: "2026-07-16"
---

# 8장. 종합 실습: 모델에서 CI 판정까지

이 실습은 명령 실행이 아니라 네 개의 가설을 검증하는 작은 연구다. 위치는 `practice/infra/k6`이며 외부 서비스 대신 의도적으로 지연·실패를 조절할 수 있는 로컬 서버를 사용한다.

## 실험 0. 환경 계약

기록한다.

- k6 `v2.1.0` 또는 `grafana/k6:2.1.0`
- commit hash, 실행 시각, generator 사양
- target config와 다른 실행 중인 workload
- 각 run의 예상 결과

대상 서버를 먼저 시작한다.

```bash
cd practice/infra/k6
npm run target
```

## 실험 1. smoke는 용량 테스트가 아니다

```bash
npm run k6:smoke
```

확인할 것은 연결, status, body check, metric 생성이다. p99나 최대 처리량 결론을 내리지 않는다. 표본 수와 실행 시간이 왜 부족한지 보고서에 쓴다.

## 실험 2. closed feedback 관찰

```bash
npm run k6:ramp
```

VU가 올라갈 때 iteration completion rate와 `iteration_duration`을 기록한다. target delay를 높인 뒤 같은 VU에서 completion rate가 어떻게 변하는지 예측하고 실행한다.

예측식:

```text
X ≈ N / W
```

실제값과 다르면 iteration의 request 수, sleep, 분산, generator overhead를 찾는다.

## 실험 3. arrival rate와 VU 요구량

```bash
npm run k6:arrival
```

목표 `λ`와 관측 `W`로 `N=λW`를 계산한다. preAllocatedVUs를 의도적으로 낮춘 run과 충분히 둔 run을 비교한다.

기록 표:

| run | λ | W50/W95 | predicted N | pre/max VU | dropped | generator CPU | 결론 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A |  |  |  |  |  |  |  |
| B |  |  |  |  |  |  |  |

## 실험 4. 의도적 threshold failure

```bash
npm run k6:fail
```

이 명령의 비정상 종료는 예상 결과다. 어떤 threshold가 어떤 sample을 근거로 실패했고 process exit가 자동화에 어떻게 전달되는지 설명한다. script syntax나 target connection failure와 구분한다.

## 종합 보고서

1. 질문과 시스템 경계
2. workload model과 선택 이유
3. 수식 기반 사전 예측
4. 관측 결과와 시간 구간
5. threshold 판정
6. generator/client/SUT 경쟁 가설
7. 재실험에서 한 변수
8. 결론의 적용 범위와 한계

## 최종 설계 문제

운영 peak가 browse 100/s, checkout 8/s이고 각각 p95 250ms·700ms라고 하자. 별도 scenario, 초기 VU 후보, operation threshold, cardinality-safe tag, abort 정책을 작성하라. 숫자마다 근거와 불확실성을 붙인다.

해설 방향: 중앙/보수 duration을 구분해 `λW`를 적용하고, flow별 SLO와 error/delivery gate를 나눈다. 실제 pre-allocation은 probe run으로 보정한다.

## 더 읽기

- [조사 09: 실습과 자동화 검증](../../../research/infra/k6/09-practice-and-automation.md)
- [실습 README](../../../../practice/infra/k6/README.md)
