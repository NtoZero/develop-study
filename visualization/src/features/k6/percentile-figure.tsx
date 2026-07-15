'use client';

import { useMemo, useState } from 'react';
import { analyzeDistribution } from './model';

export function PercentileFigure() {
  const [slowCount, setSlowCount] = useState(5);
  const result = useMemo(() => analyzeDistribution(slowCount), [slowCount]);

  return (
    <figure className="article-figure distribution-figure" aria-labelledby="percentile-figure-title">
      <div className="figure-heading">
        <div>
          <span>INTERACTIVE FIGURE 02</span>
          <h3 id="percentile-figure-title">평균은 느린 사용자를 얼마나 압축하는가</h3>
        </div>
        <label className="inline-control">
          <span>느린 요청 <strong>{slowCount}/100</strong></span>
          <input
            type="range"
            min="0"
            max="20"
            value={slowCount}
            onChange={(event) => setSlowCount(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="sample-strip" aria-label={`요청 100개 중 느린 요청 ${slowCount}개`}>
        {result.samples.map((sample, index) => (
          <i key={`${sample}-${index}`} className={sample >= 400 ? 'slow' : ''} title={`${sample}ms`} />
        ))}
      </div>

      <p className="distribution-reading">
        평균은 <strong>{result.average}ms</strong>지만 p95는 <strong>{result.p95}ms</strong>, p99는 <strong>{result.p99}ms</strong>다.
        {' '}<span className={result.passed ? 'pass-text' : 'fail-text'}>p95 &lt; 400ms 기준은 {result.passed ? '통과' : '실패'}한다.</span>
      </p>

      <figcaption>
        그림 2. 빠른 표본은 104–134ms, 느린 표본은 1,450ms 이상인 교육용 분포다. 실제 결과에서는 표본 수, operation tag, 오류 포함 여부를 함께 확인해야 한다.
      </figcaption>
    </figure>
  );
}
