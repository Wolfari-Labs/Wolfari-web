import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
const tripId = '11111111-1111-4111-8111-111111111111';
for (const width of [1440, 390])
  test(`HTTP mock: explicit POI search, save, attach and reload (${width})`, async ({
    page,
    gateway,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const model = await mockPlan(page, gateway);
    const trip = gateway.trips[0]!;
    let searches = 0,
      saves = 0;
    await page.route('**/places/search?*', (route) => {
      searches++;
      return route.fulfill({
        json: {
          data: [
            {
              id: 'provider-id',
              name: 'Hoi An POI',
              address: 'Quang Nam',
              coordinates: { latitude: 15.88, longitude: 108.33 },
              selection_token: 'signed-test-snapshot',
              attribution: 'Geoapify / OpenStreetMap',
            },
          ],
          meta: {
            provider: 'GEOAPIFY',
            status: 'SUCCESS',
            fetched_at: '2026-11-12T00:00:00Z',
            stale: false,
            warnings: [],
          },
        },
      });
    });
    await page.route('**/selected-locations', (route) => {
      const body = route.request().postDataJSON();
      expect(body).toEqual({
        selection_token: 'signed-test-snapshot',
        expected_plan_version: trip.plan_version,
      });
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      saves++;
      trip.plan_version++;
      trip.export_revision++;
      const id = '77777777-1111-4111-8111-111111111111';
      model.selectedLocations.push({
        id,
        trip_id: tripId,
        name: 'Hoi An POI',
        address: 'Quang Nam',
        latitude: '15.88',
        longitude: '108.33',
        provider: 'GEOAPIFY',
        provider_place_id: 'provider-id',
        source: 'PROVIDER',
        metadata: {},
        created_by_user_id: gateway.profile.id,
        fetched_at: '2026-11-12T00:00:00Z',
        plan_version: trip.plan_version,
      });
      for (const item of model.activities) item.plan_version = trip.plan_version;
      return route.fulfill({
        status: 201,
        json: {
          data: {
            location_id: id,
            version: {
              trip_id: tripId,
              plan_version: trip.plan_version,
              export_revision: trip.export_revision,
            },
          },
          meta: {},
        },
      });
    });
    await login(page);
    await page.goto(`/trips/${tripId}/map`);
    await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill('Hoi An');
    expect(searches).toBe(0);
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    const row = page.locator('[data-region="place-list"] li').filter({ hasText: 'Hoi An POI' });
    await expect(row).toBeVisible();
    expect(searches).toBe(1);
    await expect(page.locator('[data-node-id="20:386"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kết quả tìm kiếm', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByLabel('Tên pin', { exact: true })).toHaveCount(0);
    await row.getByRole('checkbox', { name: 'Chọn Hoi An POI', exact: true }).click();
    await expect.poll(() => saves).toBe(1);
    await expect(
      row.getByRole('checkbox', { name: 'Bỏ chọn Hoi An POI', exact: true }),
    ).toBeChecked();
    await row.getByRole('button').click();
    if (width <= 768) {
      await expect(page.getByRole('complementary', { name: 'Chi tiết địa điểm' })).toBeVisible();
      await page.getByRole('link', { name: 'Xem trong lịch trình' }).click();
    } else {
      await page
        .getByRole('navigation', { name: 'Điều hướng chuyến đi' })
        .getByRole('link', { name: 'Lịch trình', exact: true })
        .click();
    }
    await page.getByRole('button', { name: 'Sắp xếp lịch trình', exact: true }).click();
    if (width <= 768)
      await page.getByRole('button', { name: 'Hoạt động chưa xếp ngày', exact: true }).click();
    const pool = page.getByRole('region', { name: 'Địa điểm và hoạt động chưa xếp ngày' });
    await pool
      .getByRole('listitem')
      .filter({ hasText: 'Hoi An POI' })
      .getByRole('button', { name: 'Thêm vào lịch' })
      .click();
    const editor = page.getByRole('form', { name: 'Thêm hoạt động' });
    await expect(editor.getByLabel('Tên hoạt động')).toHaveValue('Hoi An POI');
    await editor.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ').fill(trip.start_at.slice(0, 10));
    await editor.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect.poll(() => model.writes.length).toBe(1);
    expect(model.writes[0]!.body.selected_location_id).toBe('77777777-1111-4111-8111-111111111111');
    await page.goto(`/trips/${tripId}/map`);
    await page.reload();
    await expect(
      page.getByRole('checkbox', { name: 'Bỏ chọn Hoi An POI', exact: true }),
    ).toBeDisabled();
    await expect(page.getByText('Bản đồ nền chưa khả dụng', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('places.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
test('HTTP mock: viewer cannot save manual pins', async ({ page, gateway }) => {
  const model = await mockPlan(page, gateway);
  model.controls.forbidden = true;
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  await expect(page.getByRole('button', { name: 'Đặt pin thủ công' })).toBeDisabled();
  expect(model.writes).toHaveLength(0);
});

test('HTTP mock: existing checkbox recovers the same save after reload, then removes the pin', async ({
  page,
  gateway,
}) => {
  const model = await mockPlan(page, gateway);
  const trip = gateway.trips[0]!;
  const locationId = '77777777-1111-4111-8111-111111111111';
  const keys: string[] = [];
  await page.route('**/places/search?*', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 'poi',
            name: 'Recovery POI',
            address: 'Da Nang',
            coordinates: { latitude: 16.05, longitude: 108.2 },
            selection_token: 'signed-test',
            attribution: 'Geoapify',
          },
        ],
        meta: {
          provider: 'GEOAPIFY',
          status: 'SUCCESS',
          stale: false,
          fetched_at: null,
          warnings: [],
        },
      },
    }),
  );
  await page.route('**/selected-locations', (route) => {
    keys.push(route.request().headers()['idempotency-key']!);
    if (keys.length === 1)
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'unknown', retryable: true },
          meta: {},
        },
      });
    expect(route.request().postDataJSON()).toEqual({
      selection_token: 'signed-test',
      expected_plan_version: trip.plan_version,
    });
    trip.plan_version++;
    trip.export_revision++;
    for (const item of model.activities) item.plan_version = trip.plan_version;
    model.selectedLocations.push({
      id: locationId,
      trip_id: tripId,
      name: 'Recovery POI',
      address: 'Da Nang',
      latitude: '16.05',
      longitude: '108.2',
      source: 'PROVIDER',
      provider: 'GEOAPIFY',
      provider_place_id: 'poi',
      metadata: {},
      fetched_at: null,
      plan_version: trip.plan_version,
    });
    return route.fulfill({ status: 201, json: { data: { location_id: locationId }, meta: {} } });
  });
  let deletes = 0;
  await page.route(`**/selected-locations/${locationId}`, (route) => {
    expect(route.request().method()).toBe('DELETE');
    expect(route.request().postDataJSON()).toEqual({ expected_plan_version: trip.plan_version });
    deletes++;
    model.selectedLocations.splice(0);
    trip.plan_version++;
    trip.export_revision++;
    for (const item of model.activities) item.plan_version = trip.plan_version;
    return route.fulfill({ json: { data: { location_id: locationId }, meta: {} } });
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill('Recovery');
  await page.getByRole('searchbox').press('Enter');
  await page.getByRole('checkbox', { name: 'Chọn Recovery POI', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thử lại cùng thao tác' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Đặt pin thủ công' })).toBeDisabled();
  await page.getByRole('button', { name: 'Thử lại cùng thao tác' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Bỏ chọn Recovery POI', exact: true }),
  ).toBeChecked();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await page.getByRole('checkbox', { name: 'Bỏ chọn Recovery POI', exact: true }).click();
  await expect.poll(() => deletes).toBe(1);
  await expect(page.getByRole('checkbox', { name: /Recovery POI/ })).toHaveCount(0);
});
