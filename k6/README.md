# k6 실행 실습

이 디렉터리는 문서에서 배운 부하 모델과 품질 게이트를 실제로 확인하는 격리된 랩이다. 대상은 로컬 Node.js 서버이며 외부 시스템에 부하를 보내지 않는다.

## 준비

- Node.js 20.9 이상
- 다음 중 하나
  - k6 v2.0.0 로컬 설치
  - Docker와 Docker Compose

## 1. 대상 서버 실행

```bash
cd k6
pnpm target
```

서버는 `http://localhost:3001`에서 실행된다.

| 경로 | 동작 |
| --- | --- |
| `/health` | 즉시 정상 응답 |
| `/items` | 학습용 목록 반환 |
| `/slow?ms=350` | 지정한 밀리초만큼 지연, 최대 5초 |
| `/unstable?rate=0.1` | 요청 순번을 이용해 결정론적 비율로 503 응답 |

## 2. 실습 실행

다른 터미널에서 실행한다. 로컬 k6를 사용할 때:

```bash
cd k6
BASE_URL=http://localhost:3001 pnpm smoke
BASE_URL=http://localhost:3001 pnpm closed
BASE_URL=http://localhost:3001 pnpm open
BASE_URL=http://localhost:3001 pnpm fail
```

Docker를 사용할 때:

```bash
cd k6
pnpm docker:smoke
pnpm docker:closed
pnpm docker:open
pnpm docker:fail
```

## 실습 순서와 관찰 포인트

### 01 Smoke

- 가설: endpoint와 스크립트가 정상이며 check와 모든 threshold가 통과한다.
- 관찰: `checks`, `http_req_failed`, `http_req_duration`.

### 02 Ramping VUs — closed model

- 가설: VU가 1→5→0으로 바뀌며 iteration 처리량도 함께 변한다.
- 관찰: `vus`, `iterations`, p95. 응답이 느려지면 VU 수가 같아도 처리량이 낮아진다는 점을 떠올린다.

### 03 Constant arrival rate — open model

- 가설: 초당 20 iteration 시작을 시도하며 250ms 지연을 감당하기 위해 여러 VU가 사용된다.
- 관찰: iteration 시작률, `vus`, `dropped_iterations`. 학습 PC 성능에 따라 값은 달라질 수 있다.

### 04 의도적 threshold 실패

- 가설: 기능 check는 통과하지만 `p(95)<200ms`는 실패한다.
- 실제 endpoint는 최소 350ms 지연되므로 k6가 실패 exit status를 반환해야 정상이다.

## 직접 바꿔 보기

1. `03-arrival-rate.js`의 지연을 250ms에서 1,000ms로 올리고 필요한 VU와 누락을 예측한다.
2. `maxVUs`를 5로 낮춰 `dropped_iterations`를 관찰한다.
3. `04-threshold-failure.js`의 기준을 500ms로 바꾸고 통과 여부를 확인한다.
4. `/unstable?rate=0.1`을 호출하고 `http_req_failed` threshold를 5%와 15%로 각각 설정한다.

## 안전 원칙

- 명시적 허가 없이 운영 또는 외부 서비스 URL로 `BASE_URL`을 변경하지 않는다.
- 팀 환경에서는 테스트 데이터 격리, 모니터링, 중단 조건과 담당자를 먼저 정한다.
- 로컬 랩의 수치를 운영 시스템 용량으로 해석하지 않는다.

## 학습 자료

- [k6 학습 로드맵](../docs/study/infra/k6/index.md)
- [공식 k6 설치 문서](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- [k6 v2.0.0 릴리스](https://github.com/grafana/k6/releases/tag/v2.0.0)
