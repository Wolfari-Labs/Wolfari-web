import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fork } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(root, '../Wolfari-backend');
const config = JSON.parse(await readFile(resolve(backend, '.local/demo/public.json'), 'utf8'));
if (config.project !== 'wolfari-demo' || config.backendRoot !== backend || config.webUrl !== 'http://localhost:5273' || config.gatewayUrl !== 'http://127.0.0.1:13000') throw new Error('Invalid demo manifest; run Backend demo:init.');
const command = process.argv[2];
if (!['dev', 'build', 'preview', 'test'].includes(command) || process.argv.length !== 3) throw new Error('Use demo:dev, demo:build, demo:preview or test:e2e:live');
const env = { ...process.env, VITE_DATA_MODE: 'gateway', VITE_GATEWAY_PROXY_TARGET: config.gatewayUrl };
delete env.NODE_OPTIONS;
delete env.NODE_ENV;
function run(file, args, extra = {}) {
  const child = fork(resolve(root, file), args, { cwd: root, env: { ...env, ...extra }, windowsHide: true, stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
  return child;
}
function finished(child) { return new Promise((accept, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(new Error(`Demo subprocess failed: ${code}`))); }); }
const buildArgs = ['build', '--mode', 'demo', '--outDir', 'dist-demo'];
if (command === 'build') await finished(run('node_modules/vite/bin/vite.js', buildArgs));
else if (command === 'test') {
  const health = await fetch(config.gatewayUrl + '/health/ready');
  if (!health.ok) throw new Error('Start and seed Backend demo first.');
  await finished(run('node_modules/vite/bin/vite.js', buildArgs));
  for (const runtime of ['dev', 'preview']) await finished(run('node_modules/@playwright/test/cli.js', ['test', '--config', 'playwright.live.config.ts'], { WOLFARI_LIVE_RUNTIME: runtime }));
} else {
  const { loadManifest } = await import(pathToFileURL(resolve(backend, 'scripts/demo-config.mjs')).href);
  const { serveControl } = await import(pathToFileURL(resolve(backend, 'scripts/demo-control.mjs')).href);
  const manifest = await loadManifest();
  let child;
  let stopping = false;
  const stop = async () => {
    stopping = true;
    control.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(accept => child.once('exit', accept));
      child.kill();
      await exited;
    }
  };
  const control = await serveControl(manifest, 'web', stop);
  process.on('SIGINT', () => { void stop(); }); process.on('SIGTERM', () => { void stop(); });
  child = run('node_modules/vite/bin/vite.js', [ ...(command === 'preview' ? ['preview', '--outDir', 'dist-demo'] : []), '--mode', 'demo', '--host', 'localhost', '--port', '5273', '--strictPort' ]);
  try { await finished(child); }
  catch (error) { if (!stopping) throw error; }
  finally { control.close(); }
}
