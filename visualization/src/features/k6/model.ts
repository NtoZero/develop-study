export type WorkloadInput = {
  targetRate: number;
  latencyMs: number;
  closedVUs: number;
  maxVUs: number;
  thinkTimeMs: number;
};

export type WorkloadAnalysis = {
  closedRate: number;
  openRequiredVUs: number;
  openDeliveredRate: number;
  droppedPerSecond: number;
};

function round(value: number, digits = 1) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

export function analyzeWorkload(input: WorkloadInput): WorkloadAnalysis {
  const closedIterationSeconds = (input.latencyMs + input.thinkTimeMs) / 1000;
  const openIterationSeconds = input.latencyMs / 1000;
  const closedRate = input.closedVUs / Math.max(closedIterationSeconds, 0.001);
  const openRequiredVUs = Math.ceil(input.targetRate * openIterationSeconds);
  const openCapacity = input.maxVUs / Math.max(openIterationSeconds, 0.001);
  const openDeliveredRate = Math.min(input.targetRate, openCapacity);

  return {
    closedRate: round(closedRate),
    openRequiredVUs,
    openDeliveredRate: round(openDeliveredRate),
    droppedPerSecond: round(Math.max(0, input.targetRate - openDeliveredRate)),
  };
}

export type DistributionAnalysis = {
  samples: number[];
  average: number;
  p95: number;
  p99: number;
  passed: boolean;
};

export function analyzeDistribution(slowCount: number, thresholdMs = 400): DistributionAnalysis {
  const boundedSlowCount = Math.max(0, Math.min(20, Math.round(slowCount)));
  const fastCount = 100 - boundedSlowCount;
  const fast = Array.from({ length: fastCount }, (_, index) => 104 + (index % 7) * 5);
  const slow = Array.from({ length: boundedSlowCount }, (_, index) => 1450 + (index % 5) * 90);
  const samples = [...fast, ...slow].sort((left, right) => left - right);
  const percentile = (value: number) => samples[Math.max(0, Math.ceil((value / 100) * samples.length) - 1)];
  const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;

  return {
    samples,
    average: round(average),
    p95: percentile(95),
    p99: percentile(99),
    passed: percentile(95) < thresholdMs,
  };
}
