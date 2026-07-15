import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    open_model: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 10,
      maxVUs: 40,
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    dropped_iterations: ['count==0'],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/slow?ms=250`, { tags: { name: 'slow-items' } });
  check(response, { 'slow endpoint status is 200': (result) => result.status === 200 });
}
