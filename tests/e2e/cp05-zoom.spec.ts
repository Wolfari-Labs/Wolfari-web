import { chromium, expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tripId = '11111111-1111-4111-8111-111111111111';

test('CP05 native browser 200% zoom keeps Trip Web routes usable', async ({ baseURL }, info) => {
  test.setTimeout(90000);
  const extension = fileURLToPath(new URL('./native-zoom-extension', import.meta.url));
  const context = await chromium.launchPersistentContext('', {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    headless: true,
    viewport: null,
    reducedMotion: 'reduce',
    args: [
      '--window-size=1440,900',
      `--disable-extensions-except=${path.resolve(extension)}`,
      `--load-extension=${path.resolve(extension)}`,
    ],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${baseURL}/trips`);
    await expect(page.getByRole('heading', { name: 'Chuyến đi của tôi', level: 1 })).toBeVisible();
    const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
    const factor = await worker.evaluate(async (origin) => {
      const browser = (
        globalThis as unknown as {
          chrome: {
            tabs: {
              query(query: { url: string }): Promise<{ id?: number }[]>;
              setZoom(id: number, factor: number): Promise<void>;
              getZoom(id: number): Promise<number>;
            };
          };
        }
      ).chrome;
      const [tab] = await browser.tabs.query({ url: `${origin}/*` });
      if (tab?.id === undefined) throw new Error('Local test tab not found');
      await browser.tabs.setZoom(tab.id, 2);
      return browser.tabs.getZoom(tab.id);
    }, baseURL!);
    expect(factor).toBe(2);
    await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(before.dpr * 2);
    const after = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
      cssZoom: getComputedStyle(document.documentElement).zoom,
    }));
    expect(Math.abs(after.width * 2 - before.width)).toBeLessThanOrEqual(2);
    expect(after.cssZoom).toBe('1');
    await writeFile(
      info.outputPath('native-zoom.json'),
      JSON.stringify({ factor, before, after }, null, 2),
    );

    const capture = await context.newCDPSession(page);
    const saveBrowserSurface = async (name: string) => {
      const shot = await capture.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const bytes = Buffer.from(shot.data, 'base64');
      await info.attach(name, { body: bytes, contentType: 'image/png' });
      await writeFile(info.outputPath(name), bytes);
    };
    const routes = [
      { key: 'list', path: '/trips', selector: '[aria-label="Danh sách chuyến đi"]' },
      { key: 'create', path: '/trips/new', selector: '[data-flow="create-trip"]' },
      { key: 'overview', path: `/trips/${tripId}`, selector: '[data-flow="trip-overview"]' },
      {
        key: 'settings',
        path: `/trips/${tripId}/settings`,
        selector: '[data-flow="trip-settings"]',
      },
    ] as const;
    for (const route of routes) {
      await page.goto(`${baseURL}${route.path}`);
      await expect(page.locator(route.selector)).toBeVisible();
      if (route.key === 'list') await expect(page.locator('article[data-trip-id]')).toHaveCount(6);
      if (route.key === 'overview')
        await expect(page.getByRole('region', { name: 'Thông tin chuyến đi' })).toBeVisible();
      if (route.key === 'settings')
        await expect(
          page.getByRole('heading', { name: 'Thông tin chuyến đi', exact: true }),
        ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (route.key === 'create') {
        const name = page.getByLabel('Tên chuyến đi');
        await name.focus();
        await expect(name).toBeFocused();
      }
      if (route.key === 'settings') {
        const edit = page.getByRole('button', { name: 'Chỉnh sửa thông tin' });
        await edit.scrollIntoViewIfNeeded();
        await expect(edit).toBeInViewport();
      }
      await saveBrowserSurface(`native-zoom-${route.key}.png`);
    }
    await capture.detach();
  } finally {
    await context.close();
  }
});
