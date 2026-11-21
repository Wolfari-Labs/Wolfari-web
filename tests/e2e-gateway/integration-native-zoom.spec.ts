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
test('HTTP mock: push and payment panels fit native 200% zoom with keyboard navigation', async ({
  page,
  gateway,
  baseURL,
}, info) => {
  const trip = '11111111-1111-4111-8111-111111111111',
    fund = '77777777-1111-4111-8111-111111111111';
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const respond = (data: unknown) => route.fulfill({ json: { data, meta: {} } });
    if (pathname === `/api/v1/trips/${trip}/fund`)
      return respond({
        id: fund,
        trip_id: trip,
        holder_user_id: gateway.profile.id,
        currency: 'VND',
        budget_amount: null,
        current_balance: '0',
        reserved_refund: '0',
        available_balance: '0',
        status: 'OPEN',
        finance_version: 1,
        closed_at: null,
      });
    if (pathname.endsWith('/destinations')) return respond([]);
    if (pathname.startsWith(`/api/v1/funds/${fund}/`))
      return respond({ items: [], next_cursor: null });
    return route.fallback();
  });
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
  const panel = page.getByRole('group', { name: 'Thông báo trên trình duyệt này' });
  await panel.scrollIntoViewIfNeeded();
  expect(
    (await new AxeBuilder({ page }).include('fieldset').withTags(['wcag2a', 'wcag2aa']).analyze())
      .violations,
  ).toEqual([]);
  const capture = await context.newCDPSession(page);
  const screenshot = async (name: string) => {
    const shot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await writeFile(info.outputPath(name), Buffer.from(shot.data, 'base64'));
  };
  await screenshot('push-200.png');
  await page.goto(`/trips/${trip}/fund`);
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'MoMo & đối soát', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'MoMo & đối soát', exact: true })).toBeFocused();
  await expect(page.getByText('Chưa có ngoại lệ thanh toán.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByText('Chưa có ngoại lệ thanh toán.').scrollIntoViewIfNeeded();
  await expect(page.getByText('Chưa có ngoại lệ thanh toán.')).toBeInViewport();
  await screenshot('payment-200.png');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Cài đặt quỹ nhóm', exact: true })).toHaveCount(0);
});
