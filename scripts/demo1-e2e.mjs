import { fork, spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { initEnvironment, readEnv, apps, services, appEnvironment, databaseUrl } from '../../Wolfari-backend/scripts/config.mjs';
import { compose, infrastructureCheck } from '../../Wolfari-backend/scripts/infrastructure.mjs';
import { migrate, migrationFiles } from '../../Wolfari-backend/scripts/migrations.mjs';
import { createTestPortAllocator } from '../../Wolfari-backend/scripts/test-ports.mjs';
import { snapshot } from './demo1-snapshot.mjs';
import { redactArtifacts } from './demo1-redact-artifacts.mjs';

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..'), backend = resolve(web, '../Wolfari-backend');
const runId = new Date().toISOString().replace(/\D/g, '').slice(0,14) + '-' + randomBytes(4).toString('hex');
const project = 'wolfari-web-demo1-' + runId;
const directory = resolve(web, '.local/demo1', runId);
const artifactDir = resolve(web, 'test-results/demo1', runId);
const label = 'io.wolfari.demo1.run';
const port = createTestPortAllocator(), appValues = {}, children = new Map();
let infra, manifest, created = false, control, stopping = false;
const controlToken = randomBytes(32).toString('hex');
function childExit(child) { return new Promise((accept, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(Error('CHILD_EXIT_' + code))); }); }
async function run(file, args, env = {}) { const child = fork(file, args, { cwd: web, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore','inherit','inherit','ipc'] }); await childExit(child); }
async function buildBackend() {
  const child = spawn('corepack pnpm build', { cwd: backend, shell: true, windowsHide: true, stdio: 'inherit' }); await childExit(child);
}
async function waitFor(work, timeout = 90000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { if (await work()) return; } catch (e) { last = e; } await new Promise(r => setTimeout(r, 300)); }
  throw Error('READINESS_TIMEOUT' + (last?.code ? '_' + last.code : ''));
}
async function startApp(name) {
  if (children.has(name)) throw Error('ALREADY_RUNNING');
  const app = apps.find(a => a.name === name);
  const child = fork(resolve(backend, 'apps', name, 'dist/main.js'), [], { cwd: backend, env: appEnvironment(app, appValues[name]), windowsHide: true, stdio: ['ignore','pipe','pipe','ipc'] });
  // Do not persist raw app logs (they may contain payloads). Keep only a bounded diagnostic in memory.
  child.diagnostic = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', b => { child.diagnostic = (child.diagnostic + b).slice(-4000); });
  children.set(name, child);
  await waitFor(async () => {
    if (child.exitCode !== null) throw Error('SERVICE_EXIT_' + name);
    return (await fetch('http://127.0.0.1:' + appValues[name][app.portKey] + '/health/live', { signal: AbortSignal.timeout(1000) })).ok;
  });
}
async function stopApp(name) {
  const child = children.get(name); if (!child) return;
  if (child.exitCode === null && child.signalCode === null) {
    if (child.connected) child.send('shutdown'); else child.kill();
    try { await waitFor(() => child.exitCode !== null || child.signalCode !== null, 12000); }
    catch { child.kill(); await waitFor(() => child.exitCode !== null || child.signalCode !== null, 5000); }
  }
  children.delete(name);
}
const composeOptions = () => ({ project, envFile: resolve(directory, '.env'), overrides: [resolve(directory, 'compose.labels.json')] });
function verifyOwned() {
  if (!created || !project.startsWith('wolfari-web-demo1-') || manifest?.runId !== runId || manifest?.directory !== directory) throw Error('OWNERSHIP_MISMATCH');
  const ids = execFileSync('docker', ['ps','-aq','--filter','label=com.docker.compose.project=' + project], { encoding: 'utf8', windowsHide: true }).trim().split(/\s+/).filter(Boolean);
  if (ids.length) {
    const containers = JSON.parse(execFileSync('docker', ['inspect', ...ids], { encoding: 'utf8', windowsHide: true }));
    if (containers.some(c => c.Config.Labels?.[label] !== runId)) throw Error('CONTAINER_OWNERSHIP_MISMATCH');
  }
  for (const name of ['postgres_data','rabbitmq_data','minio_data']) {
    const volume = JSON.parse(execFileSync('docker', ['volume','inspect', project + '_' + name], { encoding: 'utf8', windowsHide: true }))[0];
    if (volume.Labels?.[label] !== runId || volume.Labels?.['com.docker.compose.project'] !== project) throw Error('VOLUME_OWNERSHIP_MISMATCH');
  }
}
async function cleanup() {
  if (stopping) return; stopping = true;
  if (control) await new Promise(r => control.close(r));
  for (const name of [...children.keys()].reverse()) await stopApp(name);
  if (created) {
    verifyOwned();
    await compose(infra, ['down', ...(process.argv.includes('--keep') ? [] : ['--volumes'])], composeOptions());
  }
}
async function main() {
  await mkdir(directory, { recursive: true }); await mkdir(artifactDir, { recursive: true });
  const ports = {}; for (const key of ['POSTGRES_PORT','RABBITMQ_PORT','RABBITMQ_MANAGEMENT_PORT','MINIO_API_PORT','MINIO_CONSOLE_PORT','MAILPIT_SMTP_PORT','MAILPIT_UI_PORT']) ports[key] = String(await port());
  const webPort = await port(), controlPort = await port();
  const httpPorts = {}; for (const app of apps) httpPorts[app.name] = String(await port());
  const grpc = {}; for (const service of ['IDENTITY','TRIP','FINANCE','AUTOMATION']) grpc[service] = String(await port());
  const webUrl = `http://localhost:${webPort}`, gatewayUrl = `http://127.0.0.1:${httpPorts['api-gateway']}`;
  const targets = Object.fromEntries(Object.entries(grpc).map(([s,p]) => [s + '_GRPC_TARGET', '127.0.0.1:' + p]));
  const overrides = Object.fromEntries(apps.map(app => [app.name, { NODE_ENV: 'development', WOLFARI_ISOLATED_ENV: '1', [app.portKey]: httpPorts[app.name], ...targets }]));
  Object.assign(overrides['api-gateway'], { WEB_ORIGIN: webUrl, GATEWAY_LOCAL_RATE_LIMIT_MULTIPLIER: '20', IDENTITY_HTTP_URL: 'http://127.0.0.1:' + httpPorts['identity-service'], TRIP_HTTP_URL: 'http://127.0.0.1:' + httpPorts['trip-workspace-service'], FINANCE_HTTP_URL: 'http://127.0.0.1:' + httpPorts['finance-service'], AUTOMATION_HTTP_URL: 'http://127.0.0.1:' + httpPorts['automation-service'] });
  Object.assign(overrides['identity-service'], { IDENTITY_GRPC_PORT: grpc.IDENTITY, IDENTITY_LINK_BASE_URL: webUrl, IDENTITY_VERIFY_LINK_PATH: '/verify-email', IDENTITY_RESET_LINK_PATH: '/reset-password' });
  Object.assign(overrides['trip-workspace-service'], { TRIP_GRPC_PORT: grpc.TRIP, TRIP_INVITATION_LINK_BASE_URL: webUrl, TRIP_OUTBOX_ENABLED: 'true', TRIP_MEMBERSHIP_LIFECYCLE_ENABLED: 'true' });
  Object.assign(overrides['finance-service'], { FINANCE_GRPC_PORT: grpc.FINANCE, MOMO_SANDBOX_MODE: 'disabled' });
  Object.assign(overrides['automation-service'], { AUTOMATION_GRPC_PORT: grpc.AUTOMATION, PRICE_WATCH_WORKER_ENABLED: 'false' });
  await initEnvironment(backend, { target: directory, rootOverrides: ports, appOverrides: overrides });
  infra = await readEnv(resolve(directory, '.env'));
  for (const app of apps) appValues[app.name] = await readEnv(resolve(directory, 'apps', app.name, '.env'));
  manifest = { runId, project, directory, webUrl, gatewayUrl, mailpitUrl: 'http://127.0.0.1:' + ports.MAILPIT_UI_PORT, controlUrl: 'http://127.0.0.1:' + controlPort, artifactDir, at: new Date().toISOString(), web: snapshot(web), backend: snapshot(backend) };
  await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(resolve(artifactDir, 'snapshot.json'), JSON.stringify(manifest, null, 2));
  const labels = { [label]: runId };
  await writeFile(resolve(directory, 'compose.labels.json'), JSON.stringify({ services: Object.fromEntries(['postgres','rabbitmq','minio','mailpit'].map(n => [n,{labels}])), volumes: Object.fromEntries(['postgres_data','rabbitmq_data','minio_data'].map(n => [n,{labels}])) }));
  await buildBackend();
  created = true;
  await compose(infra, ['up','-d','--wait','--wait-timeout','180'], composeOptions());
  verifyOwned(); await infrastructureCheck(infra);
  for (const service of services) await migrate(service, databaseUrl(infra, service), await migrationFiles(service));
  for (const app of apps.filter(a => a.name !== 'api-gateway')) await startApp(app.name);
  await startApp('api-gateway');
  control = createServer(async (req, res) => {
    if (req.method !== 'POST' || req.headers.authorization !== 'Bearer ' + controlToken) { res.writeHead(403).end(); return; }
    try {
      verifyOwned();
      const [action, target] = (req.url ?? '').slice(1).split('/');
      if (action === 'restart' && target === 'apps') {
        for (const app of [...apps].reverse()) await stopApp(app.name);
        for (const app of apps.filter(a => a.name !== 'api-gateway')) await startApp(app.name);
        await startApp('api-gateway');
      } else if (['stop','start'].includes(action) && apps.some(a => a.name === target)) {
        if (action === 'stop') await stopApp(target); else await startApp(target);
      } else if (['stop','start'].includes(action) && ['postgres','rabbitmq','minio'].includes(target)) {
        await compose(infra, [action, target], composeOptions());
      } else { res.writeHead(400).end(); return; }
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
    } catch { res.writeHead(500).end('{"ok":false}'); }
  });
  await new Promise(r => control.listen(controlPort, '127.0.0.1', r));
  // Pinned Playwright's failure prompt normally captures the DOM, even with trace off.
  // Suppress that snapshot so an open destination/password form never enters artifacts.
  const env = { PLAYWRIGHT_NO_COPY_PROMPT: '1', VITE_DATA_MODE: 'gateway', VITE_GATEWAY_PROXY_TARGET: gatewayUrl, WOLFARI_DEMO1_MANIFEST: resolve(directory, 'manifest.json'), WOLFARI_DEMO1_CONTROL_TOKEN: controlToken };
  await run(resolve(web, 'node_modules/vite/bin/vite.js'), ['build','--mode','demo','--outDir','dist-demo1'], env);
  for (const runtime of ['dev','preview']) await run(resolve(web, 'node_modules/@playwright/test/cli.js'), ['test','--config','playwright.demo1.config.ts'], { ...env, WOLFARI_DEMO1_RUNTIME: runtime });
  const finalSource = { at: new Date().toISOString(), web: snapshot(web), backend: snapshot(backend) };
  await writeFile(resolve(artifactDir, 'final-source.json'), JSON.stringify(finalSource, null, 2));
  if (finalSource.web.implementationSha256 !== manifest.web.implementationSha256 || finalSource.backend.treeSha256 !== manifest.backend.treeSha256) throw Error('SOURCE_CHANGED_DURING_RUN');
  console.log('PASS isolated browser acceptance dev + preview. Run: ' + runId);
}
try { await main(); }
catch (error) { console.error('FAIL demo1 harness: ' + (String(error.message).match(/^[A-Z_0-9]+$/)?.[0] ?? 'CHECK_TEST_RESULTS')); process.exitCode = 1; }
finally { try { await redactArtifacts(artifactDir); } finally { await cleanup(); } }
