import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, login, test as gatewayTest } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const test = gatewayTest.extend({
  page: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Gateway test baseURL is required');
    const extension = fileURLToPath(new URL('../e2e/native-zoom-extension/', import.meta.url));
    const context = await chromium.launchPersistentContext('', {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
      baseURL,
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

test('CP11 HTTP mock: Plan navigation and centered editor fit native Chrome 200% zoom', async ({
  page,
  gateway,
  baseURL,
}, info) => {
  test.setTimeout(90000);
  await mockPlan(page, gateway);
  await login(page);
  const context = page.context();
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
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
    if (tab?.id === undefined) throw new Error('Local Gateway tab not found');
    await browser.tabs.setZoom(tab.id, 2);
    return browser.tabs.getZoom(tab.id);
  }, new URL(baseURL!).origin);
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
  await page.goto(`/trips/${tripId}/plan`);
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
  await page.locator('summary[aria-label="Tùy chọn lịch trình"]').click();
  const create = page.getByRole('button', { name: 'Tạo hoạt động thủ công', exact: true });
  await create.focus();
  await create.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole('button', { name: 'Lưu', exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const capture = await context.newCDPSession(page);
  try {
    const shot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await writeFile(
      info.outputPath('plan-editor-native-zoom.png'),
      Buffer.from(shot.data, 'base64'),
    );
  } finally {
    await capture.detach();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(create).toBeFocused();
  expect(
    gateway.calls.filter(
      (call) => call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET',
    ),
  ).toEqual([]);
});
