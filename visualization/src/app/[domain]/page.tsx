import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DOMAINS, getDomain } from '@/content/domains';

type DomainPageProps = {
  params: Promise<{ domain: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return DOMAINS.map((domain) => ({ domain: domain.slug }));
}

export async function generateMetadata({ params }: DomainPageProps): Promise<Metadata> {
  const { domain: slug } = await params;
  const domain = getDomain(slug);

  if (!domain) notFound();

  return {
    title: `${domain.name} · Developer Study`,
    description: domain.description,
  };
}

export default async function DomainPage({ params }: DomainPageProps) {
  const { domain: slug } = await params;
  const domain = getDomain(slug);

  if (!domain) notFound();

  return (
    <div className={`domain-page domain-page--${domain.slug}`}>
      <header className="knowledge-header">
        <Link href="/" className="knowledge-wordmark">Developer Study</Link>
        <p>KNOWLEDGE FIELD / {domain.code}</p>
        <p>PORT 3113</p>
      </header>

      <main className="domain-main">
        <nav className="domain-breadcrumb" aria-label="현재 위치">
          <Link href="/">Knowledge map</Link><span>/</span><strong>{domain.name}</strong>
        </nav>

        <header className="domain-hero">
          <p className="domain-code">{domain.code}</p>
          <div>
            <p className="eyebrow">{domain.koreanName}</p>
            <h1>{domain.name}</h1>
            <p className="domain-description">{domain.description}</p>
          </div>
          <blockquote>{domain.question}</blockquote>
        </header>

        <section className="domain-themes" aria-labelledby="themes-title">
          <p className="eyebrow">FIELD SCOPE</p>
          <h2 id="themes-title">이 영역에서 연결할 주제</h2>
          <ul>{domain.themes.map((theme) => <li key={theme}>{theme}</li>)}</ul>
        </section>

        <section className="domain-library" aria-labelledby="library-title">
          <div className="domain-section-heading">
            <div>
              <p className="eyebrow">DEEP DIVES</p>
              <h2 id="library-title">학습 콘텐츠</h2>
            </div>
            <p>{domain.articles.length} published</p>
          </div>

          {domain.articles.length > 0 ? (
            <div className="domain-article-list">
              {domain.articles.map((article) => (
                <Link href={article.href} key={article.href} className="domain-article-row">
                  <span>{article.topic}</span>
                  <strong>{article.title}</strong>
                  <p>{article.description}</p>
                  <small>{article.level} · {article.publishedAt}</small>
                  <i aria-hidden="true">↗</i>
                </Link>
              ))}
            </div>
          ) : (
            <div className="domain-empty">
              <strong>첫 심층 아티클을 준비할 수 있는 자리입니다.</strong>
              <p>
                이 영역은 개요 한 편으로 채우지 않습니다. 공식 근거 조사, 교재형 학습 자료,
                글 속 인터랙션과 실행 실습이 연결된 주제부터 차례로 공개합니다.
              </p>
            </div>
          )}
        </section>

        <nav className="domain-switcher" aria-label="다른 지식 영역">
          <p>다른 관점으로 이동</p>
          <div>
            {DOMAINS.filter((item) => item.slug !== domain.slug).map((item) => (
              <Link href={`/${item.slug}`} key={item.slug}><span>{item.code}</span>{item.name}</Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
