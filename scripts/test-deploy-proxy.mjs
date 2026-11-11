// Real Caddy over loopback HTTP + stub upstream. Not a public HTTPS/browser acceptance test.
import { execFileSync, spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const binary = process.env.CADDY_BIN ?? 'caddy';
const scratch = await mkdtemp(join(tmpdir(), 'wolfari-proxy-check-'));
const upstream = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ path: request.url, ip: request.headers['x-real-ip'] }));
});
const listen = (server) => new Promise((done) => server.listen(0, '127.0.0.1', done));
let child;
try {
  await listen(upstream);
  const reservation = createServer();
  await listen(reservation);
  const port = reservation.address().port;
  await new Promise((done) => reservation.close(done));
  const config = JSON.parse(
    execFileSync(
      binary,
      ['adapt', '--config', resolve('deployment/Caddyfile'), '--adapter', 'caddyfile'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
  config.admin = { disabled: true };
  for (const server of Object.values(config.apps.http.servers)) {
    server.listen = [`127.0.0.1:${port}`];
    server.automatic_https = { disable: true };
  }
  function patch(value) {
    if (!value || typeof value !== 'object') return;
    if (value.handler === 'reverse_proxy')
      value.upstreams = [{ dial: `127.0.0.1:${upstream.address().port}` }];
    if (value.root === '/srv/wolfari/current/Wolfari-web/dist-deploy')
      value.root = resolve('dist-deploy');
    for (const item of Object.values(value)) patch(item);
  }
  patch(config);
  const file = join(scratch, 'caddy.json');
  await writeFile(file, JSON.stringify(config));
  child = spawn(binary, ['run', '--config', file], { stdio: 'ignore', windowsHide: true });
  let startupError;
  child.on('error', (error) => {
    startupError = error;
  });
  const get = (path) =>
    new Promise((done, reject) => {
      const request = httpRequest(
        `http://127.0.0.1:${port}${path}`,
        {
          headers: {
            Host: 'wolfari.thepiece.io.vn',
            'X-Real-IP': '203.0.113.7',
            'X-Forwarded-For': '203.0.113.8',
          },
          signal: AbortSignal.timeout(2000),
        },
        (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () =>
            done(new Response(Buffer.concat(chunks), { status: response.statusCode })),
          );
          response.on('error', reject);
        },
      );
      request.on('error', reject);
      request.end();
    });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (startupError) throw startupError;
    try {
      const response = await get('/');
      await response.body?.cancel();
      ready = true;
      break;
    } catch {
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  assert.ok(ready, 'Caddy did not start');
  const api = await get('/api/v1/probe?x=1');
  assert.equal(api.status, 200);
  assert.deepEqual(await api.json(), { path: '/api/v1/probe?x=1', ip: '127.0.0.1' });
  for (const path of [
    '/api',
    '/api/unknown',
    '/api/v1/auth/local/test',
    '/invitations/local/test',
    '/internal/test',
    '/health/ready',
    '/.env',
  ]) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.ok(!(await response.text()).includes('<!doctype html>'));
  }
  for (const path of ['/trips', '/verify-email', '/reset-password']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /<!doctype html>/i);
  }
  console.log(
    'PASS real Caddy loopback: API prefix/IP overwrite, 7 blocked routes, 3 SPA deep links. Public TLS/Backend/browser NOT tested.',
  );
} finally {
  if (child && child.exitCode === null) {
    const stopped = new Promise((done) => child.once('exit', done));
    child.kill();
    await stopped;
  }
  upstream.closeAllConnections();
  await new Promise((done) => upstream.close(done));
  await rm(scratch, { recursive: true, force: true });
}
