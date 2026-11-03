import { defineConfig } from '@playwright/test';
import gateway from './playwright.gateway.config';

// Run `corepack pnpm build` first; the default production data mode is Gateway.
// API traffic remains intercepted by the Gateway HTTP-mock test fixture.
export default defineConfig({
  ...gateway,
  outputDir: 'test-results/cp05-preview',
  use: { ...gateway.use, baseURL: 'http://127.0.0.1:5197' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5197 --strictPort',
    url: 'http://127.0.0.1:5197',
    reuseExistingServer: false,
  },
});
