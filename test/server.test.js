'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
const url = (pathname) => `http://127.0.0.1:${server.address().port}${pathname}`;

test('serves browser app', async () => {
  const res = await fetch(url('/'));
  assert.equal(res.status, 200);
  assert.match(await res.text(), /TrailAtlas/);
});
test('serves app manifest', async () => {
  const res = await fetch(url('/manifest.webmanifest'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /manifest\+json/);
  assert.equal((await res.json()).short_name, 'TrailAtlas');
});
test('service worker is not cached', async () => {
  const res = await fetch(url('/sw.js'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /no-store/);
});
test('health API', async () => {
  const res = await fetch(url('/api/health'));
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.mode, 'local-first');
});
test('unknown API returns 404', async () => {
  assert.equal((await fetch(url('/api/unknown'))).status, 404);
});
