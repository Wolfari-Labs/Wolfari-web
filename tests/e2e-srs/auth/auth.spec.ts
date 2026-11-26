import { test, expect, detail, login } from '../fixtures';

test('AUTH-001 Đăng nhập thật và hồ sơ tồn tại sau reload', detail('AUTH-001', ['FR-ID-02', 'FR-ID-04', 'AT-01'], 'DangNhap', true), async ({ page }, info) => {
  await login(page, info);
  const name = await page.getByLabel('Tên hiển thị', { exact: true }).inputValue();
  expect(name.trim()).not.toBe('');
  await page.reload();
  await expect(page.getByLabel('Tên hiển thị', { exact: true })).toHaveValue(name);
});
test('AUTH-002 Guest bị chặn dữ liệu hồ sơ và Trips', detail('AUTH-002', ['FR-ID-05', 'NFR-SEC-01', 'AT-01'], 'DangNhap', true), async ({ page, request }) => {
  await page.goto('/profile');
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên hiển thị', { exact: true })).toHaveCount(0);
  const response = await request.get('/api/v1/me');
  expect(response.status()).toBe(401);
  const trips = await request.get('/api/v1/trips');
  expect(trips.status()).toBe(401);
});
test('AUTH-003 Đăng xuất mất quyền truy cập phiên', detail('AUTH-003', ['FR-ID-03', 'AT-01'], 'DangNhap', true), async ({ page }, info) => {
  await login(page, info);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/profile');
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên hiển thị', { exact: true })).toHaveCount(0);
});
test('AUTH-004 Form rỗng không gửi đăng nhập', detail('AUTH-004', ['FR-ID-02', 'IR-UI-01'], 'DangNhap'), async ({ page }) => {
  await page.goto('/login');
  const calls: string[] = [];
  page.on('request', r => { if (r.url().endsWith('/auth/login')) calls.push(r.method()); });
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  expect(calls).toHaveLength(0);
});
test('PROFILE-001 Chỉ đọc hồ sơ của chính mình', detail('PROFILE-001', ['FR-ID-04'], 'HoSo'), async ({ page }, info) => {
  await login(page, info);
  await expect(page.getByLabel('Tên hiển thị', { exact: true })).not.toHaveValue('');
  await expect(page.getByLabel('Tên hiển thị', { exact: true })).toHaveAttribute('readonly');
  await expect(page.getByRole('button', { name: 'Chỉnh sửa tên hiển thị', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Tên hiển thị', { exact: true })).not.toHaveValue('');
});
