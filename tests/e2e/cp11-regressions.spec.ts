import { expect, test } from '@playwright/test';

for (const width of [402, 320]) {
  test(`CP11 fixture: register skip link appears only while focused at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.goto('/register');
    const form = page.getByRole('form', { name: 'Biểu mẫu đăng ký' });
    await expect(form).toBeVisible();
    const skip = page.getByRole('link', { name: 'Đến nội dung chính' });
    await expect
      .poll(() => skip.evaluate((link) => link.getBoundingClientRect().bottom))
      .toBeLessThanOrEqual(0);
    await skip.focus();
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await skip.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await expect
      .poll(() => skip.evaluate((link) => link.getBoundingClientRect().bottom))
      .toBeLessThanOrEqual(0);
    await form.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByLabel('Họ và tên')).toBeFocused();
    await expect
      .poll(() => skip.evaluate((link) => link.getBoundingClientRect().bottom))
      .toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
