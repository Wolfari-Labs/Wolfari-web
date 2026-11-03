// Uses the existing test suites against already-built local assets, with unchanged mocks.
import { chromium, defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const gateway = process.env.CP11_TEST_MODE === 'gateway';
const mode = gateway ? 'gateway' : 'fixture';
const port = gateway ? 5174 : 5173;
const runTag = process.env.CP11_RUN_TAG ?? 'built';
if (!/^[a-z0-9-]+$/.test(runTag)) throw new Error('Invalid CP11 run tag');
const build =
  process.env.CP11_BUILD_DIR ??
  (gateway ? '.local/cp11-production' : '.local/cp11-baseline-preview');
if (!/^\.local\/cp11-[a-z0-9-]+$/.test(build)) throw new Error('Expected a CP11 local build');

export default defineConfig({
  testDir: path.join(root, gateway ? 'tests/e2e-gateway' : 'tests/e2e'),
  outputDir: path.join(root, `.local/cp11-${runTag}-${mode}`),
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  workers: 2,
  reporter: [
    ['line'],
    ['json', { outputFile: path.join(root, `.local/cp11-${runTag}-${mode}.json`) }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(gateway ? { serviceWorkers: 'block' as const } : {}),
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --outDir ${build} --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: root,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
