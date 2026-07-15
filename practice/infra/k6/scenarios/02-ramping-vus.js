import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    closed_model: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 5 },
        { duration: '10s', target: 5 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '2s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:items}': ['p(95)<300'],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/items`, { tags: { name: 'items' } });
  check(response, { 'items status is 200': (result) => result.status === 200 });
  sleep(0.5);
}
