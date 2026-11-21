import { chromium } from '@playwright/test';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { test as gatewayTest, expect, login } from './gateway-fixture';
const test = gatewayTest.extend({
  page: async ({ baseURL }, use) => {
    const extension = fileURLToPath(new URL('../e2e/native-zoom-extension/', import.meta.url));
    const context = await chromium.launchPersistentContext('', {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
      ...(baseURL ? { baseURL } : {}),
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
      await use(context.pages()[0] ?? (await context.newPage()));
    } finally {
      await context.close();
    }
  },
});
import { install, tripId } from './packing-fixture';
test('Packing editor fits native 200% zoom with keyboard and scroll access', async ({
  page,
  gateway,
  baseURL,
}, info) => {
  await install(page, gateway);
  await login(page);
  const context = page.context();
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
  const zoom = await worker.evaluate(async (origin) => {
    const chrome = (
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
    const [tab] = await chrome.tabs.query({ url: `${origin}/*` });
    if (tab?.id === undefined) throw Error('No test tab');
    await chrome.tabs.setZoom(tab.id, 2);
    return chrome.tabs.getZoom(tab.id);
  }, new URL(baseURL!).origin);
  expect(zoom).toBe(2);
  await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(before.dpr * 2);
  await expect
    .poll(() => page.evaluate(() => innerWidth))
    .toBeLessThanOrEqual(Math.ceil(before.width / 2));
  await page.goto(`/trips/${tripId}/packing`);
  await page.getByRole('button', { name: 'Thêm vật dụng', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm vật dụng' });
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole('button', { name: 'Thêm vào danh sách' });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  const capture = await context.newCDPSession(page);
  const screenshot = async (name: string) => {
    const shot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await writeFile(info.outputPath(name), Buffer.from(shot.data, 'base64'));
  };
  await screenshot('packing-200.png');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm vật dụng', exact: true })).toBeFocused();
});
