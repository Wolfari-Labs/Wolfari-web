import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
if (!process.env.WOLFARI_QA_RUN) throw new Error('Run via node scripts/qa-run.mjs smoke|full');
const run = JSON.parse(readFileSync(process.env.WOLFARI_QA_RUN, 'utf8')) as { directory: string };
export default defineConfig({
  testDir: './tests/e2e-srs', fullyParallel: true, workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI, retries: 0, timeout: 60000, expect: { timeout: 10000 },
  outputDir: join(run.directory, 'raw-artifacts'),
  reporter: [['list'], ['./tests/qa/vietnamese-reporter.mjs'], ['html', { outputFolder: join(run.directory, 'playwright-html'), open: 'never' }], ['junit', { outputFile: join(run.directory, 'junit.xml') }]],
  use: { baseURL: process.env.WOLFARI_QA_WEB_URL || 'http://127.0.0.1:1',
    serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure',
    locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'chromium-tablet', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'chromium-mobile-web', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
  ],
});
