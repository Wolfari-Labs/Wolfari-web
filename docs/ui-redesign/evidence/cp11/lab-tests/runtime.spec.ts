import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import { expect, login, test } from '../../../../../tests/e2e-gateway/gateway-fixture';
import { mockPlan } from '../../../../../tests/e2e-gateway/plan-fixture';

type Metrics = {
  lcp: number | null;
  cls: number;
  shifts: { value: number; at: number }[];
  events: { name: string; duration: number; delay: number }[];
};
const tripId = '11111111-1111-4111-8111-111111111111';
for (const width of [1440, 402]) {
  for (const route of ['home', 'auth', 'plan', 'fund'] as const) {
    test(`CP11 laboratory ${route} ${width}px five cold-asset samples`, async ({
      page,
      gateway,
      browser,
    }, info) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 874 });
      await mockPlan(page, gateway);
      if (route === 'plan' || route === 'fund') await login(page);
      const client = await page.context().newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.addInitScript(() => {
        const target = window as unknown as { __cp11Metrics: Metrics };
        const metrics: Metrics = { lcp: null, cls: 0, shifts: [], events: [] };
        target.__cp11Metrics = metrics;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        let sessionStart = 0,
          lastShift = 0,
          sessionValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (entry.hadRecentInput) continue;
            if (entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000) {
              sessionStart = entry.startTime;
              sessionValue = 0;
            }
            sessionValue += entry.value;
            lastShift = entry.startTime;
            metrics.cls = Math.max(metrics.cls, sessionValue);
            metrics.shifts.push({ value: entry.value, at: entry.startTime });
          }
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceEventTiming[]) {
            metrics.events.push({
              name: entry.name,
              duration: entry.duration,
              delay: entry.processingStart - entry.startTime,
            });
          }
        }).observe({
          type: 'event',
          buffered: true,
          durationThreshold: 16,
        } as PerformanceObserverInit);
      });
      const samples = [];
      const pathname =
        route === 'home' ? '/' : route === 'auth' ? '/login' : `/trips/${tripId}/${route}`;
      for (let sample = 1; sample <= 5; sample++) {
        await client.send('Network.clearBrowserCache');
        await page.goto(pathname);
        if (route === 'home') await expect(page.locator('[data-node-id="3:28"]')).toBeVisible();
        if (route === 'auth')
          await expect(page.getByRole('form', { name: 'Biểu mẫu đăng nhập' })).toBeVisible();
        if (route === 'plan')
          await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
        if (route === 'fund')
          await expect(page.getByRole('heading', { name: 'Chuyến đi chưa bật quỹ' })).toBeVisible();
        const readyMs = await page.evaluate(() => performance.now());
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images]
              .filter((image) => {
                const rect = image.getBoundingClientRect();
                return rect.bottom > 0 && rect.top < innerHeight;
              })
              .map((image) => image.decode().catch(() => {})),
          );
        });
        // Fixed observation window, not a readiness workaround or production p75 measurement.
        await page.waitForTimeout(1000);
        const metrics = await page.evaluate(() => {
          const current = (window as unknown as { __cp11Metrics: Metrics }).__cp11Metrics;
          const navigation = performance.getEntriesByType(
            'navigation',
          )[0] as PerformanceNavigationTiming;
          return {
            ...current,
            observedUntilMs: performance.now(),
            ttfbMs: navigation.responseStart - navigation.requestStart,
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            resources: (
              performance.getEntriesByType('resource') as PerformanceResourceTiming[]
            ).map((entry) => ({
              path: new URL(entry.name).pathname,
              type: entry.initiatorType,
              durationMs: entry.duration,
              transferBytes: entry.transferSize,
              encodedBytes: entry.encodedBodySize,
            })),
          };
        });
        expect(metrics.lcp, 'LCP observer must produce a sample').not.toBeNull();
        let interaction = null;
        if (route === 'plan') {
          await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.waitForTimeout(100); // Event Timing entries are delivered after paint.
          interaction = await page.evaluate(
            () => (window as unknown as { __cp11Metrics: Metrics }).__cp11Metrics.events,
          );
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).not.toBeVisible();
        }
        samples.push({ sample, readyMs, ...metrics, editorEventTiming: interaction });
      }
      await client.detach();
      expect(
        gateway.calls.filter(
          (call) => call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET',
        ),
      ).toEqual([]);
      await writeFile(
        info.outputPath('runtime-metrics.json'),
        JSON.stringify(
          {
            route,
            width,
            samples,
            environment: {
              browser: browser.version(),
              node: process.version,
              cpu: os.cpus()[0]?.model,
              platform: process.platform,
              cpuRate: 1,
              network: 'unthrottled localhost',
              reducedMotion: 'no-preference',
              cache: 'disabled and cleared before each target navigation',
            },
            limits: [
              'HTTP mocks only; authenticated bootstrap pre-established for Plan/Fund.',
              'One-second observation after fonts and visible image decode; late activity beyond cutoff not measured.',
              'Event Timing samples >=16ms are not page-lifetime INP; absent entries do not mean zero.',
              'No approved PERF01 SLA or production/real-device claim; no real network/provider latency.',
            ],
          },
          null,
          2,
        ),
      );
    });
  }
}
