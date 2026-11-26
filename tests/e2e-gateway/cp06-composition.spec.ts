import AxeBuilder from '@axe-core/playwright';
import type { Locator } from '@playwright/test';
import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
import { handle, list } from './plan-dnd-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const locationIds = [
  '66666666-1111-4111-8111-111111111111',
  '66666666-2222-4222-8222-222222222222',
];

async function expectAlignedEmptyState(empty: Locator) {
  await expect(empty).toBeVisible();
  // Filtering and day changes reflow the panel. Read all edges in a single layout snapshot.
  await expect
    .poll(
      () =>
        empty.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const panel = node.closest('section')!.getBoundingClientRect();
          const left = box.left - panel.left;
          const right = panel.right - box.right;
          const bottom = panel.bottom - box.bottom;
          return Math.max(Math.abs(left - right), Math.abs(left - bottom));
        }),
      { message: 'The empty state must have equal left, right and bottom insets' },
    )
    .toBeLessThanOrEqual(1);
}

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
    gateway.trips.find((trip) => trip.id === tripId)!.end_at = '2026-11-05T00:00:00+07:00';
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
    const metrics = page.getByRole('region', { name: 'Tóm tắt lịch trình · 1/11' });
    await expect(metrics).toBeVisible();
    await expect(days.locator(':scope > button[data-plan-day]')).toHaveCount(4);
    await expect(days.getByRole('button', { name: 'Thêm ngày', exact: true })).toHaveCount(0);
    await expect(days.getByRole('button', { name: 'Tất cả', exact: true })).toBeVisible();
    await expect(days.locator('summary')).toHaveCount(0);
    expect(await days.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect((await days.boundingBox())!.y).toBeLessThan((await metrics.boundingBox())!.y);
    // Web v2 W06 metrics show the short labels; the day scope stays in the region name.
    for (const label of ['hoạt động', 'địa điểm', 'trải nghiệm'])
      await expect(metrics.getByText(label, { exact: true })).toBeVisible();
    // No travel-time source exists, so no permanent "— di chuyển" metric.
    await expect(metrics.getByText('di chuyển', { exact: true })).toHaveCount(0);
    await expect(metrics.getByText(/Chưa có dữ liệu|Ngày 1/)).toHaveCount(0);
    const missingHours = metrics.getByText('1 hoạt động chưa tính giờ');
    // Keep the note available to assistive technology without visible explanatory copy.
    await expect(missingHours).toHaveCSS('clip-path', 'inset(50%)');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('plan.png'), fullPage: true });
    const initialAxe = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('axe-initial.json', {
      body: JSON.stringify(initialAxe.violations, null, 2),
      contentType: 'application/json',
    });

    await days.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
    const unassigned = page
      .getByRole('heading', { name: 'Chưa chọn ngày', exact: true })
      .locator('..');
    await expect(unassigned.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toBeVisible();
    await expect(unassigned.getByRole('listitem', { name: 'Đi dạo', exact: true })).toHaveCount(0);
    await unassigned.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('all-days.png'), fullPage: true });
    await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
    await expect(days.locator('[data-plan-day="2026-11-01"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('[data-gateway-list="POOL"]')).toHaveCount(1);
    await expect(page.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Đóng danh sách hoạt động', exact: true }).click();
    await days.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await expect(unassigned.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toHaveCount(1);
    const lastDay = days.locator('[data-plan-day="2026-11-04"]');
    await lastDay.click();
    await expect(lastDay).toHaveAttribute('aria-pressed', 'true');
    const emptyDay = page.locator(
      '[data-gateway-list="2026-11-04"] > [data-gateway-drop-end][data-empty]',
    );
    await expectAlignedEmptyState(emptyDay);
    await page.screenshot({ path: testInfo.outputPath('empty-day.png'), fullPage: true });
    await days.locator('[data-plan-day="2026-11-01"]').click();
    await page.getByRole('button', { name: 'Hiện bản đồ', exact: true }).click();
    const map = page.locator('[data-plan-day-map]');
    await map.getByRole('button', { name: 'Ẩn bản đồ', exact: true }).click();
    await expect(map).toHaveCount(0);
    await page.getByRole('button', { name: 'Hiện bản đồ', exact: true }).click();
    await expect(
      map.getByText('1 địa điểm gắn với hoạt động đã xếp lịch', { exact: true }),
    ).toHaveCount(1);
    await expect(map.getByText('Địa điểm trong lịch trình', { exact: true })).toHaveCount(0);
    // No browser key: the notice; with one (demo machine): the rendered Leaflet map.
    await expect(
      map
        .getByText('Bản đồ nền chưa khả dụng', { exact: true })
        .or(map.locator('.leaflet-container')),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('map.png'), fullPage: true });
    const closeMap = map.getByRole('button', { name: 'Ẩn bản đồ', exact: true });
    await closeMap.focus();
    await page.keyboard.press('Enter');
    await expect(map).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hiện bản đồ', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hiện bản đồ', exact: true })).toBeFocused();

    await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();

    const pool = list(page, 'POOL').locator('xpath=ancestor::section[1]');
    await expect(pool.getByText('Địa điểm chưa xếp', { exact: true })).toBeVisible();
    await expect(pool.getByText('Địa điểm trong ngày', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('pool.png'), fullPage: true });
    const poolSearch = pool.getByRole('searchbox', {
      name: 'Tìm trong địa điểm và hoạt động chưa xếp',
      exact: true,
    });
    await expect(poolSearch).toHaveAttribute('placeholder', /Tìm/);
    await expect(
      pool.getByText(/Kéo hoạt động sang lịch trình để thêm vào ngày đang chọn/),
    ).toHaveCount(0);
    await poolSearch.fill('khong-khop-wolfari-938283');
    const emptyPool = pool.locator('[data-gateway-drop-end][data-empty]');
    await expectAlignedEmptyState(emptyPool);
    expect(
      await emptyPool.evaluate((node) => {
        const search = node.closest('section')!.querySelector('input[type="search"]')!;
        return node.getBoundingClientRect().top >= search.getBoundingClientRect().bottom;
      }),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('empty-pool.png'), fullPage: true });
    await poolSearch.fill('');
    await expect(pool.getByText('Địa điểm chưa xếp', { exact: true })).toBeVisible();
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
    await expect(handle(page, createdId)).toBeEnabled();
    await expect(page.getByText('Đã lưu thay đổi.', { exact: true })).toHaveCount(0);
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
