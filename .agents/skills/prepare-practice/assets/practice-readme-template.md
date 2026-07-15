# {{TOPIC_TITLE}} 실행 실습

> 대응 학습 자료: [`docs/study/{{DOMAIN}}/{{TOPIC}}/`](../../../docs/study/{{DOMAIN}}/{{TOPIC}}/index.md)

## 실습 목표

- {{실행으로 검증할 개념}}
- {{입력 변화에 따라 예측할 결과}}

## 준비

| 도구 | 버전 | 용도 |
| --- | --- | --- |
| {{TOOL}} | {{VERSION}} | {{PURPOSE}} |

## 빠른 시작

```bash
# 저장소 루트 또는 토픽 디렉터리 중 기준 위치를 명시
{{INSTALL_COMMAND}}
{{RUN_COMMAND}}
```

## 실습 순서

| 순서 | 실습 | 가설 | 바꿀 값 | 관찰할 값 | 예상 판정 |
| --- | --- | --- | --- | --- | --- |
| 01 | {{SMOKE}} | {{HYPOTHESIS}} | {{INPUT}} | {{OBSERVATION}} | {{EXPECTED}} |

### 01. {{PRACTICE_TITLE}}

```bash
{{COMMAND}}
```

1. 실행 전에 {{VALUE}}를 예측한다.
2. 결과에서 {{METRIC_OR_STATE}}를 확인한다.
3. 예측과 다르면 {{CAUSE}}를 조사한다.

## 직접 바꿔 보기

1. {{한 번에 한 변수를 바꾸는 과제}}
2. {{의도적 실패를 만들고 설명하는 과제}}

## 검증

```bash
{{TEST_COMMAND}}
```

- 정상 경로 예상 종료 상태: {{SUCCESS_STATUS}}
- 의도적 실패 예상 종료 상태: {{FAILURE_STATUS}}

## 초기화와 정리

```bash
{{CLEANUP_COMMAND}}
```

## 안전 경계

- localhost 또는 격리된 컨테이너만 기본 대상으로 사용한다.
- 비밀값과 운영 데이터를 사용하지 않는다.
- 외부 시스템 실행은 명시적인 허가와 중단 기준이 있을 때만 수행한다.

## 참고 자료

- [학습 로드맵](../../../docs/study/{{DOMAIN}}/{{TOPIC}}/index.md)
- [조사 문서](../../../docs/research/{{DOMAIN}}/{{TOPIC}}/index.md)
- {{OFFICIAL_SOURCE}}
