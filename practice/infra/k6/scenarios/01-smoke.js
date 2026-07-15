import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '15s',
    },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/items`, { tags: { name: 'items' } });
  check(response, {
    'items status is 200': (result) => result.status === 200,
    'two learning items exist': (result) => result.json('items').length === 2,
  });
  sleep(0.1);
}
