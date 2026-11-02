import { chromium, defineConfig } from '@playwright/test';
const built = process.env.PLAYWRIGHT_RUNTIME === 'preview';

export default defineConfig({
  testDir: './tests/e2e-gateway',
  outputDir: built ? 'test-results/gateway-preview' : 'test-results/gateway',
  fullyParallel: true,
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: `test-results/${built ? 'gateway-preview' : 'gateway'}/results.json` }],
    [
      'html',
      { outputFolder: `playwright-report/${built ? 'gateway-preview' : 'gateway'}`, open: 'never' },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: built
      ? 'node node_modules/vite/bin/vite.js preview --outDir test-results/build/gateway --host 127.0.0.1 --port 5174 --strictPort'
      : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    env: { VITE_DATA_MODE: 'gateway' },
    reuseExistingServer: false,
  },
});
