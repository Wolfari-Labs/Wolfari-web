import { defineConfig } from '@playwright/test';
import fixture from './playwright.config';

// Build first: vite build --mode preview --outDir test-results/cp03-build-fixture
export default defineConfig({
  ...fixture,
  outputDir: 'test-results/cp03-fixture-preview',
  use: { ...fixture.use, baseURL: 'http://127.0.0.1:5193' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js preview --outDir test-results/cp03-build-fixture --host 127.0.0.1 --port 5193 --strictPort',
    url: 'http://127.0.0.1:5193',
    reuseExistingServer: false,
  },
});
