import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, login, test as gatewayTest } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const invitationToken = `inv1_${'a'.repeat(43)}`;

// Reuse the CP07 native Chrome extension; CSS zoom does not exercise browser reflow.
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

test('CP08 Members, invitations, policy and recipient fit native Chrome 200% zoom', async ({
  page,
  gateway,
  baseURL,
}, info) => {
  test.setTimeout(90000);
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

  const capture = await context.newCDPSession(page);
  const checkAndCapture = async (name: string) => {
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const shot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const bytes = Buffer.from(shot.data, 'base64');
    await info.attach(name, { body: bytes, contentType: 'image/png' });
    await writeFile(info.outputPath(name), bytes);
  };
  try {
    await page.goto(`/trips/${tripId}/members`);
    await expect(page.getByRole('region', { name: 'Danh sách thành viên' })).toBeVisible();
    const includeLeft = page.getByRole('checkbox', { name: 'Hiển thị người đã rời' });
    await includeLeft.focus();
    await page.keyboard.press('Space');
    await expect(includeLeft).toBeChecked();
    await checkAndCapture('native-zoom-members.png');

    const invitations = page.getByRole('button', { name: 'Lời mời', exact: true });
    await invitations.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Mời thành viên' })).toBeVisible();
    await checkAndCapture('native-zoom-invitations.png');

    const policy = page.getByRole('button', { name: 'Quyền sửa lịch trình', exact: true });
    await policy.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Quyền sửa lịch trình' })).toBeVisible();
    const allMembers = page.getByRole('radio', { name: 'Mọi thành viên đang hoạt động' });
    await allMembers.focus();
    await page.keyboard.press('Space');
    await expect(allMembers).toBeChecked();
    await checkAndCapture('native-zoom-policy.png');

    await page.goto(`/invitations#token=${invitationToken}`);
    await expect(page).toHaveURL(/\/invitations$/);
    const accept = page.getByRole('button', { name: 'Chấp nhận', exact: true });
    await expect(accept).toBeVisible();
    await accept.focus();
    await expect(accept).toBeFocused();
    await checkAndCapture('native-zoom-recipient.png');

    expect(
      gateway.calls.filter(
        (call) =>
          (call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET') ||
          call.path === '/api/v1/invitations/accept' ||
          call.path === '/api/v1/invitations/decline',
      ),
    ).toEqual([]);
  } finally {
    await capture.detach();
  }
});
