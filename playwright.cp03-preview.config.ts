import { defineConfig } from '@playwright/test';
import gateway from './playwright.gateway.config';

// CP03 built-production diagnosis: same HTTP mocks/assertions, no Vite module waterfall.
// Run `corepack pnpm build` first; the production default data mode is Gateway.
export default defineConfig({
  ...gateway,
  outputDir: 'test-results/cp03-preview',
  use: { ...gateway.use, baseURL: 'http://127.0.0.1:5194' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5194 --strictPort',
    url: 'http://127.0.0.1:5194',
    reuseExistingServer: false,
  },
});
