import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/worker.js';

const allowedOrigin = 'https://purollanoradioapp.vercel.app';

function request(path, { method = 'POST', origin = allowedOrigin, contentType = 'application/json', body = '{}' } = {}) {
  const headers = new Headers();
  if (origin !== null) headers.set('Origin', origin);
  if (contentType !== null) headers.set('Content-Type', contentType);
  return new Request(`https://worker.example${path}`, { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : body });
}

async function json(response) {
  return response.json();
}

test('OPTIONS de /visits responde preflight solo para origen permitido', async () => {
  const response = await worker.fetch(request('/visits', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
});


test('CORS de staging puede configurarse sin autorizar el origen de producción', async () => {
  const stagingOrigin = 'https://staging.example.test';
  const response = await worker.fetch(request('/visits', { method: 'OPTIONS', origin: stagingOrigin }), {
    CHAT_ALLOWED_ORIGINS: stagingOrigin
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), stagingOrigin);

  const productionOrigin = await worker.fetch(request('/visits', { method: 'OPTIONS', origin: allowedOrigin }), {
    CHAT_ALLOWED_ORIGINS: stagingOrigin
  });
  assert.equal(productionOrigin.status, 403);
});

test('CORS mantiene el origen de producción si no se configura variable', async () => {
  const response = await worker.fetch(request('/visits', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
});

test('OPTIONS de /visits rechaza origen no permitido', async () => {
  const response = await worker.fetch(request('/visits', { method: 'OPTIONS', origin: 'https://evil.example' }), {});
  assert.equal(response.status, 403);
});

test('GET /visits no permite cambiar contadores', async () => {
  const response = await worker.fetch(request('/visits', { method: 'GET' }), {});
  assert.equal(response.status, 405);
  assert.match(response.headers.get('Allow') || '', /POST/);
});

test('POST /visits rechaza origen no permitido', async () => {
  const response = await worker.fetch(request('/visits', { origin: 'https://evil.example' }), {});
  assert.equal(response.status, 403);
});

test('POST /visits exige JSON', async () => {
  const response = await worker.fetch(request('/visits', { contentType: 'text/plain' }), {});
  assert.equal(response.status, 415);
});

test('POST /visits no acepta campos del cliente', async () => {
  const response = await worker.fetch(request('/visits', { body: '{"total":999999}' }), {});
  assert.equal(response.status, 400);
});

test('POST /visits falla de forma segura si falta VISIT_HASH_SECRET', async () => {
  const response = await worker.fetch(request('/visits'), {
    VISIT_HASH_SECRET: '',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_CLIENT_EMAIL: 'test@example.invalid',
    FIREBASE_PRIVATE_KEY: 'not-used'
  });
  assert.equal(response.status, 503);
  assert.equal((await json(response)).ok, undefined);
});


test('POST /visits falla cerrado si falta FIREBASE_DATABASE_URL (sin usar producción como fallback)', async () => {
  const response = await worker.fetch(request('/visits'), {
    VISIT_HASH_SECRET: 'x'.repeat(40),
    FIREBASE_PROJECT_ID: 'staging-test-project',
    FIREBASE_CLIENT_EMAIL: 'test@example.invalid',
    FIREBASE_PRIVATE_KEY: 'not-used'
  });
  assert.equal(response.status, 500);
  assert.equal((await json(response)).ok, undefined);
});

test('POST /visits rechaza URL de Firebase no HTTPS o no reconocida', async () => {
  const response = await worker.fetch(request('/visits'), {
    VISIT_HASH_SECRET: 'x'.repeat(40),
    FIREBASE_DATABASE_URL: 'http://example.invalid',
    FIREBASE_PROJECT_ID: 'staging-test-project',
    FIREBASE_CLIENT_EMAIL: 'test@example.invalid',
    FIREBASE_PRIVATE_KEY: 'not-used'
  });
  assert.equal(response.status, 500);
  assert.equal((await json(response)).ok, undefined);
});
