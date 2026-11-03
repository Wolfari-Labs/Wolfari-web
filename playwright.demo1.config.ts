import { chromium, defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(process.env.WOLFARI_DEMO1_MANIFEST!, 'utf8')) as { webUrl: string; gatewayUrl: string; artifactDir: string };
const runtime = process.env.WOLFARI_DEMO1_RUNTIME;
if (!['dev','preview'].includes(runtime ?? '')) throw Error('Run pnpm test:e2e:demo1');
const url = new URL(manifest.webUrl);
export default defineConfig({
  testDir: './tests/e2e-demo1', fullyParallel: false, workers: 1, retries: 0,
  timeout: 300000, expect: { timeout: 20000 },
  outputDir: `${manifest.artifactDir}/${runtime}`,
  reporter: [['list'], ['json', { outputFile: `${manifest.artifactDir}/${runtime}/results.json` }]],
  use: { baseURL: manifest.webUrl, headless: true, viewport: { width: 1440, height: 1000 },
    actionTimeout: 20000, navigationTimeout: 30000,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath() },
    serviceWorkers: 'block', reducedMotion: 'reduce', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: { command: `node node_modules/vite/bin/vite.js ${runtime === 'preview' ? 'preview --outDir dist-demo1' : ''} --mode demo --host localhost --port ${url.port} --strictPort`,
    url: manifest.webUrl, reuseExistingServer: false, timeout: 30000,
    env: { VITE_DATA_MODE: 'gateway', VITE_GATEWAY_PROXY_TARGET: manifest.gatewayUrl } },
});
