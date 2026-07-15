'use client';

import { useMemo, useState } from 'react';
import { analyzeWorkload } from './model';

export function WorkloadModelFigure() {
  const [latencyMs, setLatencyMs] = useState(300);
  const result = useMemo(
    () => analyzeWorkload({ targetRate: 60, latencyMs, closedVUs: 30, maxVUs: 80, thinkTimeMs: 500 }),
    [latencyMs],
  );
  const closedWidth = Math.min(100, (result.closedRate / 60) * 100);
  const openVuWidth = Math.min(100, (result.openRequiredVUs / 80) * 100);

  return (
    <figure className="article-figure" aria-labelledby="workload-figure-title">
      <div className="figure-heading">
        <div>
          <span>INTERACTIVE FIGURE 01</span>
          <h3 id="workload-figure-title">지연이 늘면, 두 모델은 서로 다른 값을 포기한다</h3>
        </div>
        <label className="inline-control">
          <span>평균 iteration 시간 <strong>{latencyMs}ms</strong></span>
          <input
            type="range"
            min="100"
            max="1800"
            step="100"
            value={latencyMs}
            onChange={(event) => setLatencyMs(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="model-comparison">
        <section>
          <p className="figure-kicker">CLOSED · 30 VUs + 500ms think time</p>
          <p className="figure-result"><strong>{result.closedRate}</strong> iter/s 완료</p>
          <div className="measure-track" aria-hidden="true"><i style={{ width: `${closedWidth}%` }} /></div>
          <p>VU 수를 유지하므로 응답이 길어질수록 시작 가능한 iteration이 줄어든다.</p>
        </section>
        <section>
          <p className="figure-kicker">OPEN · target 60 iter/s</p>
          <p className="figure-result"><strong>{result.openRequiredVUs}</strong> VUs 필요</p>
          <div className={`measure-track open ${result.openRequiredVUs > 80 ? 'overflow' : ''}`} aria-hidden="true">
            <i style={{ width: `${openVuWidth}%` }} />
            <span>capacity 80</span>
          </div>
          <p>
            도착률을 유지하므로 필요한 동시성이 늘어난다.
            {result.droppedPerSecond > 0 && <> 용량 부족으로 초당 약 <strong>{result.droppedPerSecond}</strong>개를 시작하지 못한다.</>}
          </p>
        </section>
      </div>

      <figcaption>
        그림 1. 단순화한 평균 모델. open 모델의 VU 요구량은 <code>N = λW</code>, closed 모델의 완료율은 <code>X ≈ N/W</code>로 계산했다. 실제 pre-allocation에는 duration 분산과 generator 여유가 더 필요하다.
      </figcaption>
    </figure>
  );
}
