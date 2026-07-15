---
title: "관측성과 병목 진단"
description: "k6 결과와 generator, 애플리케이션, 데이터베이스 telemetry를 시간축으로 결합해 병목 가설을 검증한다"
domain: "infra"
topic: "k6"
difficulty: "advanced-application"
last_verified: "2026-07-16"
---

# 관측성과 병목 진단

## threshold 실패는 진단의 시작이다

`p(95)>300ms`는 계약 위반을 알려 주지만 원인을 말하지 않는다. 신뢰할 수 있는 진단은 **증상 → 경쟁 가설 → 구분 증거 → 재실험** 순서로 진행한다.

## 세 관측면

1. **load generator**: CPU, memory, network, open file, ephemeral port, active/max VU, dropped iteration
2. **client outcome**: arrival/completion rate, HTTP timing, status/check, payload, scenario·operation tag
3. **SUT**: ingress queue, app CPU/GC/thread/event loop, DB pool·query, cache hit, downstream, trace

세 관측면의 clock을 맞추고 동일 run ID를 tag/log/trace에 연결해야 한다. 종료 summary만으로는 증상 발생 시점을 상관 분석할 수 없다.

## generator가 먼저 무너지는 경우

공식 대규모 테스트 가이드는 generator CPU·memory·network를 감시하라고 한다. CPU가 100%에 도달하면 요청 예약과 응답 처리가 늦어져 측정 latency가 커질 수 있다. 높은 VU는 memory를 소모하고, 많은 connection은 open-file limit와 ephemeral port/TIME_WAIT 제약을 만난다.

OS tuning은 마지막 단계다. 먼저 keep-alive, connection reuse, 요청 구조, generator 자원을 확인한다. 제한을 무작정 올리면 더 큰 부하를 만들 수 있어 대상 시스템 보호 한계도 함께 조정해야 한다.

## 증상에서 가설로

| k6 증상 | 경쟁 가설 | 구분 증거 |
| --- | --- | --- |
| `blocked` 상승 | generator connection pool/FD | FD 사용량, `connecting`, SUT queue 안정 |
| `waiting` 상승 + app CPU 100% | compute saturation | profiler, run queue, GC pause |
| `waiting` 상승 + app CPU 낮음 | DB/downstream/lock 대기 | DB pool wait, trace child span |
| 오류율 상승 + latency 급락 | 빠른 reject/circuit breaker | status 분포, rejection metric |
| latency 상승 후 dropped 증가 | SUT 지연 또는 VU 부족 | generator 여유, active VU/max VU |
| throughput plateau + DB pool full | DB concurrency ceiling | pool wait, query latency, connection count |

## knee point 찾기

단계적으로 arrival rate를 올릴 때 초기에는 throughput이 입력과 함께 증가한다. 어느 지점부터 latency가 비선형적으로 증가하고 completion throughput은 평평해지며 queue/error/drop이 늘어난다. 이 굽힘점(knee)이 지속 가능한 용량의 중요한 단서다.

```text
input rate ↑
  before knee: completion rate ≈ input, latency stable
  near knee:   latency/queue variance grows
  after knee:  completion plateaus, errors/drops rise
```

최대 처리량 자체를 운영 목표로 잡으면 작은 변동에도 포화 후 영역으로 넘어간다. SLO를 만족하는 knee 이전에 headroom을 둔 sustainable rate를 운영 용량으로 삼는다.

## 인과 검증을 위한 재실험

DB pool이 병목이라고 의심될 때 pool만 늘리고 끝내면 DB 자체를 과부하시킬 수 있다. 다음처럼 한 변수씩 바꾼다.

1. 동일 script, 데이터 seed, rate profile로 baseline을 저장한다.
2. pool wait, DB active connection, query latency를 확인한다.
3. pool을 제한적으로 변경한다.
4. completion throughput·tail latency·DB CPU/lock이 예측대로 움직이는지 비교한다.
5. 다른 병목으로 이동했는지 확인한다.

가설이 맞다면 관련 지표가 예측 방향으로 함께 변해야 한다. 단순히 다음 run이 좋아진 것만으로는 shared environment noise와 구분하기 어렵다.

## 근거와 한계

- [Automated performance testing](https://grafana.com/docs/k6/latest/testing-guides/automated-performance-testing/): k6와 SUT metric·trace 결합.
- [Running large tests](https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/): generator 자원 모니터링.
- [Fine-tune OS](https://grafana.com/docs/k6/latest/set-up/fine-tune-os/): file descriptor, port 등 OS 제한.
- 상관관계는 인과관계가 아니다. 반복 가능한 통제 실험과 server-side telemetry로 가설을 검증해야 한다.
