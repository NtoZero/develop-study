import type { Metadata } from 'next';
import Link from 'next/link';
import { PercentileFigure } from '@/features/k6/percentile-figure';
import { WorkloadModelFigure } from '@/features/k6/workload-model-figure';

export const metadata: Metadata = {
  title: 'k6 부하 모델을 오해하지 않는 법 · Developer Study',
  description: 'VU, open/closed workload, Little’s Law, percentile과 threshold를 연결해 k6 성능 테스트를 설계하는 심층 아티클',
};

const toc = [
  ['identity', 'k6의 철학과 제품 경계'],
  ['question', '성능 테스트의 질문'],
  ['units', '네 실행 단위'],
  ['models', 'closed와 open'],
  ['capacity', 'VU 용량 계획'],
  ['measurement', '측정과 percentile'],
  ['thresholds', '품질 게이트'],
  ['diagnosis', '병목을 진단하는 법'],
  ['practice', '로컬 실습 경로'],
] as const;

export default function K6ArticlePage() {
  return (
    <main className="article-page">
      <header className="article-site-header">
        <Link href="/" className="article-wordmark">Developer Study</Link>
        <Link href="/infra" className="article-field-link">INFRA / PERFORMANCE</Link>
        <span>PORT 3113</span>
      </header>

      <div className="article-layout">
        <aside className="article-toc" aria-label="이 글의 목차">
          <p>이 글의 목차</p>
          <ol>
            {toc.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ol>
          <p className="toc-note">읽는 시간 약 21분<br />k6 v2.1.0 기준</p>
        </aside>

        <article className="technical-article">
          <header className="article-lead">
            <p className="article-category">K6 DEEP DIVE · 2026.07.16</p>
            <h1>k6 부하 모델을<br />오해하지 않는 법</h1>
            <p className="article-dek">
              VU 100을 사용자 100명으로 읽는 순간, 성능 테스트는 틀린 질문에 정밀한 숫자를 답하기 시작한다.
              k6의 실행 단위와 두 workload model, <span>Little&apos;s Law</span>, percentile과 threshold를 하나의 인과 사슬로 연결해 보자.
            </p>
            <div className="article-byline">
              <span>Developer Study Editorial</span>
              <span>공식 문서 검증 · 로컬 실습 포함</span>
            </div>
          </header>

          <section id="identity">
            <p className="section-number">00</p>
            <h2>k6는 부하 생성기보다 하나의 개발 철학에 가깝다</h2>
            <p>
              k6는 2016년에 시작해 2017년 오픈소스로 공개됐고, 2021년 Grafana Labs가 프로젝트를 만든 회사를 인수했다.
              공식 저장소가 밝힌 핵심 설계 목표는 <strong>개발자 경험</strong>이다. 그래서 테스트를 JavaScript·TypeScript 코드로 작성하고,
              버전 관리와 코드 리뷰를 거쳐 로컬·CI에서 반복하며, threshold를 프로세스 종료 상태로 바꾼다. tests as code는 편의 기능이 아니라 제품의 중심 관점이다.
            </p>
            <table>
              <thead><tr><th>구성</th><th>관리·운영</th><th>라이선스·약관</th><th>경계</th></tr></thead>
              <tbody>
                <tr><td>Grafana k6 OSS</td><td>Grafana Labs 주도 + 외부 기여</td><td>AGPL-3.0</td><td>self-managed CLI와 공개 소스</td></tr>
                <tr><td>Grafana Cloud k6</td><td>Grafana Labs managed service</td><td>Cloud 서비스 약관</td><td>분산 실행·보존·협업·지원</td></tr>
                <tr><td>k6 extensions</td><td>공식·커뮤니티 프로젝트별 상이</td><td>각 저장소에서 확인</td><td>core 밖의 프로토콜·출력·기능</td></tr>
              </tbody>
            </table>
            <p>
              이 글과 실습은 <strong>Grafana k6 OSS CLI v2.1.0</strong>을 다룬다. Cloud 기능을 OSS 라이선스의 일부로 보거나,
              모든 extension에 core의 라이선스와 유지보수 수준이 자동 적용된다고 가정하지 않는다. k6의 강점은 코드 리뷰·CI·명시적 workload model이 필요한 팀에서 커지고,
              GUI 중심 작성이나 독립 재단 거버넌스가 중요한 환경에서는 그 선택 기준을 다시 비교해야 한다.
            </p>
          </section>

          <section id="question">
            <p className="section-number">01</p>
            <h2>“1,000명을 견딘다”는 아직 테스트할 수 없는 문장이다</h2>
            <p>
              1,000명이 화면을 열어 둔 것과 초당 1,000건의 주문이 들어오는 것은 전혀 다른 시스템을 요구한다.
              사용자가 30초마다 한 번 조회하면 약 33 req/s지만, 1초마다 네 요청을 병렬로 보내면 4,000 req/s다.
              그래서 성능 테스트의 첫 입력은 사용자 수가 아니라 <strong>시스템 경계, workload model, 시간, 흐름 비율, 데이터 분포, SLI, 성공 조건</strong>이다.
            </p>
            <blockquote>
              성능 테스트는 요청을 많이 보내는 일이 아니라, 입력 부하와 관측 결과 사이의 관계를 통제하는 실험이다.
            </blockquote>
            <p>
              예를 들어 “점심 peak 주문 서비스”를 시험한다면 `120 checkout iterations/s`, 2분 warm-up과 15분 steady 구간,
              주문 생성 `p(95) &lt; 400ms`, 시스템 오류율 `&lt; 0.5%`, business check 실패율 `&lt; 0.1%`,
              `dropped_iterations = 0`까지 적어야 한다. 이때야 비로소 설정값이 요구사항으로 추적된다.
            </p>
          </section>

          <section id="units">
            <p className="section-number">02</p>
            <h2>scenario, VU, iteration, request는 같은 단위가 아니다</h2>
            <p>
              scenario는 독립된 workload다. 각 scenario는 executor와 실행 함수, 시작 시점, 태그를 가진다.
              VU는 그 함수를 반복하는 실행 슬롯이고, 함수 한 번이 iteration이다. iteration 안에는 여러 HTTP request가 들어갈 수 있다.
            </p>
            <div className="execution-trace" role="img" aria-label="테스트에서 시나리오, VU, iteration, request로 이어지는 실행 계층">
              <span>test run</span><b>→</b><span>scenario</span><b>→</b><span>VU slot</span><b>→</b><span>iteration</span><b>→</b><span>requests × n</span>
            </div>
            <p>
              그러므로 `20 iter/s`를 `20 req/s`라고 보고하면 안 된다. 한 checkout iteration이 login, cart, order, 두 번의 status poll을 수행한다면
              정상 경로만 약 100 req/s다. redirect와 retry가 더해지면 실제 요청률은 더 커진다. 반대로 request 하나가 서버 내부에서 세 microservice를 호출해도 k6의 client request는 하나다.
            </p>
            <aside className="article-note">
              <strong>런타임 경계</strong>
              각 VU는 Sobek 기반의 독립 JavaScript VM을 가진다. 큰 fixture를 일반 배열로 읽으면 VU 수에 따라 메모리가 증폭될 수 있다.
              읽기 전용 대형 데이터에는 `SharedArray`를 검토하되, `setup()`으로 거대한 객체를 반환하면 직렬화·복제 비용이 다시 생긴다.
            </aside>
          </section>

          <section id="models">
            <p className="section-number">03</p>
            <h2>서버가 느려질 때 무엇을 유지할 것인가</h2>
            <p>
              closed model에서는 일정 수의 VU가 이전 iteration을 마친 뒤 다음 일을 시작한다. 응답이 느려지면 VU가 오래 묶이고,
              새 iteration 시작률은 자연스럽게 떨어진다. 반면 open model은 이전 완료와 관계없이 외부 arrival를 예약한다.
              느려진 만큼 필요한 동시성이 늘고, 실행 슬롯이 부족하면 iteration을 시작하지 못한다.
            </p>
            <pre><code>{`closed: latency ↑ → iteration start rate ↓
open:   latency ↑ → required concurrency ↑ → drop risk ↑`}</code></pre>
            <p>
              이 차이를 정량적으로 잇는 관계가 <strong>Little&apos;s Law, N = λW</strong>다. 안정된 구간에서 초당 도착률 `λ`와 평균 체류시간 `W`를 곱하면
              평균 동시 작업 수 `N`이 된다. 60 iter/s를 유지하며 평균 iteration이 0.5초라면 평균 30개 슬롯이 필요하다.
              지연이 1.5초가 되면 같은 입력을 유지하는 데 평균 90개가 필요하다.
            </p>

            <WorkloadModelFigure />

            <h3>coordinated omission: 가장 나쁜 순간의 요청을 만들지 않는 문제</h3>
            <p>
              외부에서는 100ms마다 일이 도착하는데 서버가 1초 멈췄다고 하자. open model은 그동안의 도착을 계속 예약해 대기·실행·drop으로 압력을 드러낸다.
              1 VU closed model은 첫 요청이 끝날 때까지 새 요청을 만들지 않는다. 결과에는 느린 요청 하나만 남고, 그 1초 동안 도착했어야 할 표본은 사라진다.
              실제 생산 입력이 외부 도착이라면 시스템이 지나치게 안정적으로 보일 수 있다.
            </p>
            <p>
              그렇다고 open이 언제나 옳은 것은 아니다. 사람이 응답을 본 뒤 다음 행동을 하는 여정에는 closed feedback이 실제 행동이다.
              executor 이름이 아니라 생산 트래픽의 인과 구조를 골라야 한다.
            </p>
          </section>

          <section id="capacity">
            <p className="section-number">04</p>
            <h2>preAllocatedVUs는 감이 아니라 duration 분포에서 나온다</h2>
            <p>
              arrival-rate executor의 VU는 부하 목표가 아니라 목표 rate를 구현하는 자원이다. 공식 가이드의 출발점은
              <code> median iteration duration × rate + variance allowance</code>다. 목표가 120 iter/s이고 median이 0.4초라면 중심 요구량은 48 VU다.
              하지만 p95가 1.2초라면 burst 구간에는 훨씬 많은 슬롯이 필요하다.
            </p>
            <ol className="prose-steps">
              <li>작은 probe run으로 iteration duration 분포를 얻는다.</li>
              <li><code>λW</code>로 중앙 동시성을 계산한다.</li>
              <li>p90/p95, jitter, 초기 연결 비용을 반영해 후보 VU 범위를 만든다.</li>
              <li>목표 구간에서 drop과 generator CPU·RAM을 함께 검증한다.</li>
            </ol>
            <p>
              `maxVUs`를 크게 두는 것은 충분한 계획의 대체재가 아니다. run 도중 VU를 만들면 generator의 CPU와 memory가 바뀌어 측정을 교란한다.
              `dropped_iterations`가 처음부터 생기면 설정·사전 할당을, 정상 시작 후 latency와 함께 생기면 SUT 열화를, generator CPU 100%와 함께 생기면 부하 생성기 병목을 먼저 의심한다.
            </p>
            <pre><code>{`scenarios: {
  checkout: {
    executor: 'constant-arrival-rate',
    rate: 120,
    timeUnit: '1s',
    duration: '10m',
    preAllocatedVUs: 90,
    maxVUs: 120,
  },
}`}</code></pre>
            <p className="code-caption">90이라는 숫자는 요구사항에서 직접 나오지 않는다. probe run의 duration 분포와 headroom을 근거로 남겨야 한다.</p>
          </section>

          <section id="measurement">
            <p className="section-number">05</p>
            <h2>p95는 숫자가 아니라 표본 집합에 대한 문장이다</h2>
            <p>
              `http_req_duration`은 일반적으로 sending, waiting, receiving을 합친 client-side 시간이다. DNS, TCP connect, TLS, connection slot 대기인 blocked는 별도다.
              특히 waiting은 서버 함수 시간과 같지 않다. proxy queue, network, application, DB와 downstream이 합쳐진 첫 byte 대기다.
            </p>
            <div className="timing-line" aria-label="HTTP 요청 시간 구성">
              <span>blocked</span><span>DNS</span><span>connect</span><span>TLS</span><strong>sending</strong><strong>waiting</strong><strong>receiving</strong>
            </div>
            <p>
              평균은 전체 자원 시간의 중심을 보는 데 유용하지만 tail을 숨긴다. 100개 중 95개가 약 120ms이고 5개가 1.5초 이상이라면 평균만으로는
              느린 사용자 집단의 크기와 심각성을 읽기 어렵다. 아래 표본에서 느린 요청 수를 움직여 평균과 p95의 경계가 어떻게 달라지는지 확인해 보자.
            </p>

            <PercentileFigure />

            <p>
              percentile도 만능은 아니다. 표본 100개의 p99는 사실상 가장 느린 몇 값에 달려 있다. 짧은 smoke test의 p99로 용량을 보증하지 말아야 한다.
              sample count, median, 여러 percentile, max, error rate, throughput을 함께 읽고 login·browse·checkout을 한 분포에 섞지 않는다.
            </p>
          </section>

          <section id="thresholds">
            <p className="section-number">06</p>
            <h2>check는 관측하고, threshold는 실행을 판정한다</h2>
            <p>
              check 실패는 비율을 기록하지만 그 자체로 k6 프로세스를 실패시키지 않는다. CI에서 계약을 집행하려면 threshold가 필요하다.
              또한 기본 <code>http_req_failed</code>는 200–399를 expected response로 본다. <code>{'200 {"ok": false}'}</code> 같은 비즈니스 실패는 별도 check가 필요하다.
            </p>
            <pre><code>{`thresholds: {
  'http_req_duration{operation:checkout}': [
    'p(95)<400', 'p(99)<900'
  ],
  'http_req_failed{operation:checkout}': ['rate<0.005'],
  checks: ['rate>0.999'],
  dropped_iterations: ['count==0'],
}`}</code></pre>
            <p>
              tag로 operation 표본을 분리할 때는 cardinality budget이 필요하다. `operation=checkout`, `scenario=peak`처럼 유한한 값은 좋다.
              `user_id`, 원본 `/orders/918273`처럼 계속 달라지는 값은 time series 수를 폭증시킨다. URL에는 `name=GET /orders/:id` 같은 안정된 이름을 붙이고,
              단일 요청 추적은 sampled log와 trace correlation에 맡긴다.
            </p>
            <aside className="article-note warning">
              <strong>조기 중단의 양면</strong>
              `abortOnFail`은 실패한 부하로부터 대상을 보호하지만 표본과 회복 구간을 자른다. 초기 cache·connection warm-up이 있다면 `delayAbortEval`을 근거 있게 두고,
              안전 중단 조건과 성능 판정 조건을 구분한다.
            </aside>
          </section>

          <section id="diagnosis">
            <p className="section-number">07</p>
            <h2>threshold 실패는 원인이 아니라 진단의 시작이다</h2>
            <p>
              `p95 &gt; 400ms`는 계약 위반을 알려 줄 뿐 DB나 애플리케이션을 지목하지 않는다. 진단에는 generator telemetry, k6 client outcome,
              SUT telemetry 세 관측면이 필요하다. clock과 run ID를 맞춘 뒤 <strong>증상 → 경쟁 가설 → 구분 증거 → 한 변수 재실험</strong> 순서로 진행한다.
            </p>
            <table>
              <thead><tr><th>관측</th><th>우선 가설</th><th>다음 증거</th></tr></thead>
              <tbody>
                <tr><td>blocked 상승, SUT 안정</td><td>generator connection/FD</td><td>열린 FD, connection reuse, generator CPU</td></tr>
                <tr><td>waiting 상승, app CPU 100%</td><td>compute saturation</td><td>profiler, run queue, GC pause</td></tr>
                <tr><td>waiting 상승, app CPU 낮음</td><td>DB·lock·downstream 대기</td><td>pool wait, trace child span</td></tr>
                <tr><td>오류 증가, latency 급락</td><td>fast reject·circuit breaker</td><td>status 분포, rejection metric</td></tr>
                <tr><td>latency 후 drop 증가</td><td>SUT 포화 또는 VU/generator 부족</td><td>active/max VU, 양쪽 자원 곡선</td></tr>
              </tbody>
            </table>
            <p>
              단계적으로 rate를 올릴 때 completion throughput이 더 이상 입력을 따라가지 못하고 tail latency·queue·error가 비선형적으로 커지는 굽힘점이 있다.
              운영 용량은 이 knee의 최대치가 아니라, SLO를 만족하고 변동을 흡수할 headroom이 남는 이전 구간에 둔다.
            </p>
          </section>

          <section id="practice">
            <p className="section-number">08</p>
            <h2>모델은 로컬 실험에서 틀릴 기회를 가져야 한다</h2>
            <p>
              이 저장소의 <code>practice/infra/k6</code>에는 지연과 실패를 통제할 수 있는 로컬 대상 서버와 네 script가 있다.
              공개 데모 서버에 부하를 보내지 않고 smoke, closed ramp, arrival rate, 의도적 threshold 실패를 같은 조건에서 비교한다.
            </p>
            <div className="practice-sequence">
              <p><span>1</span><strong>Smoke</strong> 연결·script·check만 확인한다.</p>
              <p><span>2</span><strong>Ramping VUs</strong> 지연이 completion rate에 주는 closed feedback을 본다.</p>
              <p><span>3</span><strong>Arrival rate</strong> <code>λW</code> 예측과 active VU·drop을 비교한다.</p>
              <p><span>4</span><strong>Threshold fail</strong> 예상한 계약 위반이 비정상 종료로 전달되는지 확인한다.</p>
            </div>
            <pre><code>{`cd practice/infra/k6
npm run target       # terminal 1
npm run k6:smoke     # terminal 2
npm run k6:ramp
npm run k6:arrival
npm run k6:fail      # 의도된 비정상 종료`}</code></pre>
            <p>
              각 run에는 script와 target 버전, generator 자원, workload profile, data seed, summary와 time-series 위치를 남긴다.
              수식 예측과 실제값이 다르면 duration 분산, think time, retry, connection, generator overhead 중 모델에서 생략한 항을 찾는다.
            </p>
          </section>

          <footer className="article-sources">
            <h2>근거와 다음 읽을거리</h2>
            <p>이 글은 2026-07-16에 Grafana 공식 문서, 공식 저장소와 k6 v2.1.0 릴리스를 교차 확인했다. 인터랙티브 수치는 개념을 드러내는 결정론적 모델이며 benchmark 결과가 아니다.</p>
            <ul>
              <li><a href="https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/">Grafana k6 · Open and closed models ↗</a></li>
              <li><a href="https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/">Grafana k6 · Arrival-rate VU allocation ↗</a></li>
              <li><a href="https://grafana.com/docs/k6/latest/using-k6/metrics/">Grafana k6 · Metrics ↗</a></li>
              <li><a href="https://grafana.com/docs/k6/latest/using-k6/thresholds/">Grafana k6 · Thresholds ↗</a></li>
              <li><a href="https://grafana.com/docs/k6/latest/testing-guides/automated-performance-testing/">Grafana k6 · Automated performance testing ↗</a></li>
              <li><a href="https://grafana.com/oss/k6/">Grafana · k6 제품 철학과 제품군 ↗</a></li>
              <li><a href="https://github.com/grafana/k6">GitHub · k6 저장소와 AGPL-3.0 ↗</a></li>
              <li><a href="https://github.com/grafana/k6/releases/tag/v2.1.0">GitHub · k6 v2.1.0 release ↗</a></li>
            </ul>
          </footer>
        </article>
      </div>
    </main>
  );
}
