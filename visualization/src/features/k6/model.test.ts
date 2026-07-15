import { describe, expect, it } from 'vitest';
import { defaultInput, simulate } from './model';

describe('k6 learning simulation', () => {
  it('reduces closed-model throughput as response latency rises', () => {
    const fast = simulate({ ...defaultInput, model: 'closed', latencyMs: 100 });
    const slow = simulate({ ...defaultInput, model: 'closed', latencyMs: 900 });
    expect(slow.peakRate).toBeLessThan(fast.peakRate);
  });

  it('reports dropped iterations when open-model VU capacity is too small', () => {
    const result = simulate({ ...defaultInput, target: 100, latencyMs: 1_000, maxVUs: 5 });
    expect(result.dropped).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
  });

  it('passes a small healthy scenario', () => {
    const result = simulate({ ...defaultInput, target: 5, latencyMs: 100, maxVUs: 20 });
    expect(result.passed).toBe(true);
  });
});
