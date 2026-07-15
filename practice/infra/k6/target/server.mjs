import { createServer } from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT ?? 3001);
let requestSequence = 0;

function json(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  requestSequence += 1;

  if (url.pathname === '/health') {
    json(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/items') {
    json(response, 200, {
      items: [
        { id: 1, name: 'closed model' },
        { id: 2, name: 'open model' },
      ],
    });
    return;
  }

  if (url.pathname === '/slow') {
    const delayMs = boundedNumber(url.searchParams.get('ms'), 250, 0, 5_000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    json(response, 200, { delayedByMs: delayMs });
    return;
  }

  if (url.pathname === '/unstable') {
    const failureRate = boundedNumber(url.searchParams.get('rate'), 0.1, 0, 1);
    const bucket = requestSequence % 100;
    const shouldFail = bucket < Math.round(failureRate * 100);
    json(
      response,
      shouldFail ? 503 : 200,
      shouldFail
        ? { error: 'deterministic learning failure', sequence: requestSequence }
        : { status: 'ok', sequence: requestSequence },
    );
    return;
  }

  json(response, 404, { error: 'not found', path: url.pathname });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`k6 learning target: http://localhost:${port}`);
});

function shutdown(signal) {
  console.log(`received ${signal}; closing target server`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
