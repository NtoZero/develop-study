export type LoadModel = 'closed' | 'open';

export type SimulationInput = {
  model: LoadModel;
  target: number;
  latencyMs: number;
  errorRate: number;
  thresholdMs: number;
  maxVUs: number;
  durationSeconds: number;
};

export type TimelinePoint = {
  second: number;
  planned: number;
  actualRate: number;
  activeVUs: number;
  dropped: number;
  p95: number;
};

export type SimulationResult = {
  points: TimelinePoint[];
  peakRate: number;
  peakVUs: number;
  p95: number;
  errorRate: number;
  dropped: number;
  passed: boolean;
  reasons: string[];
  code: string;
};

function round(value: number, digits = 1) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function rampFactor(second: number, duration: number) {
  const ratio = second / duration;
  if (ratio < 0.2) return 0.25 + ratio * 3.75;
  if (ratio < 0.8) return 1;
  return Math.max(0, 1 - (ratio - 0.8) * 5);
}

export function simulate(input: SimulationInput): SimulationResult {
  const points: TimelinePoint[] = [];
  const thinkTimeMs = 500;

  for (let second = 0; second <= input.durationSeconds; second += 1) {
    const factor = rampFactor(second, input.durationSeconds);
    const planned = input.target * factor;

    if (input.model === 'closed') {
      const activeVUs = Math.ceil(planned);
      const actualRate = (activeVUs * 1000) / (input.latencyMs + thinkTimeMs);
      const pressure = activeVUs / Math.max(input.maxVUs, 1);
      const p95 = input.latencyMs * (1.12 + Math.max(0, pressure - 0.7) * 0.6) + 18;
      points.push({
        second,
        planned: round(planned),
        actualRate: round(actualRate),
        activeVUs,
        dropped: 0,
        p95: round(p95),
      });
    } else {
      const requiredVUs = Math.ceil((planned * (input.latencyMs + 35)) / 1000);
      const activeVUs = Math.min(input.maxVUs, requiredVUs);
      const capacityRate = (activeVUs * 1000) / (input.latencyMs + 35);
      const actualRate = Math.min(planned, capacityRate);
      const dropped = Math.max(0, planned - actualRate);
      const saturation = requiredVUs / Math.max(input.maxVUs, 1);
      const p95 = input.latencyMs * (1.12 + Math.max(0, saturation - 0.75) * 0.72) + 18;
      points.push({
        second,
        planned: round(planned),
        actualRate: round(actualRate),
        activeVUs,
        dropped: round(dropped),
        p95: round(p95),
      });
    }
  }

  const peakRate = Math.max(...points.map((point) => point.actualRate));
  const peakVUs = Math.max(...points.map((point) => point.activeVUs));
  const p95 = Math.max(...points.map((point) => point.p95));
  const dropped = round(points.reduce((sum, point) => sum + point.dropped, 0));
  const overloadErrors = dropped > 0 ? Math.min(5, (dropped / Math.max(input.target, 1)) * 0.2) : 0;
  const errorRate = round(input.errorRate + overloadErrors, 2);
  const reasons = [
    p95 >= input.thresholdMs ? `p95 ${round(p95)}ms가 기준 ${input.thresholdMs}ms 이상` : '',
    errorRate >= 1 ? `오류율 ${errorRate}%가 기준 1% 이상` : '',
    dropped > 0 ? `${dropped}개 iteration 시작 누락` : '',
  ].filter(Boolean);

  return {
    points,
    peakRate: round(peakRate),
    peakVUs,
    p95: round(p95),
    errorRate,
    dropped,
    passed: reasons.length === 0,
    reasons,
    code: buildOptions(input),
  };
}

export function buildOptions(input: SimulationInput) {
  const executor = input.model === 'closed' ? 'ramping-vus' : 'ramping-arrival-rate';
  const loadKey = input.model === 'closed' ? 'startVUs: 1,' : `startRate: ${Math.max(1, Math.round(input.target * 0.25))},\n      timeUnit: '1s',`;
  const capacity = input.model === 'closed'
    ? ''
    : `\n      preAllocatedVUs: ${Math.min(input.maxVUs, Math.ceil(input.maxVUs * 0.5))},\n      maxVUs: ${input.maxVUs},`;

  return `export const options = {
  scenarios: {
    learning_flow: {
      executor: '${executor}',
      ${loadKey}${capacity}
      stages: [
        { target: ${input.target}, duration: '${Math.round(input.durationSeconds * 0.2)}s' },
        { target: ${input.target}, duration: '${Math.round(input.durationSeconds * 0.6)}s' },
        { target: 0, duration: '${Math.round(input.durationSeconds * 0.2)}s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<${input.thresholdMs}'],${input.model === 'open' ? "\n    dropped_iterations: ['count==0']," : ''}
  },
};`;
}

export const defaultInput: SimulationInput = {
  model: 'open',
  target: 20,
  latencyMs: 250,
  errorRate: 0,
  thresholdMs: 500,
  maxVUs: 12,
  durationSeconds: 30,
};
