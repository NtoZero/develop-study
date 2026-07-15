export type DomainSlug = 'cs' | 'fe' | 'be' | 'db' | 'infra';

export type DomainArticle = {
  title: string;
  description: string;
  href: string;
  topic: string;
  level: string;
  publishedAt: string;
};

export type StudyDomain = {
  slug: DomainSlug;
  code: string;
  name: string;
  koreanName: string;
  description: string;
  question: string;
  themes: readonly string[];
  articles: readonly DomainArticle[];
};

export const DOMAINS: readonly StudyDomain[] = [
  {
    slug: 'cs',
    code: 'CS',
    name: 'Computer Science',
    koreanName: '컴퓨터 과학',
    description: '계산, 자원, 통신의 원리를 추상화 아래에서 다시 살펴봅니다.',
    question: '컴퓨터는 제한된 자원으로 어떻게 정확하게 계산하고 협력하는가?',
    themes: ['운영체제', '네트워크', '자료구조', '알고리즘', '컴퓨터 구조'],
    articles: [],
  },
  {
    slug: 'fe',
    code: 'FE',
    name: 'Frontend',
    koreanName: '프론트엔드',
    description: '브라우저가 데이터와 상태를 화면, 입력, 접근 가능한 경험으로 바꾸는 과정을 추적합니다.',
    question: '사용자의 한 번의 입력은 브라우저 안에서 어떤 상태 변화와 렌더링을 만드는가?',
    themes: ['브라우저', '렌더링', 'JavaScript', 'React', '웹 성능', '접근성'],
    articles: [],
  },
  {
    slug: 'be',
    code: 'BE',
    name: 'Backend',
    koreanName: '백엔드',
    description: '요청을 일관된 규칙, 동시성 제어, 신뢰할 수 있는 서비스 흐름으로 변환합니다.',
    question: '여러 요청과 실패가 겹칠 때 서비스는 어떻게 일관성과 가용성을 지키는가?',
    themes: ['API', '인증·인가', '동시성', '메시징', '분산 시스템', 'Spring'],
    articles: [],
  },
  {
    slug: 'db',
    code: 'DB',
    name: 'Database',
    koreanName: '데이터베이스',
    description: '데이터가 저장되고 경쟁하고 검색되는 내부 구조와 비용을 읽습니다.',
    question: '데이터베이스는 어떤 구조와 계약으로 빠른 검색과 안전한 변경을 함께 제공하는가?',
    themes: ['데이터 모델링', '인덱스', '트랜잭션', '격리 수준', '실행 계획', '복제'],
    articles: [],
  },
  {
    slug: 'infra',
    code: 'INFRA',
    name: 'Infrastructure',
    koreanName: '인프라',
    description: '소프트웨어가 실행되고 배포되고 관측되며 부하에 대응하는 조건을 실험합니다.',
    question: '시스템의 성능과 신뢰성을 어떤 부하, 관측, 운영 계약으로 검증할 수 있는가?',
    themes: ['Linux', '컨테이너', '배포', '관측 가능성', '성능 테스트', '확장성'],
    articles: [
      {
        title: 'k6 부하 모델을 오해하지 않는 법',
        description: '제품 철학에서 open·closed workload, Little’s Law, percentile과 병목 진단까지 연결합니다.',
        href: '/infra/k6',
        topic: 'k6 / Performance Testing',
        level: '중급·심화',
        publishedAt: '2026.07.16',
      },
    ],
  },
] as const;

export function getDomain(slug: string) {
  return DOMAINS.find((domain) => domain.slug === slug);
}
