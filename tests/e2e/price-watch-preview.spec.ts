import { test, expect } from '@playwright/test';

const route = '/trips/11111111-1111-4111-8111-111111111111/price-watch';

for (const size of [
  { width: 1440, height: 800 },
  { width: 1366, height: 600 },
  { width: 1024, height: 600 },
  { width: 820, height: 600 },
  { width: 768, height: 600 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
]) {
  test(`Price Watch preview ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
    });
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Theo dõi giá vé' }).first()).toBeVisible();
    await expect(page.getByText('2.350.000đ', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Chỉ xem giá tham khảo/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
    await page.getByRole('button', { name: /Minh Anh/ }).click();
    await expect(page.getByText('Hà Nội → Đà Nẵng', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xóa theo dõi này' })).toBeEnabled();
    await page.screenshot({ path: info.outputPath('price-watch.png'), fullPage: true });
    expect(api).toEqual([]);
  });
}

test('Price Watch preserves an old price when provider fails and keeps commands truthful', async ({ page }) => {
  await page.goto(route);
  await page.locator('[data-preview="price-watch"] summary').click();
  const scenario = page.locator('[data-preview="price-watch"] select');
  await scenario.selectOption('provider-error');
  await expect(page.getByText(/giữ lại giá gần nhất/i)).toBeVisible();
  await expect(page.getByText('2.350.000đ', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạm dừng' })).toBeEnabled();
  await page.getByText(/Xem dữ liệu lịch sử/).click();
  await expect(page.getByRole('cell', { name: 'Chưa có giá' })).toBeVisible();
  for (const [value, heading] of [
    ['empty', 'Chưa có nội dung'],
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
  ] as const) {
    await scenario.selectOption(value);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
});

test('Price Watch capability controls explain that preview actions do not mutate data', async ({ page }) => {
  await page.goto(route);
  const actions = page.getByLabel('Thao tác theo dõi');
  await actions.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await expect(actions.getByRole('status')).toContainText('Chưa gửi yêu cầu');
  await expect(page.getByText(/API chỉnh sửa chưa khả dụng/)).toBeVisible();
});
