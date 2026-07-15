import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    intentional_failure: {
      executor: 'constant-vus',
      vus: 2,
      duration: '5s',
    },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    'http_req_duration{name:intentionally-slow}': ['p(95)<200'],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/slow?ms=350`, {
    tags: { name: 'intentionally-slow' },
  });
  check(response, { 'slow endpoint is functionally healthy': (result) => result.status === 200 });
}
