import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { randomUUID } from 'node:crypto';
export function detail(id: string, srs: string[], module: string, smoke = false) {
  return { tag: smoke ? ['@smoke', '@P0'] : ['@P1'], annotation: [
    { type: 'TC', description: id }, { type: 'SRS', description: srs.join(',') }, { type: 'module', description: module },
  ] };
}
export function block(info: TestInfo, reason: string): never {
  info.annotations.push({ type: 'BLOCKED', description: reason });
  base.skip(true, reason);
  throw new Error('Unreachable');
}
export const test = base.extend<{ safety: void }>({
  safety: [async ({ request }, use, info) => {
    const url = process.env.WOLFARI_QA_WEB_URL;
    if (process.env.WOLFARI_QA_ENV !== 'TEST' || !url || process.env.WOLFARI_QA_ALLOW_ORIGIN !== new URL(url).origin || process.env.WOLFARI_QA_TEST_DATA_ONLY !== 'yes') {
      block(info, 'Chưa cấu hình TEST, URL, exact allowlisted origin và xác nhận dữ liệu TEST-only. Không gửi request.');
    }
    const parsed = new URL(url!);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') block(info, 'Base URL phải là origin không chứa credential/path/query.');
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) block(info, 'Remote TEST phải dùng HTTPS.');
    try {
      const response = await request.get('/api/v1/auth/csrf', { timeout: 5000, maxRedirects: 0 });
      if (response.status() >= 500) block(info, `Gateway TEST chưa sẵn sàng (${response.status()}).`);
      expect(response.ok(), 'Endpoint CSRF thật phải hoạt động, không nhận HTML fallback').toBeTruthy();
      expect(response.headers()['content-type']).toContain('application/json');
      const data = await response.json();
      expect(data.data).toBeTruthy();
    } catch (error) {
      if (error instanceof Error && /ECONNREFUSED|ENOTFOUND|Timeout|ECONNRESET/.test(error.message)) block(info, 'Không kết nối được Web/Gateway TEST.');
      throw error;
    }
    await use();
  }, { auto: true }],
});
export { expect };
export async function login(page: Page, info: TestInfo, role = 'OWNER', returnTo = '/profile') {
  const email = process.env[`WOLFARI_QA_${role}_EMAIL`];
  const password = process.env[`WOLFARI_QA_${role}_PASSWORD`];
  if (!email || !password) block(info, `Thiếu tài khoản TEST riêng cho ${role}.`);
  await page.goto('/login?returnTo=' + encodeURIComponent(returnTo));
  await expect(page.locator('[data-preview="auth-form"]')).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill(email!);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password!);
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(returnTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
}
export async function createTrip(page: Page, info: TestInfo) {
  await login(page, info);
  const name = `QA-${randomUUID()}`;
  await page.goto('/trips/new');
  await page.getByLabel('Tên chuyến đi').fill(name);
  const start = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Ngày đi').fill(start);
  await page.getByLabel('Ngày về').fill(start);
  const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/trips' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  expect(data).toMatchObject({ name, plan_edit_policy: 'OWNER_ONLY', current_membership: { role: 'OWNER' } });
  await page.getByRole('link', { name: 'Mở chuyến đi' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await info.attach('owned-trip.json', { body: JSON.stringify({ id: data.id, name, cleanup: 'Giữ dữ liệu TEST để đối chiếu; không xóa tự động ngoài phạm vi.' }), contentType: 'application/json' });
  return { id: data.id as string, name, path: `/trips/${data.id}` };
}
export async function activity(page: Page, name: string) {
  await page.getByRole('button', { name: 'Tạo hoạt động trên server' }).click();
  await page.getByLabel('Tên hoạt động', { exact: true }).fill(name);
  await page.getByLabel('Loại hoạt động', { exact: true }).fill('OTHER');
  await page.getByRole('button', { name: 'Lưu trên server' }).click();
  await expect(page.getByRole('listitem', { name, exact: true })).toBeVisible();
}
