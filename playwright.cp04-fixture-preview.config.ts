import { defineConfig } from '@playwright/test';
import fixture from './playwright.config';

// CP04 built fixture coverage against the current preview build.
export default defineConfig({
  ...fixture,
  outputDir: 'test-results/cp04-fixture-preview',
  use: { ...fixture.use, baseURL: 'http://127.0.0.1:5195' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5195 --strictPort',
    url: 'http://127.0.0.1:5195',
    reuseExistingServer: false,
  },
});
