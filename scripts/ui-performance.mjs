import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const root = resolve(process.argv[2] ?? 'dist'),
  output = resolve(process.argv[3] ?? 'test-results/ui-performance/current');
await mkdir(output, { recursive: true });
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const modules = [
  ...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.js)"/g)].map((m) => m[1])),
];
let initialBytes = 0;
for (const file of modules)
  initialBytes += gzipSync(await readFile(resolve(root, '.' + file))).length;
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: { code: 'UNAUTHENTICATED', message: 'Anonymous benchmark', retryable: false },
          meta: {},
        }),
      );
      return;
    }
    const path = resolve(root, '.' + (extname(pathname) ? pathname : '/index.html'));
    if (!path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(path),
      compressed =
        /\.(?:html|js|css|svg)$/.test(path) &&
        (req.headers['accept-encoding'] ?? '').includes('gzip');
    res.writeHead(200, {
      'content-type': types[extname(path)] ?? 'application/octet-stream',
      ...(compressed ? { 'content-encoding': 'gzip' } : {}),
    });
    res.end(compressed ? gzipSync(data) : data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const address = server.address(),
  url = 'http://127.0.0.1:' + address.port;
const browser = await chromium.launch();
const runs = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage(),
      cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1600000 / 8,
      uploadThroughput: 750000 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__lab = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__lab.lcp = e.startTime;
          window.__lab.lcpElement = e.element?.tagName;
          window.__lab.lcpClass = e.element?.className;
          window.__lab.lcpUrl = e.url;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__lab.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.locator('main h1').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    runs.push(
      await page.evaluate(() => ({
        ...window.__lab,
        resources: performance.getEntriesByType('resource').length,
        firstContentfulPaintMs:
          performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
        resourceTiming: performance.getEntriesByType('resource').map((entry) => ({
          name: entry.name.replace(location.origin, ''),
          startTime: entry.startTime,
          responseEnd: entry.responseEnd,
          transferSize: entry.transferSize,
          initiatorType: entry.initiatorType,
        })),
      })),
    );
    if (i === 0) {
      await page.screenshot({ path: resolve(output, 'home.png'), fullPage: true });
      await page.goto(url + '/login', { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('form').waitFor();
      await page.screenshot({ path: resolve(output, 'login.png'), fullPage: true });
    }
    await context.close();
  }
  const median = (key) => runs.map((r) => r[key]).sort((a, b) => a - b)[1];
  const result = {
    at: new Date().toISOString(),
    browser: browser.version(),
    mode: 'public logged-out production build; local static server; no real backend',
    configuration: {
      viewport: '1366x768',
      cpuSlowdown: 4,
      latencyMs: 150,
      downloadMbps: 1.6,
      uploadMbps: 0.75,
      coldCache: true,
      textCompression: 'gzip',
    },
    initialJsGzipKiB: initialBytes / 1024,
    runs,
    median: { lcpMs: median('lcp'), cls: median('cls') },
    pass: { js: initialBytes <= 190 * 1024, lcp: median('lcp') <= 2500, cls: median('cls') <= 0.1 },
  };
  await writeFile(resolve(output, 'metrics.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
