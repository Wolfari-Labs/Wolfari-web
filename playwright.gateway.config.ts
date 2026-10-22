import { chromium, defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-gateway',
  outputDir: 'test-results/gateway',
  fullyParallel: true,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/gateway', open: 'never' }]],
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
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    env: { VITE_DATA_MODE: 'gateway' },
    reuseExistingServer: false,
  },
});
