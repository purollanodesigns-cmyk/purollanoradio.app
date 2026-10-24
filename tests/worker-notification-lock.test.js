import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireNotificationLock, releaseNotificationLock } from '../worker/worker.js';

const originalFetch = globalThis.fetch;

test('no reclama una notificación cuyo bloqueo aún está vigente', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ owner: 'other', expiresAt: Date.now() + 60_000 }), {
    status: 200, headers: { ETag: '"etag-1"', 'Content-Type': 'application/json' }
  });
  try {
    const lock = await acquireNotificationLock('https://db.example', 'token', 'n1');
    assert.equal(lock, null);
  } finally { globalThis.fetch = originalFetch; }
});

test('reclama una notificación libre con compare-and-set usando ETag', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (!options.method) return new Response('null', { status: 200, headers: { ETag: '"etag-free"' } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const lock = await acquireNotificationLock('https://db.example', 'token', 'n2');
    assert.ok(lock?.owner);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.headers['If-Match'], '"etag-free"');
    assert.equal(JSON.parse(calls[1].options.body).owner, lock.owner);
  } finally { globalThis.fetch = originalFetch; }
});

test('no considera adquirido el bloqueo si Firebase rechaza el ETag', async () => {
  globalThis.fetch = async (_url, options = {}) => !options.method
    ? new Response('null', { status: 200, headers: { ETag: '"etag-old"' } })
    : new Response('', { status: 412 });
  try {
    assert.equal(await acquireNotificationLock('https://db.example', 'token', 'n3'), null);
  } finally { globalThis.fetch = originalFetch; }
});

test('libera solo un bloqueo que pertenece a esta ejecución', async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options = {}) => {
    calls++;
    if (!options.method) return new Response(JSON.stringify({ owner: 'someone-else', expiresAt: Date.now() + 10_000 }), {
      status: 200, headers: { ETag: '"etag-current"', 'Content-Type': 'application/json' }
    });
    throw new Error('No debe escribir un bloqueo ajeno');
  };
  try {
    await releaseNotificationLock('https://db.example', 'token', 'n4', 'my-owner');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});
