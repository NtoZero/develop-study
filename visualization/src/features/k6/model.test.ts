import { describe, expect, it } from 'vitest';
import { analyzeDistribution, analyzeWorkload } from './model';

describe('k6 article figures', () => {
  it('shows closed throughput falling when latency rises', () => {
    const base = { targetRate: 60, closedVUs: 30, maxVUs: 80, thinkTimeMs: 500 };
    const fast = analyzeWorkload({ ...base, latencyMs: 100 });
    const slow = analyzeWorkload({ ...base, latencyMs: 1_000 });
    expect(slow.closedRate).toBeLessThan(fast.closedRate);
  });

  it('derives open-model VU demand with N = lambda W', () => {
    const result = analyzeWorkload({
      targetRate: 60,
      latencyMs: 1_500,
      closedVUs: 30,
      maxVUs: 50,
      thinkTimeMs: 500,
    });
    expect(result.openRequiredVUs).toBe(90);
    expect(result.droppedPerSecond).toBeGreaterThan(0);
  });

  it('exposes a slow tail that the average compresses', () => {
    const result = analyzeDistribution(5);
    expect(result.average).toBeLessThan(result.p99);
    expect(result.p95).toBeLessThan(400);
    expect(result.p99).toBeGreaterThan(400);
    expect(result.passed).toBe(true);
  });
});
