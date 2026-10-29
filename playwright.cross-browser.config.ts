import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e-gateway',
  testMatch: ['plan.spec.ts', 'ui-upgrade.spec.ts'],
  outputDir: 'test-results/cross-browser',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    env: { VITE_DATA_MODE: 'gateway' },
    reuseExistingServer: false,
  },
});
