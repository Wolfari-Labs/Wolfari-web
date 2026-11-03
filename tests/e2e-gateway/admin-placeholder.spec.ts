import { test, expect, login } from './gateway-fixture';

for (const width of [1440, 402]) {
  test(`Gateway Admin role guard and truthful placeholder at Web ${width}`, async ({
    page,
    gateway,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: width === 1440 ? 800 : 874 });
    await login(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Chức năng quản trị chưa khả dụng' }),
    ).toHaveCount(0);

    gateway.profile.system_role = 'ADMIN';
    await page.reload();
    const placeholder = page.getByRole('status').filter({
      has: page.getByRole('heading', { name: 'Chức năng quản trị chưa khả dụng' }),
    });
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText(
      'Vai trò Admin không tự cấp quyền xem hoặc chỉnh sửa chuyến đi.',
    );
    await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath(`admin-placeholder-${width}.png`) });

    if (width === 402) await page.getByRole('button', { name: 'Mở điều hướng admin' }).click();
    const navigation = page
      .getByRole('navigation', { name: 'Điều hướng Admin' })
      .filter({ visible: true });
    await navigation.getByRole('button', { name: 'Tài khoản', exact: true }).press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Tài khoản' })).toBeVisible();
    await expect(placeholder).toBeVisible();
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page).toHaveURL('/admin');
    expect(gateway.calls.filter((call) => call.path.startsWith('/api/v1/admin'))).toEqual([]);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);

    gateway.profile.system_role = 'USER';
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeVisible();
    await expect(placeholder).toHaveCount(0);
  });
}
