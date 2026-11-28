import { test, expect } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';
test('Closing map or activity panel expands the itinerary', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(trip + '/plan');
  await expect(page.getByRole('navigation', { name: 'Đường dẫn' })).toHaveCount(0);
  await expect(page.locator('[data-region="trip-hero"]')).toBeVisible();
  const map = page.locator('[data-plan-day-map]');
  const timeline = page
    .getByRole('list', { name: 'Các hoạt động trong ngày' })
    .locator('xpath=ancestor::section[1]');
  const initialWidth = (await timeline.boundingBox())!.width;

  await map.getByRole('button', { name: 'Ẩn bản đồ' }).click();
  await expect(map).toHaveCount(0);
  await expect
    .poll(async () => (await timeline.boundingBox())!.width)
    .toBeGreaterThan(initialWidth + 100);
  await expect(page.getByRole('button', { name: 'Hiện bản đồ' })).toBeFocused();

  await page.getByRole('button', { name: 'Hiện bản đồ' }).click();
  await expect(map).toBeVisible();
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  const pool = page.getByRole('region', { name: 'Đã chọn · Chưa xếp lịch' });
  await pool.getByRole('button', { name: 'Đóng danh sách hoạt động' }).click();
  await expect(pool).toHaveCount(0);
  await expect(map).toHaveCount(0);
  await expect
    .poll(async () => (await timeline.boundingBox())!.width)
    .toBeGreaterThan(initialWidth + 100);
});

test('Fixture: shared workspace geometry and Figma itinerary surfaces', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(trip + '/plan');
  await expect(page.getByRole('heading', { name: 'Bán đảo Sơn Trà', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('timeline.png'), fullPage: true });
  const hero = page.locator('[data-region="trip-hero"]');
  const reference = (await hero.boundingBox())!;
  const list = page.getByRole('list', { name: 'Các hoạt động trong ngày' });
  const panel = list.locator('xpath=ancestor::section[1]');
  const card = list.locator('[data-timeline-card]').first();
  await info.attach('wide-geometry', {
    body: JSON.stringify({
      hero: reference,
      panel: await panel.boundingBox(),
      card: await card.boundingBox(),
    }),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  const pool = page.getByRole('region', { name: 'Đã chọn · Chưa xếp lịch' });
  await expect(pool).toBeVisible();
  await page.screenshot({ path: info.outputPath('pool.png'), fullPage: true });
  await info.attach('split-geometry', {
    body: JSON.stringify({
      pool: await pool.boundingBox(),
      timeline: await panel.boundingBox(),
      card: await card.boundingBox(),
    }),
    contentType: 'application/json',
  });
  await pool.getByRole('button', { name: 'Đóng danh sách hoạt động' }).click();
  for (const route of ['/map', '/settings']) {
    await page.goto(trip + route);
    await expect(hero).toBeVisible();
    const box = (await hero.boundingBox())!;
    for (const key of ['x', 'y', 'width'] as const)
      expect(Math.abs(box[key] - reference[key]), route + key).toBeLessThanOrEqual(2);
    expect(box.height).toBe(84);
  }
  expect(errors).toEqual([]);
});
