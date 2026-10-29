import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1366, height: 520 },
  { width: 820, height: 600 },
  { width: 768, height: 1024 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
]) {
  test(`shared foundation layout ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url());
    });
    await page.goto('/design-system.html');
    await expect(
      page.getByRole('heading', { name: 'Wolfari · Shared UI foundation' }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const controls = await page
      .locator('button:visible, input:visible, select:visible, a:visible')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            name: element.textContent ?? element.getAttribute('aria-label'),
            width: box.width,
            height: box.height,
          };
        }),
      );
    for (const control of controls) {
      expect(control.width, control.name ?? 'control').toBeGreaterThanOrEqual(44);
      expect(control.height, control.name ?? 'control').toBeGreaterThanOrEqual(44);
    }
    const button = page.getByRole('button', { name: 'Thao tác minh họa', exact: true });
    expect(Math.round((await button.boundingBox())!.height)).toBe(viewport.width <= 768 ? 48 : 44);
    await button.focus();
    await expect(button).toBeFocused();
    expect(await button.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      'solid',
    );
    const assets = await page.locator('img:visible').evaluateAll((elements) =>
      elements.map((element) => {
        const img = element as HTMLImageElement;
        const box = img.getBoundingClientRect();
        return {
          src: img.getAttribute('src'),
          loaded: img.complete && img.naturalWidth > 0,
          width: box.width,
          height: box.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
      }),
    );
    for (const asset of assets) {
      expect(asset.loaded).toBe(true);
      expect(asset.src).not.toContain('figma.com');
      if (asset.src?.includes('.svg') || asset.src?.startsWith('data:image/svg+xml')) {
        // Chromium rounds SVG natural dimensions (e.g. a 16.5px source to 17px).
        expect(Math.round(asset.width)).toBe(asset.naturalWidth);
        expect(Math.round(asset.height)).toBe(asset.naturalHeight);
      }
    }
    const field = page.getByRole('textbox', { name: 'Nội dung minh họa' });
    await field.fill('Bản nháp được giữ lại');
    await page.getByRole('button', { name: 'Hiện lỗi minh họa' }).click();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveValue('Bản nháp được giữ lại');
    await expect(field).toHaveAccessibleDescription(/Lỗi minh họa/);
    await page.getByLabel('Lựa chọn minh họa', { exact: true }).selectOption('other');
    await expect(page.getByLabel('Lựa chọn minh họa', { exact: true })).toHaveValue('other');
    await page.getByRole('button', { name: 'Bật/tắt loading' }).click();
    await expect(
      page.getByRole('button', { name: 'Loading minh họa', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Loading minh họa', exact: true }),
    ).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('button[aria-busy="true"] > span[aria-hidden]')).toHaveCSS(
      'animation-name',
      'none',
    );
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.locator('footer')).toBeInViewport();
    expect(
      await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
    ).toEqual({ local: 0, session: 0 });
    expect(apiCalls).toEqual([]);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('foundation.png'), fullPage: true });
  });
}

test('shared drawer keyboard, backdrop, scrolling and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 480 });
  await page.goto('/design-system.html');
  const trigger = page.getByRole('button', { name: 'Mở drawer minh họa' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng minh họa' });
  await expect(drawer).toBeVisible();
  const close = drawer.getByRole('button', { name: 'Đóng điều hướng minh họa' });
  await expect(close).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('button', { name: 'Mục minh họa 12', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await drawer.getByRole('button', { name: 'Mục minh họa 12', exact: true }).click();
  await expect(
    drawer.getByRole('button', { name: 'Mục minh họa 12', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  await trigger.click();
  await page.mouse.click(390, 120);
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('native Select keyboard and field focus survive errors', async ({ page }) => {
  await page.goto('/design-system.html');
  const select = page.getByLabel('Lựa chọn minh họa', { exact: true });
  await select.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('other');
  const input = page.getByRole('textbox', { name: 'Nội dung minh họa' });
  const icon = input.locator('..').locator('img');
  const restingAsset = await icon.getAttribute('src');
  await input.focus();
  await expect(input.locator('..')).toHaveCSS('outline-style', 'solid');
  // Vite may inline local SVGs; compare the sources instead of requiring a filename URL.
  await expect(icon).not.toHaveAttribute('src', restingAsset!);
  await page.keyboard.type('Draft');
  await page.getByRole('button', { name: 'Hiện lỗi minh họa' }).click();
  await expect(input).toHaveValue('Draft');
  await page.getByRole('button', { name: 'Xóa lỗi minh họa' }).click();
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
});

test('hover and pressed variants preserve focus, disabled controls and field errors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/design-system.html');
  const outline = page.getByRole('button', { name: 'Xem minh họa', exact: true });
  await outline.hover();
  await expect(outline).toHaveCSS('background-color', 'rgb(243, 251, 255)');
  const bounds = (await outline.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect(outline).toHaveCSS('transform', 'matrix(0.97, 0, 0, 0.97, 0, 0)');
  await page.mouse.up();
  const field = page.getByRole('textbox', { name: 'Nội dung minh họa' });
  await field.hover();
  await expect(field.locator('..')).toHaveCSS('--field-border', '#0089c7');
  await page.getByRole('button', { name: 'Hiện lỗi minh họa' }).click();
  await field.hover();
  await expect(field.locator('..')).toHaveCSS('--field-border', '#955c49');
  await expect(page.getByRole('button', { name: 'Disabled', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Select disabled')).toBeDisabled();
});
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test('nested popup restores focus and scroll with motion ' + reducedMotion, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 402, height: 520 });
    await page.goto('/design-system.html');
    const trigger = page.getByRole('button', { name: 'Mở popup lồng nhau' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Popup minh họa' });
    await dialog.getByRole('button', { name: 'Mở xác nhận' }).click();
    const alert = page.getByRole('alertdialog', { name: 'Xác nhận minh họa?' });
    await expect(alert.getByRole('button', { name: 'Hủy' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(alert.getByRole('button', { name: 'Xác nhận', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(alert).not.toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Mở xác nhận' })).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden');
  });
}
