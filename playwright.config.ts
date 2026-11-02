import { chromium, defineConfig } from '@playwright/test';
const built = process.env.PLAYWRIGHT_RUNTIME === 'preview';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: built ? 'test-results/fixture-preview' : 'test-results/fixture',
  reporter: [
    ['list'],
    ['json', { outputFile: `test-results/${built ? 'fixture-preview' : 'fixture'}/results.json` }],
  ],
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
    headless: true,
    reducedMotion: 'reduce',
  },
  ...(process.env.PLAYWRIGHT_EXTERNAL_SERVER
    ? {}
    : {
        webServer: {
          command: built
            ? 'node node_modules/vite/bin/vite.js preview --outDir test-results/build/fixture --host 127.0.0.1 --port 5173 --strictPort'
            : 'node node_modules/vite/bin/vite.js',
          url: 'http://127.0.0.1:5173',
          reuseExistingServer: false,
        },
      }),
});
