import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-shell">
      <p className="eyebrow">DEVELOPER STUDY / INTERACTIVE SYSTEMS LAB</p>
      <h1>코드를 읽는 데서<br />시스템을 예측하는 데까지.</h1>
      <p className="landing-copy">
        공식 근거로 개념을 세우고, 흐름을 직접 조작하고, 로컬 실습으로 검증합니다.
      </p>
      <Link className="primary-link" href="/infra/k6">
        k6 부하 실험실 열기 <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
