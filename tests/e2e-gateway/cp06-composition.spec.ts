import AxeBuilder from '@axe-core/playwright';
import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
import { handle, list } from './plan-dnd-fixture';

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
    const metrics = page.getByRole('region', { name: 'Tóm tắt lịch trình · Ngày 1 · 01/11' });
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

    await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();

    const pool = list(page, 'POOL').locator('xpath=ancestor::section[1]');
    await expect(pool.getByText('Địa điểm chưa xếp', { exact: true })).toBeVisible();
    await expect(pool.getByText('Địa điểm trong ngày', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('pool.png'), fullPage: true });
    await handle(page, locationIds[1]!, 'location').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    expect(mock.writes).toEqual([]);
    await page.keyboard.press('Enter');
    await expect
      .poll(
        () =>
          mock.activities.filter((activity) => activity.selected_location_id === locationIds[1])
            .length,
      )
      .toBe(1);
    await expect(page.getByRole('dialog', { name: 'Thêm hoạt động', exact: true })).toHaveCount(0);
    const creates = mock.writes.filter((write) => write.method === 'POST');
    expect(creates).toHaveLength(1);
    expect(creates[0]!.body).toMatchObject({
      selected_location_id: locationIds[1],
      scheduled_date: '2026-11-01',
      starts_at: null,
      ends_at: null,
    });
    await expect(pool).toBeVisible();
    const createdId = mock.activities.find(
      (activity) => activity.selected_location_id === locationIds[1],
    )!.id;
    await expect(handle(page, createdId)).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
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
