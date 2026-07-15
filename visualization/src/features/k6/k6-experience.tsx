'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Lesson } from '@/content/k6';
import { defaultInput, simulate, type LoadModel, type SimulationInput, type TimelinePoint } from './model';

type Source = { label: string; href: string };

function linePath(points: TimelinePoint[], key: 'actualRate' | 'activeVUs', width: number, height: number) {
  const maximum = Math.max(...points.map((point) => point[key]), 1);
  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - (point[key] / maximum) * (height - 12) - 6;
      return `${x},${y}`;
    })
    .join(' ');
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span><span>{label}</span><strong>{value}{unit}</strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function K6Experience({ lessons, sources }: { lessons: Lesson[]; sources: Source[] }) {
  const [activeLesson, setActiveLesson] = useState(0);
  const [input, setInput] = useState<SimulationInput>(defaultInput);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const result = useMemo(() => simulate(input), [input]);
  const current = result.points[Math.min(cursor, result.points.length - 1)];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCursor((value) => {
        if (value >= input.durationSeconds) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [playing, input.durationSeconds]);

  function update<K extends keyof SimulationInput>(key: K, value: SimulationInput[K]) {
    setInput((previous) => ({ ...previous, [key]: value }));
    setCursor(0);
    setPlaying(false);
  }

  function selectLesson(index: number) {
    setActiveLesson(index);
    const lesson = lessons[index];
    window.history.replaceState(null, '', `#${lesson.id}`);
    document.getElementById('lesson-stage')?.focus({ preventScroll: true });
  }

  return (
    <main className="k6-shell">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Developer Study 홈">
          DEV/STUDY <span>LAB 3113</span>
        </Link>
        <div className="header-meta">
          <span className="status-dot" aria-hidden="true" />
          K6 / OFFICIAL SOURCE TRACK
        </div>
      </header>

      <section className="hero-grid" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">INFRA · PERFORMANCE ENGINEERING · K6 v2.0</p>
          <h1 id="page-title">부하는 숫자가 아니라<br /><em>시간 위의 행동</em>이다.</h1>
        </div>
        <div className="hero-note">
          <span className="note-index">FIELD NOTE / 001</span>
          <p>VU를 올리기 전에 질문을 바꾸세요. “몇 명인가?”에서 “언제 무엇이 시작되고, 무엇을 통과라 부를 것인가?”로.</p>
          <a href="#load-bench">실험대로 이동 <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className="course-section" aria-labelledby="course-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SEQUENTIAL COURSE</p>
            <h2 id="course-title">개념에서 판단까지, 6개의 관문</h2>
          </div>
          <p>{String(activeLesson + 1).padStart(2, '0')} / {String(lessons.length).padStart(2, '0')}</p>
        </div>

        <div className="course-layout">
          <nav className="lesson-rail" aria-label="k6 학습 순서">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                type="button"
                className={index === activeLesson ? 'active' : ''}
                aria-current={index === activeLesson ? 'step' : undefined}
                onClick={() => selectLesson(index)}
              >
                <span>{lesson.order}</span>
                <span>{lesson.title}<small>{lesson.label}</small></span>
              </button>
            ))}
          </nav>

          <article className="lesson-stage" id="lesson-stage" tabIndex={-1}>
            <div className="lesson-stamp">GATE {lessons[activeLesson].order} · {lessons[activeLesson].label}</div>
            <p className="lesson-question">{lessons[activeLesson].question}</p>
            <h3>{lessons[activeLesson].insight}</h3>
            <p className="lesson-detail">{lessons[activeLesson].detail}</p>
            <div className="lesson-actions">
              <button type="button" disabled={activeLesson === 0} onClick={() => selectLesson(activeLesson - 1)}>← 이전</button>
              <button type="button" disabled={activeLesson === lessons.length - 1} onClick={() => selectLesson(activeLesson + 1)}>다음 관문 →</button>
            </div>
          </article>
        </div>
      </section>

      <section className="bench-section" id="load-bench" aria-labelledby="bench-title">
        <div className="bench-title-row">
          <div>
            <p className="eyebrow light">INTERACTIVE LOAD BENCH · EDUCATIONAL SIMULATION</p>
            <h2 id="bench-title">부하 파형 실험대</h2>
          </div>
          <div className={`verdict ${result.passed ? 'pass' : 'fail'}`} aria-live="polite">
            <span>{result.passed ? 'PASS' : 'FAIL'}</span>
            <small>{result.passed ? '모든 학습 기준 충족' : result.reasons[0]}</small>
          </div>
        </div>

        <div className="bench-grid">
          <aside className="control-deck" aria-label="부하 설정">
            <div className="model-switch" role="group" aria-label="부하 모델">
              {(['closed', 'open'] as LoadModel[]).map((model) => (
                <button
                  key={model}
                  type="button"
                  className={input.model === model ? 'active' : ''}
                  aria-pressed={input.model === model}
                  onClick={() => update('model', model)}
                >
                  <span>{model === 'closed' ? 'CLOSED' : 'OPEN'}</span>
                  <small>{model === 'closed' ? 'VU 고정' : '도착률 고정'}</small>
                </button>
              ))}
            </div>
            <RangeControl
              label={input.model === 'closed' ? '목표 VU' : '목표 도착률'}
              value={input.target}
              min={1}
              max={100}
              unit={input.model === 'closed' ? ' VU' : '/s'}
              onChange={(value) => update('target', value)}
            />
            <RangeControl label="응답 지연" value={input.latencyMs} min={50} max={1500} step={50} unit="ms" onChange={(value) => update('latencyMs', value)} />
            <RangeControl label="오류율" value={input.errorRate} min={0} max={5} step={0.1} unit="%" onChange={(value) => update('errorRate', value)} />
            <RangeControl label="p95 기준" value={input.thresholdMs} min={100} max={1500} step={50} unit="ms" onChange={(value) => update('thresholdMs', value)} />
            <RangeControl label="VU 용량" value={input.maxVUs} min={2} max={80} unit="" onChange={(value) => update('maxVUs', value)} />
            <button className="reset-button" type="button" onClick={() => { setInput(defaultInput); setCursor(0); setPlaying(false); }}>
              설정 초기화 ↺
            </button>
          </aside>

          <div className="scope-panel">
            <div className="scope-head">
              <div>
                <span>TIME SCOPE</span>
                <strong>T+{String(current.second).padStart(2, '0')}s</strong>
              </div>
              <div className="scope-legend" aria-label="그래프 범례">
                <span><i className="blue" />실제 처리율</span>
                <span><i className="amber" />활성 VU</span>
              </div>
            </div>

            <div className="scope-chart" role="img" aria-label="시간에 따른 실제 처리율과 활성 VU. 두 선은 각자 독립된 축으로 정규화됨">
              <svg viewBox="0 0 720 260" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <pattern id="grid" width="72" height="52" patternUnits="userSpaceOnUse">
                    <path d="M 72 0 L 0 0 0 52" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6aa8ff" stopOpacity="0.28" />
                    <stop offset="1" stopColor="#6aa8ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <rect width="720" height="260" fill="url(#grid)" className="chart-grid" />
                <polyline points={linePath(result.points, 'actualRate', 720, 260)} fill="none" stroke="#6aa8ff" strokeWidth="4" vectorEffect="non-scaling-stroke" />
                <polyline points={linePath(result.points, 'activeVUs', 720, 260)} fill="none" stroke="#ffb44a" strokeWidth="2" strokeDasharray="8 7" vectorEffect="non-scaling-stroke" />
                <line x1={(current.second / input.durationSeconds) * 720} x2={(current.second / input.durationSeconds) * 720} y1="0" y2="260" stroke="#f5f7fa" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="chart-axis"><span>0s</span><span>두 선은 독립 스케일</span><span>{input.durationSeconds}s</span></div>
            </div>

            <div className="transport">
              <button type="button" onClick={() => setCursor(Math.max(0, cursor - 1))} aria-label="1초 이전">−1</button>
              <button className="play" type="button" onClick={() => { if (cursor >= input.durationSeconds) setCursor(0); setPlaying((value) => !value); }}>
                {playing ? '일시 정지 Ⅱ' : '재생 ▶'}
              </button>
              <button type="button" onClick={() => setCursor(Math.min(input.durationSeconds, cursor + 1))} aria-label="1초 다음">+1</button>
              <input aria-label="시뮬레이션 시간" type="range" min="0" max={input.durationSeconds} value={cursor} onChange={(event) => { setCursor(Number(event.target.value)); setPlaying(false); }} />
            </div>

            <div className="readout-grid" aria-label="예상 결과 요약">
              <div><span>PEAK RATE</span><strong>{result.peakRate}<small>/s</small></strong></div>
              <div><span>PEAK VUs</span><strong>{result.peakVUs}<small> VU</small></strong></div>
              <div className={result.p95 >= input.thresholdMs ? 'alert' : ''}><span>p95 LATENCY</span><strong>{result.p95}<small>ms</small></strong></div>
              <div className={result.errorRate >= 1 ? 'alert' : ''}><span>ERRORS</span><strong>{result.errorRate}<small>%</small></strong></div>
              <div className={result.dropped > 0 ? 'alert' : ''}><span>DROPPED</span><strong>{result.dropped}<small> iter</small></strong></div>
            </div>
            <p className="simulation-note">이 값은 개념 학습용 결정론적 시뮬레이션입니다. 실제 시스템 결과는 아래 로컬 k6 실습으로 검증하세요.</p>
          </div>
        </div>
      </section>

      <section className="explain-section" aria-labelledby="explain-title">
        <div className="cause-card">
          <p className="eyebrow">CAUSE → EFFECT</p>
          <h2 id="explain-title">지연이 부하에 되돌아오는 방식</h2>
          <div className="flow-strip">
            <span>EXECUTOR<small>{input.model === 'closed' ? 'VU를 유지' : '도착률을 유지'}</small></span>
            <b aria-hidden="true">→</b>
            <span>SUT<small>{input.latencyMs}ms 점유</small></span>
            <b aria-hidden="true">→</b>
            <span>FEEDBACK<small>{input.model === 'closed' ? '처리율 감소' : '필요 VU 증가'}</small></span>
            <b aria-hidden="true">→</b>
            <span>OBSERVE<small>{input.model === 'closed' ? 'iterations/s' : 'dropped iterations'}</small></span>
          </div>
        </div>

        <div className="code-card">
          <div className="code-head"><span>GENERATED / options.js</span><span>k6 v2.0</span></div>
          <pre><code>{result.code}</code></pre>
        </div>
      </section>

      <section className="practice-section" id="practice" aria-labelledby="practice-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RUN THE REAL THING</p>
            <h2 id="practice-title">네 번의 실행으로 모델을 검증하세요.</h2>
          </div>
          <span className="local-only">LOCAL TARGET ONLY</span>
        </div>
        <ol className="practice-list">
          <li><span>01</span><div><strong>Smoke</strong><p>스크립트와 endpoint의 최소 정상 동작</p><code>pnpm docker:smoke</code></div></li>
          <li><span>02</span><div><strong>Ramping VUs</strong><p>closed model의 동시성 파형</p><code>pnpm docker:closed</code></div></li>
          <li><span>03</span><div><strong>Arrival rate</strong><p>고정 도착률과 VU 용량·누락</p><code>pnpm docker:open</code></div></li>
          <li><span>04</span><div><strong>Intentional fail</strong><p>기능은 정상, p95 threshold는 실패</p><code>pnpm docker:fail</code></div></li>
        </ol>
        <p className="practice-path">터미널 1에서 <code>cd practice/infra/k6 && pnpm target</code> 실행 후, 터미널 2에서 위 명령을 실행합니다.</p>
      </section>

      <footer className="source-footer">
        <div>
          <p className="eyebrow">SOURCE LEDGER</p>
          <h2>공식 근거에서 시작했습니다.</h2>
        </div>
        <ul>
          {sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}
        </ul>
        <p>Research checked 2026-07-15 · Visualization is educational, not a benchmark result.</p>
      </footer>
    </main>
  );
}
