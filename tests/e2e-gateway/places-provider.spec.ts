import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
import type { Route } from '@playwright/test';
const isBbox = (route: Route) => new URL(route.request().url()).searchParams.has('bbox');
const tripId = '11111111-1111-4111-8111-111111111111';

const placeResult = (name: string) => ({
  json: {
    data: [
      {
        id: name,
        name,
        coordinates: { latitude: 15.88, longitude: 108.33 },
        selection_token: 'signed-live-search',
        attribution: 'Geoapify / OpenStreetMap',
      },
    ],
    meta: { provider: 'GEOAPIFY', status: 'SUCCESS', stale: false, fetched_at: null, warnings: [] },
  },
});

test('HTTP mock: live search debounces typing and Enter searches immediately without a duplicate', async ({
  page,
  gateway,
}) => {
  await page.clock.install();
  await mockPlan(page, gateway);
  const keywords: string[] = [];
  await page.route('**/places/search?*', (route) => {
    const keyword = new URL(route.request().url()).searchParams.get('q');
    if (keyword === null) return route.fallback();
    keywords.push(keyword);
    return route.fulfill(placeResult(`${keyword} POI`));
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  const search = page.getByRole('searchbox', { name: 'Tìm địa điểm' });
  const rows = page.locator('[data-region="place-list"] li');
  await expect(search).toBeEditable();
  await page.clock.pauseAt(Date.now() + 1000);

  await search.fill('  H ');
  await page.clock.runFor(500);
  expect(keywords).toEqual([]);

  await search.fill('Ho');
  await page.clock.runFor(150);
  await search.fill('Hoi');
  await page.clock.runFor(150);
  await search.fill('  Hoi An  ');
  await page.clock.runFor(500);
  await expect(rows.filter({ hasText: 'Hoi An POI' })).toBeVisible();
  expect(keywords).toEqual(['Hoi An']);

  await search.fill('Da Nang');
  await search.press('Enter');
  // The clock is paused, so this result must arrive without the debounce timer.
  await expect(rows.filter({ hasText: 'Da Nang POI' })).toBeVisible();
  await page.clock.runFor(500);
  await search.clear();
  await expect(rows.filter({ hasText: 'Da Nang POI' })).toHaveCount(0);
  expect(keywords).toEqual(['Hoi An', 'Da Nang']);
});

test('HTTP mock: a delayed search cannot replace suggestions after clearing the keyword', async ({
  page,
  gateway,
}) => {
  await mockPlan(page, gateway);
  const older = 'Chợ cũ';
  const newer = 'Chợ mới';
  let releaseOlder!: () => void;
  let finishOlder!: () => void;
  const olderCanRespond = new Promise<void>((resolve) => {
    releaseOlder = resolve;
  });
  const olderFinished = new Promise<void>((resolve) => {
    finishOlder = resolve;
  });
  const keywords: string[] = [];
  await page.route('**/places/search?*', async (route) => {
    const keyword = new URL(route.request().url()).searchParams.get('q');
    if (keyword === null) return route.fallback();
    keywords.push(keyword);
    if (keyword !== older) return route.fulfill(placeResult(keyword));
    await olderCanRespond;
    try {
      await route.fulfill(placeResult(older));
    } catch (error) {
      if (!route.request().failure()) throw error;
    } finally {
      finishOlder();
    }
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  const search = page.getByRole('searchbox', { name: 'Tìm địa điểm' });
  const rows = page.locator('[data-region="place-list"] li');
  try {
    await search.fill(older);
    await expect.poll(() => keywords).toEqual([older]);
    await Promise.all([
      page.waitForEvent(
        'requestfailed',
        (request) => new URL(request.url()).searchParams.get('q') === older,
      ),
      search.clear(),
    ]);
    await search.fill(newer);
    await expect(rows.filter({ hasText: newer })).toBeVisible();
    releaseOlder();
    await olderFinished;
    await expect(rows.filter({ hasText: newer })).toBeVisible();
    await expect(rows.filter({ hasText: older })).toHaveCount(0);
    expect(keywords).toEqual([older, newer]);
  } finally {
    releaseOlder();
  }
});

for (const width of [1440, 390])
  test(`HTTP mock: live POI search, save, attach and reload (${width})`, async ({
    page,
    gateway,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const model = await mockPlan(page, gateway);
    const trip = gateway.trips[0]!;
    let searches = 0,
      saves = 0;
    await page.route('**/places/search?*', (route) => {
      // Map frame exploration (browser key present) falls back to the fixture default.
      if (isBbox(route)) return route.fallback();
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
    // The saved place waits in the unassigned pool; moving it to a day creates one Activity.
    await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
    await page
      .getByRole('group', { name: 'Ngày trong lịch trình' })
      .getByRole('button', { name: /^Ngày 1 ·/ })
      .click();
    const placeHandle = page.getByRole('button', { name: 'Kéo địa điểm Hoi An POI', exact: true });
    const originalActivityIds = model.activities.map((activity) => activity.id);
    const versionBeforeAttach = trip.plan_version;
    await placeHandle.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Kéo hoạt động Hoi An POI', exact: true }),
    ).toBeEnabled();
    // Arrangement is create + full-order PUT. Wait for the refreshed, enabled
    // activity before inspecting writes or navigating away; a transient count of
    // one races the second request and can abort the unfinished arrangement.
    expect(model.writes).toHaveLength(2);
    expect(model.writes.map(({ method, path }) => ({ method, path }))).toEqual([
      { method: 'POST', path: `/api/v1/trips/${tripId}/activities` },
      { method: 'PUT', path: `/api/v1/trips/${tripId}/activities/order` },
    ]);
    expect(model.writes[0]!.body.scheduled_date).toBe(trip.start_at.slice(0, 10));
    expect(model.writes[0]!.body.selected_location_id).toBe('77777777-1111-4111-8111-111111111111');
    expect(model.writes[0]!.body.expected_plan_version).toBe(versionBeforeAttach);
    const attached = model.activities.filter(
      (activity) => activity.selected_location_id === '77777777-1111-4111-8111-111111111111',
    );
    expect(attached).toHaveLength(1);
    const expectedOrder = [...originalActivityIds, attached[0]!.id];
    expect(model.writes[1]!.body).toEqual({
      expected_plan_version: versionBeforeAttach + 1,
      activity_ids: expectedOrder,
    });
    expect(model.writes[0]!.key).not.toBe(model.writes[1]!.key);
    expect(model.activities.map((activity) => activity.id)).toEqual(expectedOrder);
    await expect(placeHandle).toHaveCount(0);
    await page.goto(`/trips/${tripId}/map`);
    await page.reload();
    await expect(
      page.getByRole('checkbox', { name: 'Bỏ chọn Hoi An POI', exact: true }),
    ).toBeDisabled();
    expect(model.writes).toHaveLength(2);
    // Without a browser key the map shows its notice; with one (demo machine) Leaflet renders.
    await expect(
      page
        .getByText('Bản đồ nền chưa khả dụng', { exact: true })
        .or(page.locator('.leaflet-container')),
    ).toBeVisible();
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
    isBbox(route)
      ? route.fallback()
      : route.fulfill({
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

test('HTTP mock: Wolfari map card toggles selection and details can attach the place to Day 2', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const model = await mockPlan(page, gateway);
  const trip = gateway.trips[0]!;
  const locationId = '77777777-2222-4222-8222-222222222222';
  const description = 'Khu chợ truyền thống gần sông Hàn.';
  const savedDescription = 'Địa điểm mua sắm đã lưu cho chuyến đi.';
  const geocodeModes: (string | null)[] = [];
  let saves = 0;
  let removals = 0;
  await page.route('**/places/search?*', (route) => {
    // Map frame exploration (browser key present) falls back to the fixture default.
    if (isBbox(route)) return route.fallback();
    // Text search must use place mode: geocode mode bypasses the Wolfari catalogue.
    geocodeModes.push(new URL(route.request().url()).searchParams.get('geocode'));
    return route.fulfill({
      json: {
        data: [
          {
            id: 'dn-cho-han',
            name: 'Chợ Hàn',
            address: 'Hải Châu, Đà Nẵng',
            description,
            coordinates: { latitude: 16.068, longitude: 108.224 },
            categories: ['market'],
            attribution: '© OpenStreetMap contributors',
            selection_token: 'signed-wolfari',
            provider: 'WOLFARI',
            category: 'market',
            category_label: 'Chợ',
            tier: 1,
            coord_verified: false,
            typical_duration_min: 60,
            activity_type: 'SHOPPING',
            dress_code_hint: '',
          },
        ],
        meta: {
          provider: 'WOLFARI',
          status: 'SUCCESS',
          stale: false,
          fetched_at: null,
          warnings: [],
        },
      },
    });
  });
  await page.route('**/selected-locations', (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    saves++;
    expect(route.request().postDataJSON()).toEqual({
      selection_token: 'signed-wolfari',
      expected_plan_version: trip.plan_version,
    });
    trip.plan_version++;
    trip.export_revision++;
    for (const item of model.activities) item.plan_version = trip.plan_version;
    model.selectedLocations.push({
      id: locationId,
      trip_id: tripId,
      name: 'Chợ Hàn',
      address: 'Hải Châu, Đà Nẵng',
      latitude: '16.068000',
      longitude: '108.224000',
      provider: 'WOLFARI',
      provider_place_id: 'dn-cho-han',
      source: 'PROVIDER',
      metadata: { description: savedDescription },
      fetched_at: null,
    });
    return route.fulfill({
      status: 201,
      json: {
        data: {
          location_id: locationId,
          trip_id: tripId,
          plan_version: trip.plan_version,
          export_revision: trip.export_revision,
        },
        meta: {},
      },
    });
  });
  await page.route(`**/selected-locations/${locationId}`, (route) => {
    expect(route.request().method()).toBe('DELETE');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({ expected_plan_version: trip.plan_version });
    removals++;
    model.selectedLocations.splice(0);
    trip.plan_version++;
    trip.export_revision++;
    for (const item of model.activities) item.plan_version = trip.plan_version;
    return route.fulfill({ json: { data: { location_id: locationId }, meta: {} } });
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill('cho han');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const row = page.locator('[data-region="place-list"] li').filter({ hasText: 'Chợ Hàn' });
  await expect(row).toContainText('Chợ · Hải Châu, Đà Nẵng');
  await expect(row.getByText('Wolfari', { exact: true })).toHaveCount(0);
  await expect(row).toContainText('Chưa xác minh vị trí');
  await expect(page.getByText('Dữ liệu địa điểm: Wolfari', { exact: true })).toBeVisible();
  expect(geocodeModes).toEqual(['false']);
  await row.getByRole('button').first().click();
  const card = page.getByRole('article', { name: 'Đang chọn Chợ Hàn' }).filter({ visible: true });
  const photo = card.getByRole('img', { name: 'Ảnh minh họa cho Chợ Hàn' });
  const title = card.getByText('Chợ Hàn', { exact: true });
  const saveLabel = 'Thêm vào danh sách địa điểm đã chọn';
  const removeLabel = 'Bỏ khỏi danh sách địa điểm đã chọn';
  const toggle = card.locator('button[aria-pressed]');
  const oldActions = card.getByRole('button', { name: /Thêm vào ngày|Sửa địa điểm|Xóa địa điểm/ });
  const oldCopy = card.getByText('Chọn địa điểm để lưu vào chuyến đi.', { exact: true });
  const cardDescription = card.getByText(description, { exact: true });
  await expect(photo).toBeVisible();
  await expect(title).toBeVisible();
  await expect(cardDescription).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveCSS('border-radius', '50%');
  await expect(card).not.toContainText('Nguồn:');
  await expect(oldActions).toHaveCount(0);
  await expect(oldCopy).toHaveCount(0);
  const photoBox = (await photo.boundingBox())!;
  const addBox = (await toggle.boundingBox())!;
  expect(photoBox.y + photoBox.height).toBeLessThanOrEqual((await title.boundingBox())!.y + 1);
  expect(addBox.width).toBeCloseTo(addBox.height, 0);
  expect(addBox.x + addBox.width / 2).toBeGreaterThan(photoBox.x);
  expect(addBox.x + addBox.width / 2).toBeLessThan(photoBox.x + photoBox.width);
  expect(addBox.y + addBox.height / 2).toBeGreaterThan(photoBox.y);
  expect(addBox.y + addBox.height / 2).toBeLessThan(photoBox.y + photoBox.height);
  await toggle.hover();
  await expect(page.getByRole('tooltip')).toHaveText(saveLabel);
  expect(saves).toBe(0);
  await toggle.click();
  await expect(row.getByRole('checkbox', { name: 'Bỏ chọn Chợ Hàn' })).toBeChecked();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(cardDescription).toBeVisible();
  await expect(oldActions).toHaveCount(0);
  expect(saves).toBe(1);
  await toggle.hover();
  await expect(page.getByRole('tooltip')).toHaveText(removeLabel);

  await toggle.click();
  await expect(row.getByRole('checkbox', { name: 'Chọn Chợ Hàn', exact: true })).toBeEnabled();
  expect(removals).toBe(1);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(saves).toBe(2);
  const versionBeforeAttach = trip.plan_version;

  // Adding a saved place to a day remains available in its compact detail view.
  await page.setViewportSize({ width: 390, height: 900 });
  const detail = page.getByRole('complementary', { name: 'Chi tiết địa điểm' });
  await detail.getByRole('button', { name: 'Thêm vào ngày…', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ngày 2 · 02/11' }).click();
  await expect.poll(() => model.writes.length).toBe(1);
  expect(saves).toBe(2);
  expect(model.writes[0]!.method).toBe('POST');
  expect(model.writes[0]!.body).toEqual({
    expected_plan_version: versionBeforeAttach,
    title: 'Chợ Hàn',
    activity_type: 'SHOPPING',
    selected_location_id: locationId,
    scheduled_date: '2026-11-02',
    position: 0,
  });
  await detail.getByRole('button', { name: 'Quay lại bản đồ' }).click();
  await expect(cardDescription).toBeVisible();
  await page.getByRole('link', { name: 'Xem lịch trình Ngày 2' }).click();
  await expect(page).toHaveURL(/\/plan\?day=2026-11-02$/);
  await expect(
    page.locator('[data-day-list="2026-11-02"]').getByRole('listitem', { name: 'Chợ Hàn' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('[data-day-list="2026-11-02"]').getByRole('listitem', { name: 'Chợ Hàn' }),
  ).toBeVisible();
  await page.goto(`/trips/${tripId}/map`);
  await expect(page.getByRole('searchbox', { name: 'Tìm địa điểm' })).toHaveValue('');
  await expect(card.getByText(savedDescription, { exact: true })).toBeVisible();
});
