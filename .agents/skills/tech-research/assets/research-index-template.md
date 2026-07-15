---
title: "{{TOPIC_TITLE}} 조사 문서 지도"
description: "{{조사 전체 범위와 문서 분할 기준}}"
domain: "{{DOMAIN}}"
topic: "{{TOPIC}}"
document_type: "research-index"
last_verified: "{{YYYY-MM-DD}}"
---

# {{TOPIC_TITLE}} 조사 문서 지도

> 이 문서는 상세 내용을 종합하지 않고 조사 범위, 읽는 순서와 검증 상태를 안내한다.

## 조사 범위

- 대상 버전·환경: {{VERSION_OR_ENVIRONMENT}}
- 포함 범위: {{IN_SCOPE}}
- 제외 범위: {{OUT_OF_SCOPE}}

## 깊이 범위

| 층 | 다룰 질문 | 근거 유형 | 문서 |
| --- | --- | --- | --- |
| 의미론 | {{SEMANTICS_QUESTION}} | {{SPEC_OR_OFFICIAL_DOC}} | {{DOCUMENT}} |
| 메커니즘 | {{MECHANISM_QUESTION}} | {{ARCHITECTURE_OR_SOURCE}} | {{DOCUMENT}} |
| 정량 모델 | {{QUANTITATIVE_QUESTION}} | {{MODEL_OR_MEASUREMENT_DOC}} | {{DOCUMENT}} |
| 실패·운영 | {{DIAGNOSIS_QUESTION}} | {{OPERATIONS_OR_TEST_DOC}} | {{DOCUMENT}} |

## 문서 구성

| 순서 | 문서 | 난이도 | 소주제 | 중심 질문 | 선수 문서 | 검증일 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | [{{OVERVIEW_TITLE}}](./01-overview.md) | overview | overview | {{QUESTION}} | 없음 | {{YYYY-MM-DD}} |
| 02 | [{{DETAIL_TITLE}}](./02-{{SUBTOPIC}}.md) | detail | {{SUBTOPIC}} | {{QUESTION}} | 01 | {{YYYY-MM-DD}} |
| 03 | [{{APPLICATION_TITLE}}](./03-{{APPLICATION}}.md) | application | {{APPLICATION}} | {{QUESTION}} | 01, 02 | {{YYYY-MM-DD}} |

## 선수 관계

```mermaid
flowchart LR
    A["01 개념 오버뷰"] --> B["02 핵심 동작과 세부 개념"]
    B --> C["03 응용과 판단"]
```

## 출처 전략

{{공식 문서, 명세, RFC, 논문 등 어떤 출처를 어떤 범위에 사용했는지 설명}}

## 남은 조사 과제

- {{근거가 부족하거나 후속 검증이 필요한 내용}}
