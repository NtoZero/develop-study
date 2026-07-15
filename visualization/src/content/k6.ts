export type Lesson = {
  id: string;
  order: string;
  label: string;
  title: string;
  question: string;
  insight: string;
  detail: string;
};

export const lessons: Lesson[] = [
  {
    id: 'mental-model',
    order: '01',
    label: 'FOUNDATION',
    title: '부하의 최소 단위',
    question: 'VU 100은 초당 요청 100개일까?',
    insight: 'VU는 사용자가 아니라 코드를 반복하는 실행 주체다.',
    detail: 'closed model의 처리량은 VU 수와 iteration 시간에 함께 좌우된다. 응답이 느려지면 같은 VU라도 처리량이 줄어든다.',
  },
  {
    id: 'lifecycle',
    order: '02',
    label: 'STRUCTURE',
    title: '스크립트 생명주기',
    question: '이 코드는 언제, 몇 번 실행될까?',
    insight: '정의·준비·반복 행동·정리를 실행 구간으로 분리한다.',
    detail: 'init에는 정의, setup에는 한 번의 준비, VU code에는 실제 행동, teardown에는 멱등적인 정리를 둔다.',
  },
  {
    id: 'load-models',
    order: '03',
    label: 'MECHANISM',
    title: 'Closed vs Open',
    question: '서버가 느려져도 새 요청은 계속 도착할까?',
    insight: 'closed는 작업자 수, open은 들어오는 일의 속도를 고정한다.',
    detail: 'arrival-rate는 응답과 독립적으로 시작을 시도한다. VU가 부족하면 dropped iterations가 생긴다.',
  },
  {
    id: 'quality-gates',
    order: '04',
    label: 'MEASUREMENT',
    title: '측정과 판정',
    question: '모든 응답이 200이면 통과일까?',
    insight: 'metric은 사실, check는 개별 기대, threshold는 합격선이다.',
    detail: 'check만으로 실행 실패를 보장하지 않는다. percentile·오류율·누락을 threshold로 명시해야 한다.',
  },
  {
    id: 'practice',
    order: '05',
    label: 'PRACTICE',
    title: '로컬 안내형 실습',
    question: '실패를 안전하고 반복 가능하게 만들 수 있을까?',
    insight: '가설 하나, 변수 하나, 관찰값 하나씩 부하를 키운다.',
    detail: 'smoke, ramping VUs, arrival rate, 의도적 threshold 실패를 같은 로컬 서버에서 실행한다.',
  },
  {
    id: 'design',
    order: '06',
    label: 'JUDGMENT',
    title: '목표에서 설계로',
    question: '업무 요구를 어떤 테스트로 번역할까?',
    insight: '목표→모델→관찰→판정의 추적 사슬을 만든다.',
    detail: '행동, 부하, 품질, 환경, 안전을 수치화하고 모든 설정값에 근거를 연결한다.',
  },
];

export const sources = [
  { label: 'k6 test lifecycle', href: 'https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/' },
  { label: 'Open vs closed models', href: 'https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/' },
  { label: 'Metrics reference', href: 'https://grafana.com/docs/k6/latest/using-k6/metrics/reference/' },
  { label: 'Thresholds', href: 'https://grafana.com/docs/k6/latest/using-k6/thresholds/' },
];
