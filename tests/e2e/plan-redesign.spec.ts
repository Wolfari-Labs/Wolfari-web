import { test, expect } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';
test('Fixture: shared workspace geometry and Figma itinerary surfaces', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(trip + '/plan');
  await expect(page.getByRole('heading', { name: 'Bán đảo Sơn Trà', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('timeline.png'), fullPage: true });
  const hero = page.locator('[data-variant="landscape"][aria-label="Thông tin chuyến đi"]');
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
    for (const key of ['x', 'y', 'width', 'height'] as const)
      expect(Math.abs(box[key] - reference[key]), route + key).toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});
