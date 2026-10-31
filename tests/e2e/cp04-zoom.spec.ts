import { chromium, expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('CP04 native browser 200% zoom keeps Shell, recovery and Profile reachable', async ({
  baseURL,
}, info) => {
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
    const tripPath = '/trips/11111111-1111-4111-8111-111111111111';
    await page.goto(`${baseURL}${tripPath}`);
    await expect(page.getByRole('button', { name: 'Thu gọn thanh điều hướng' })).toBeVisible();
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

    const menu = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
    await expect(menu).toBeVisible();
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' })).toBeFocused();
    const settings = drawer.getByRole('link', { name: 'Cài đặt', exact: true });
    await settings.scrollIntoViewIfNeeded();
    await expect(settings).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saveBrowserSurface('native-zoom-drawer.png');
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(menu).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden');

    await page.goto(`${baseURL}/forgot-password`);
    const email = page.getByLabel('Email', { exact: true });
    await email.focus();
    await expect(email).toBeFocused();
    const send = page.getByRole('button', { name: 'Gửi hướng dẫn' });
    await send.scrollIntoViewIfNeeded();
    await expect(send).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saveBrowserSurface('native-zoom-recovery.png');

    await page.goto(`${baseURL}/profile`);
    const name = page.getByLabel('Tên hiển thị');
    await name.focus();
    await expect(name).toBeFocused();
    const changePassword = page.getByRole('form', { name: 'Đổi mật khẩu' });
    await changePassword.getByRole('button', { name: 'Đổi mật khẩu' }).scrollIntoViewIfNeeded();
    await expect(changePassword.getByRole('button', { name: 'Đổi mật khẩu' })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saveBrowserSurface('native-zoom-profile.png');
    await capture.detach();
  } finally {
    await context.close();
  }
});
