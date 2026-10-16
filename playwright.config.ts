import { chromium, defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
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
          command: 'node node_modules/vite/bin/vite.js',
          url: 'http://127.0.0.1:5173',
          reuseExistingServer: false,
        },
      }),
});
