import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-shell">
      <p className="eyebrow">DEVELOPER STUDY / TECHNICAL PUBLICATION</p>
      <h1>코드를 읽는 데서<br />시스템을 예측하는 데까지.</h1>
      <p className="landing-copy">
        공식 근거로 원리를 깊이 읽고, 문맥 속 도해를 조작하고, 로컬 실습으로 검증합니다.
      </p>
      <Link className="primary-link" href="/infra/k6">
        k6 심층 아티클 읽기 <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
