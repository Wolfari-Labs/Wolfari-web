import { defineConfig } from '@playwright/test';
import fixture from './playwright.config';

// Run `corepack pnpm build:preview` first; these tests use built fixture data.
export default defineConfig({
  ...fixture,
  outputDir: 'test-results/cp05-fixture-preview',
  use: { ...fixture.use, baseURL: 'http://127.0.0.1:5196' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5196 --strictPort',
    url: 'http://127.0.0.1:5196',
    reuseExistingServer: false,
  },
});
