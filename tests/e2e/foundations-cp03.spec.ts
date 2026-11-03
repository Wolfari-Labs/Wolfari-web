import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1366, height: 520 },
  { width: 768, height: 1024 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
]) {
  test(`CP03 fields, recovery and accessibility ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/design-system.html');
    await page.evaluate(() => document.fonts.ready);
    const notes = page.getByLabel('Ghi chú minh họa', { exact: true });
    await notes.fill('Bản nháp nhiều dòng\nKhông gửi dữ liệu');
    await page.getByRole('button', { name: 'Hiện lỗi minh họa' }).click();
    await expect(notes).toHaveValue('Bản nháp nhiều dòng\nKhông gửi dữ liệu');
    await expect(notes).toHaveAttribute('aria-invalid', 'true');
    await expect(notes).toHaveAccessibleDescription(/Lỗi minh họa/);
    await notes.focus();
    await expect(notes).toHaveCSS('outline-style', 'solid');
    await expect(page.getByLabel('Textarea disabled')).toBeDisabled();
    await expect(page.getByLabel('Textarea disabled')).toHaveCSS('cursor', 'not-allowed');
    const readonly = page.getByLabel('Nội dung chỉ đọc');
    await readonly.focus();
    await page.keyboard.type('Không được thay đổi');
    await expect(readonly).toHaveValue('Giá trị có thể chọn và sao chép');
    await expect(readonly).toBeFocused();
    await page.getByRole('button', { name: 'Xóa lỗi minh họa' }).click();
    await expect(notes).not.toHaveAttribute('aria-invalid', 'true');
    await expect(notes).toHaveAccessibleDescription('Có thể nhập nhiều dòng; không gửi request.');
    const conflict = page.getByRole('alert').filter({ hasText: 'Dữ liệu đã thay đổi' });
    await conflict.getByText('Chi tiết hỗ trợ').click();
    await conflict.getByRole('button', { name: 'Tải lại', exact: true }).click();
    await expect(page.getByText('Số lần tải lại minh họa: 1', { exact: true })).toBeVisible();
    const denied = page.getByRole('alert').filter({ hasText: 'Bạn không có quyền truy cập' });
    await expect(denied.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Về trang chủ', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    const gridAxe = await new AxeBuilder({ page }).analyze();
    await info.attach('state-grid-axe.json', {
      body: JSON.stringify(gridAxe.violations, null, 2),
      contentType: 'application/json',
    });
    await writeFile(
      info.outputPath('state-grid-axe.json'),
      JSON.stringify(gridAxe.violations, null, 2),
    );
    // Soft assertion preserves the failure while exercising/capturing the remaining states.
    expect.soft(gridAxe.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath('state-grid.png'), fullPage: true });
    await page
      .locator('section[aria-labelledby="fields-title"]')
      .screenshot({ path: info.outputPath('fields.png') });
    await page
      .locator('section[aria-labelledby="buttons-title"]')
      .screenshot({ path: info.outputPath('buttons.png') });
  });

  test(`CP03 Auth required fields and invalid recovery ${viewport.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/register');
    const form = page.getByRole('form', { name: 'Biểu mẫu đăng ký' });
    const required = form.locator('input[required]');
    await expect(required).toHaveCount(5);
    await form.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByLabel('Họ và tên')).toBeFocused();
    await expect(page.getByLabel('Họ và tên')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Email', { exact: true })).toHaveAccessibleDescription(/.+/);
    expect((await new AxeBuilder({ page }).include('form').analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    await page.screenshot({ path: info.outputPath('auth-invalid.png'), fullPage: true });
  });
}

test('reduced motion removes shared button displacement but keeps state feedback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design-system.html');
  const button = page.getByRole('button', { name: 'Xem minh họa', exact: true });
  await button.hover();
  await expect(button).toHaveCSS('transform', 'none');
  await expect(button).toHaveCSS('background-color', 'rgb(243, 251, 255)');
  await page.mouse.down();
  await expect(button).toHaveCSS('transform', 'none');
  await page.mouse.up();
  // Focus-visible follows keyboard modality, not programmatic focus after a mouse click.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-style', 'solid');
  await page.getByRole('button', { name: 'Bật/tắt loading' }).click();
  await expect(page.getByRole('button', { name: 'Loading minh họa', exact: true })).toHaveAttribute(
    'aria-busy',
    'true',
  );
});

test('computed shared text, field error, focus and primary gradient contrast', async ({
  page,
}, info) => {
  await page.goto('/design-system.html');
  const ratios = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const rgb = (name: string) => {
      const hex = style.getPropertyValue(name).trim().replace('#', '');
      const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
      return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    };
    const luminance = (color: number[]) =>
      color
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i]!, 0);
    const contrast = (a: number[], b: number[]) => {
      const x = luminance(a),
        y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const white = [255, 255, 255];
    const start = rgb('--color-gradient-start'),
      end = rgb('--color-gradient-end');
    return {
      ink: contrast(rgb('--color-ink'), white),
      muted: contrast(rgb('--color-muted'), white),
      error: contrast(rgb('--color-field-error'), white),
      danger: contrast(rgb('--color-status-danger'), white),
      errorAlertOnPeach: contrast(rgb('--color-status-danger'), rgb('--ios-peach')),
      focus: contrast(rgb('--color-action-primary'), white),
      gradientMinimum: Math.min(
        ...Array.from({ length: 101 }, (_, i) =>
          contrast(
            start.map((value, channel) => value + ((end[channel]! - value) * i) / 100),
            white,
          ),
        ),
      ),
    };
  });
  await info.attach('contrast-ratios.json', {
    body: JSON.stringify(ratios, null, 2),
    contentType: 'application/json',
  });
  await writeFile(info.outputPath('contrast-ratios.json'), JSON.stringify(ratios, null, 2));
  for (const ratio of Object.values(ratios)) expect(ratio).toBeGreaterThanOrEqual(4.5);
});
