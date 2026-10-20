import { expect, test } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1366, height: 520 },
  { width: 820, height: 800 },
  { width: 768, height: 800 },
  { width: 402, height: 800 },
  { width: 320, height: 640 },
]) {
  test(`Create Trip preserves a retryable draft and fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (request.method() === 'POST') writes.push(request.url()); });
    await page.setViewportSize(viewport);
    await page.goto('/trips/new');
    await expect(page.locator('[data-flow="create-trip"]')).toBeVisible();
    await page.getByLabel('Tên chuyến đi').fill('Miền Trung');
    await page.getByLabel('Điểm đến chính').fill('Đà Nẵng');
    await page.getByLabel('Ngày đi').fill('2026-10-20');
    await page.getByLabel('Ngày về').fill('2026-10-20');
    if (viewport.width <= 768) await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
    await expect(page.getByText(/Dịch vụ tạo chuyến đi hiện chưa khả dụng/)).toBeVisible();
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => sessionStorage.getItem('wolfari:create-trip:v2'))).toContain('Miền Trung');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

for (const width of [1440, 402]) {
  test(`read-only workspace projections remain usable at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const externalMapRequests: string[] = [];
    page.on('request', (request) => {
      if (/maptiler|mapbox|openstreetmap|tile/i.test(request.url())) externalMapRequests.push(request.url());
    });
    await page.goto(`${trip}/dress-code`);
    await expect(page.locator('[data-flow="dress-code-read"]')).toContainText('Thoải mái và gọn nhẹ');
    await page.goto(`${trip}/packing`);
    await expect(page.locator('[data-flow="packing-read"]')).toContainText('Kem chống nắng');
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.goto(`${trip}/map`);
    await expect(page.locator('[data-flow="trip-map-read"]')).toContainText('Bản đồ nền chưa được cấu hình');
    await page.getByRole('button', { name: /Ngũ Hành Sơn/ }).click();
    if (width <= 768) {
      await expect(page.getByRole('complementary', { name: 'Chi tiết địa điểm' })).toContainText('Chưa có tọa độ hợp lệ');
    } else {
      await expect(page.getByRole('article', { name: 'Đang chọn Ngũ Hành Sơn' })).toBeVisible();
    }
    expect(externalMapRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
