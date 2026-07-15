import type { Metadata } from 'next';
import Link from 'next/link';
import { DOMAINS } from '@/content/domains';

export const metadata: Metadata = {
  title: 'Developer Study · 풀스택 기술 지식 지도',
  description: 'CS, 프론트엔드, 백엔드, 데이터베이스, 인프라를 공식 근거와 실습으로 연결해 학습하는 공간',
};

export default function HomePage() {
  const publishedArticles = DOMAINS.flatMap((domain) => domain.articles);

  return (
    <div className="home-page">
      <header className="knowledge-header">
        <Link href="/" className="knowledge-wordmark">Developer Study</Link>
        <p>FULL-STACK KNOWLEDGE MAP</p>
        <p>PORT 3113</p>
      </header>

      <main>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-meta">
            <p className="eyebrow">SYSTEMS, NOT SILOS</p>
            <p><strong>{DOMAINS.length}</strong> knowledge fields</p>
            <p><strong>{publishedArticles.length}</strong> published deep dive</p>
          </div>
          <div>
            <h1 id="home-title">기술 하나를 외우는 대신,<br />시스템 전체를 연결합니다.</h1>
            <p className="home-dek">
              컴퓨터 과학의 원리부터 화면, 서버, 데이터, 실행 환경까지.
              공식 근거로 깊이 읽고, 문맥 속 도해로 관찰하고, 로컬 실습으로 검증합니다.
            </p>
          </div>
        </section>

        <section className="field-section" aria-labelledby="field-title">
          <header className="section-intro">
            <p className="eyebrow">KNOWLEDGE FIELDS</p>
            <h2 id="field-title">어느 관점에서 시작할까요?</h2>
            <p>영역은 분리된 강의실이 아니라 같은 시스템을 바라보는 다섯 개의 렌즈입니다.</p>
          </header>

          <div className="field-index">
            {DOMAINS.map((domain) => (
              <Link
                key={domain.slug}
                href={`/${domain.slug}`}
                className={`field-row field-row--${domain.slug}`}
              >
                <span className="field-code">{domain.code}</span>
                <span className="field-name">
                  <strong>{domain.name}</strong>
                  <small>{domain.koreanName}</small>
                </span>
                <span className="field-description">{domain.description}</span>
                <span className="field-themes">{domain.themes.slice(0, 3).join(' · ')}</span>
                <span className="field-count">{domain.articles.length ? `${domain.articles.length} article` : 'Open field'}</span>
                <span className="field-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="learning-system" aria-labelledby="learning-system-title">
          <div className="section-intro compact">
            <p className="eyebrow">HOW KNOWLEDGE MOVES</p>
            <h2 id="learning-system-title">근거에서 이해와 검증까지</h2>
          </div>
          <ol>
            <li><span>Research</span><strong>공식 근거를 수집합니다</strong><p>명세, 공식 문서, 소스와 논문에서 사실의 경계를 확인합니다.</p></li>
            <li><span>Study</span><strong>교재의 논리로 재구성합니다</strong><p>정의에서 메커니즘, 정량 모델, 실패 진단까지 순서를 만듭니다.</p></li>
            <li><span>Explore</span><strong>글 속에서 직접 관찰합니다</strong><p>인과관계가 중요한 지점에 작은 인터랙티브 도해를 놓습니다.</p></li>
            <li><span>Practice</span><strong>실제 실행으로 반증합니다</strong><p>격리된 코드와 테스트에서 예측이 맞는지 다시 확인합니다.</p></li>
          </ol>
        </section>

        <section className="latest-section" aria-labelledby="latest-title">
          <header className="section-intro compact">
            <p className="eyebrow">RECENTLY PUBLISHED</p>
            <h2 id="latest-title">새로 열린 학습 경로</h2>
          </header>
          {publishedArticles.map((article) => (
            <Link key={article.href} href={article.href} className="latest-article">
              <span>{article.topic}</span>
              <strong>{article.title}</strong>
              <p>{article.description}</p>
              <small>{article.level} · {article.publishedAt}</small>
              <i aria-hidden="true">읽기 ↗</i>
            </Link>
          ))}
        </section>
      </main>

      <footer className="knowledge-footer">
        <strong>Developer Study</strong>
        <p>외우는 지식에서 설명하고 검증하는 이해로.</p>
      </footer>
    </div>
  );
}
