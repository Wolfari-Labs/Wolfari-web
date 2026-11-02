import { fork } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [mode, ...args] = process.argv.slice(2);
if (!['fixture', 'gateway'].includes(mode)) throw Error('Expected fixture or gateway');
const env = { ...process.env, VITE_DATA_MODE: mode, PLAYWRIGHT_RUNTIME: 'preview' };
function run(file, argv) {
  return new Promise((accept, reject) => {
    const child = fork(resolve(root, file), argv, {
      cwd: root,
      env,
      windowsHide: true,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0 ? accept() : reject(Error(`CHILD_EXIT_${code ?? signal}`)),
    );
  });
}
await run('node_modules/vite/bin/vite.js', [
  'build',
  '--mode',
  mode === 'fixture' ? 'preview' : 'production',
  '--outDir',
  `test-results/build/${mode}`,
]);
await run('node_modules/@playwright/test/cli.js', [
  'test',
  '--config',
  mode === 'fixture' ? 'playwright.config.ts' : 'playwright.gateway.config.ts',
  ...args,
]);
