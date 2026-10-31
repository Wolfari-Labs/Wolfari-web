import { chromium, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

test('CP03 native browser 200% zoom keeps fields, modal footer and focus reachable', async ({
  baseURL,
}, info) => {
  const extension = fileURLToPath(new URL('./native-zoom-extension', import.meta.url));
  // Playwright owns/removes the temporary profile outside Vite's watched workspace.
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
    await page.goto(`${baseURL}/design-system.html`);
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
    await info.attach('native-zoom.json', {
      body: JSON.stringify({ factor, before, after }),
      contentType: 'application/json',
    });
    await writeFile(
      info.outputPath('native-zoom.json'),
      JSON.stringify({ factor, before, after }, null, 2),
    );
    const notes = page.getByLabel('Ghi chú minh họa', { exact: true });
    await notes.fill('Readable at native 200%');
    await expect(notes).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const trigger = page.getByRole('button', { name: 'Mở popup lồng nhau' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Popup minh họa' });
    const confirm = dialog.getByRole('button', { name: 'Mở xác nhận' });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await confirm.click();
    const alert = page.getByRole('alertdialog');
    await expect(alert.getByRole('button', { name: 'Hủy' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(confirm).toBeFocused();
    await expect(dialog).toBeVisible();
    await expect(confirm).toBeInViewport();
    // Capture the actual browser surface without Playwright's CSS-pixel clip:
    // at native zoom the latter cropped the image despite passing DOM geometry.
    const capture = await context.newCDPSession(page);
    const overlayShot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await info.attach('native-zoom-overlay.png', {
      body: Buffer.from(overlayShot.data, 'base64'),
      contentType: 'image/png',
    });
    await writeFile(
      info.outputPath('native-zoom-overlay.png'),
      Buffer.from(overlayShot.data, 'base64'),
    );
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden');
    await page.goto(`${baseURL}/register`);
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByLabel('Họ và tên')).toBeFocused();
    await expect(page.getByLabel('Họ và tên')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const authShot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await info.attach('native-zoom-auth.png', {
      body: Buffer.from(authShot.data, 'base64'),
      contentType: 'image/png',
    });
    await writeFile(info.outputPath('native-zoom-auth.png'), Buffer.from(authShot.data, 'base64'));
    await capture.detach();
  } finally {
    await context.close();
  }
});
