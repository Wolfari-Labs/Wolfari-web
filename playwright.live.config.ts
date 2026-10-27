import { chromium, defineConfig } from '@playwright/test';

const runtime = process.env.WOLFARI_LIVE_RUNTIME ?? 'preview';
if (!['dev', 'preview'].includes(runtime)) throw new Error('Invalid live runtime');
export default defineConfig({
  testDir: './tests/e2e-live', fullyParallel: false, workers: 1, retries: 0,
  timeout: 120000, expect: { timeout: 15000 },
  outputDir: `test-results/live-${runtime}`,
  reporter: [['list'], ['json', { outputFile: `test-results/live-${runtime}/results.json` }]],
  use: {
    baseURL: 'http://localhost:5273', headless: true, viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath() },
    serviceWorkers: 'block', reducedMotion: 'reduce',
    // Trace/HAR include tokens and passwords; no credential-bearing browser artifacts.
    trace: 'off', screenshot: 'off', video: 'off',
  },
  webServer: {
    command: `node scripts/demo.mjs ${runtime}`, url: 'http://localhost:5273',
    reuseExistingServer: false, timeout: 30000,
  },
});
