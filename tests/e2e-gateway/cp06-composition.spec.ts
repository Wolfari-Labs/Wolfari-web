import AxeBuilder from '@axe-core/playwright';
import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const locationIds = [
  '66666666-1111-4111-8111-111111111111',
  '66666666-2222-4222-8222-222222222222',
];

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 820, height: 900 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
  { width: 1366, height: 520 },
]) {
  test(`CP06 HTTP mock: Plan composition and location-create ${viewport.width}x${viewport.height}`, async ({
    page,
    gateway,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const mock = await mockPlan(page, gateway);
    mock.selectedLocations.push(
      ...locationIds.map((id, index) => ({
        id,
        trip_id: tripId,
        name: index === 0 ? 'Địa điểm trong ngày' : 'Địa điểm chưa xếp',
        address: 'Đà Nẵng',
        latitude: '16.05',
        longitude: '108.2',
        provider: null,
        provider_place_id: null,
        source: 'MANUAL',
        fetched_at: null,
        metadata: {},
        plan_version: 1,
      })),
    );
    Object.assign(mock.activities[0]!, {
      selected_location_id: locationIds[0],
      scheduled_date: '2026-11-01',
    });
    await login(page);
    await page.goto(`/trips/${tripId}/plan`);
    const days = page.getByRole('group', { name: 'Ngày trong lịch trình' });
    const metrics = page.getByRole('region', { name: 'Tóm tắt lịch trình · Cả chuyến' });
    await expect(metrics).toBeVisible();
    expect((await days.boundingBox())!.y).toBeLessThan((await metrics.boundingBox())!.y);
    await expect(metrics.getByText('Di chuyển · Chưa có dữ liệu')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('plan.png'), fullPage: true });
    const initialAxe = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('axe-initial.json', {
      body: JSON.stringify(initialAxe.violations, null, 2),
      contentType: 'application/json',
    });

    await page.getByRole('button', { name: 'Ngày 1 · 01/11', exact: true }).click();
    await page.getByRole('button', { name: 'Hiện bản đồ', exact: true }).click();
    const map = page.locator('[data-plan-day-map]');
    await expect(map.getByText('Địa điểm trong ngày', { exact: true })).toBeVisible();
    await expect(map.getByText('Địa điểm chưa xếp', { exact: true })).toHaveCount(0);
    await expect(map.getByText('Bản đồ nền chưa khả dụng', { exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('map.png'), fullPage: true });
    await map.getByRole('button', { name: 'Ẩn bản đồ', exact: true }).click();
    await expect(map).toHaveCount(0);

    await page.getByRole('button', { name: 'Sắp xếp lịch trình', exact: true }).click();
    if (viewport.width <= 1200)
      await page.getByRole('button', { name: 'Hoạt động chưa xếp ngày', exact: true }).click();
    const pool = page.getByRole('region', { name: 'Địa điểm và hoạt động chưa xếp ngày' });
    await expect(pool.getByText('Địa điểm chưa xếp', { exact: true })).toBeVisible();
    await expect(pool.getByText('Địa điểm trong ngày', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('pool.png'), fullPage: true });
    await pool.getByRole('button', { name: 'Thêm vào lịch', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Thêm hoạt động', exact: true });
    await expect(editor.getByLabel('Tên hoạt động', { exact: true })).toHaveValue(
      'Địa điểm chưa xếp',
    );
    await expect(editor.getByLabel('Địa điểm', { exact: true })).toHaveValue(locationIds[1]!);
    expect(mock.writes).toEqual([]);
    await editor.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ').fill('2026-11-01');
    await editor.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(editor).not.toBeVisible();
    expect(mock.writes).toHaveLength(1);
    expect(mock.writes[0]!.body).toMatchObject({
      selected_location_id: locationIds[1],
      scheduled_date: '2026-11-01',
      starts_at: null,
      ends_at: null,
    });
    if (viewport.width <= 1200) await page.keyboard.press('Escape');
    await expect(
      page.getByRole('listitem', { name: 'Địa điểm chưa xếp', exact: true }),
    ).toBeVisible();
    // CP11-A02 fixes the shell accessible-name mismatch. Keep the axe gate
    // strict for this route after the visible-label and accessible-name text
    // are aligned.
    expect(initialAxe.violations).toEqual([]);
  });
}
