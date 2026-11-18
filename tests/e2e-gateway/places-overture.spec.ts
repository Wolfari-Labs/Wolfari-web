import type { Page, Route } from '@playwright/test';
import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

/**
 * POI-OVERTURE W15 — Gateway HTTP mock only (no live Backend, no live tiles).
 * Map tests need a build with a fake `VITE_GEOAPIFY_BROWSER_KEY` and WOLFARI_LEAFLET_TEST=true.
 */
const tripId = '11111111-1111-4111-8111-111111111111';
const mapRun = process.env.WOLFARI_LEAFLET_TEST === 'true';
const OVERTURE = '© Overture Maps Foundation; Foursquare (Apache-2.0)';
// 1×1 transparent PNG: Leaflet renders an empty grey canvas instead of calling a tile provider.
const TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const overture = (i: number, latitude: number, longitude: number) => ({
  id: `ov-${i}`,
  name: `Nhà thuốc Overture ${i}`,
  address: 'Hải Châu, Đà Nẵng',
  coordinates: { latitude, longitude },
  categories: ['traveler_service'],
  attribution: OVERTURE,
  selection_token: `signed-ov-${i}`,
  provider: 'WOLFARI',
  category: 'traveler_service',
  category_label: 'Tiện ích cho khách',
  tier: 9,
  coord_verified: false,
  source_dataset: 'overture',
  category_group: 'services',
  province_code: '48',
  province_name: 'Đà Nẵng',
  confidence: 0.82,
  data_release: '2026-10-22.0',
  fetched_at: '2026-11-18T03:00:00Z',
});
const golden = {
  id: 'dn-cho-han',
  name: 'Chợ Hàn',
  address: 'Hải Châu, Đà Nẵng',
  coordinates: { latitude: 16.068, longitude: 108.2245 },
  categories: ['market'],
  attribution: '© OpenStreetMap contributors',
  selection_token: 'signed-wolfari',
  provider: 'WOLFARI',
  category: 'market',
  category_label: 'Chợ',
  tier: 1,
  coord_verified: true,
  activity_type: 'SHOPPING',
  source_dataset: 'golden',
  category_group: 'tourism',
  province_code: '48',
};
const meta = (extra: Record<string, unknown> = {}) => ({
  provider: 'WOLFARI',
  status: 'SUCCESS',
  stale: false,
  fetched_at: '2026-11-18T03:00:00Z',
  warnings: [],
  snapshot_id: 'snap-1',
  data_release: '2026-10-22.0',
  bbox_truncated: false,
  ...extra,
});
/** 40 Overture points in a tight block (clusters at city zoom) around the bbox centre. */
function frameResults(bbox: string) {
  const [west, south, east, north] = bbox.split(',').map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const lat = (south + north) / 2,
    lon = (west + east) / 2;
  return [
    ...Array.from({ length: 40 }, (_, i) =>
      overture(i, lat + (i % 8) * 0.0006, lon + Math.floor(i / 8) * 0.0006),
    ),
    // Curated pin inside the frame at any zoom, away from the Overture block.
    {
      ...golden,
      coordinates: { latitude: lat - (north - south) * 0.3, longitude: lon - (east - west) * 0.3 },
    },
  ];
}
const bboxOf = (url: string) => new URL(url).searchParams.get('bbox');
const width = (bbox: string) => {
  const [west, , east] = bbox.split(',').map(Number) as [number, number, number];
  return east - west;
};
async function prepareMap(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('https://maps.geoapify.com/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: TILE }),
  );
}
const ok = (route: Route, data: unknown[], extra: Record<string, unknown> = {}) =>
  route.fulfill({ json: { data, meta: meta(extra) } });

test('HTTP mock (a): without a keyword the map loads by bbox, clusters and selects a pin', async ({
  page,
  gateway,
}, info) => {
  test.skip(!mapRun, 'Needs a build with a fake browser key (WOLFARI_LEAFLET_TEST=true).');
  await prepareMap(page);
  await mockPlan(page, gateway);
  const urls: string[] = [];
  await page.route('**/places/search?*', (route) => {
    urls.push(route.request().url());
    const bbox = bboxOf(route.request().url());
    return bbox ? ok(route, frameResults(bbox), { bbox_truncated: true }) : ok(route, []);
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  await expect.poll(() => urls.length).toBeGreaterThan(0);
  const first = new URL(urls[0]!).searchParams;
  expect(first.get('limit')).toBe('150');
  expect(first.has('q')).toBe(false);
  expect(first.has('radius_m')).toBe(false);
  expect(first.has('category')).toBe(false);
  expect(first.get('bbox')).toMatch(/^[\d.]+,[\d.]+,[\d.]+,[\d.]+$/);

  const clusters = page.locator('.leaflet-marker-icon[title$="địa điểm — phóng to"]');
  await expect(clusters.first()).toBeVisible();
  await expect(
    page.getByText('Đang hiển thị 150 điểm nổi bật, phóng to để xem thêm'),
  ).toBeVisible();
  await expect(page.locator('.leaflet-control-attribution')).toContainText(
    'Overture Maps Foundation',
  );
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Powered by Geoapify');
  await expect(
    page.getByText('Dữ liệu địa điểm: Wolfari, Overture Maps Foundation (bản 2026-10-22.0)', {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('overture-clusters.png'), fullPage: true });
  await page
    .locator('[data-region="map-panel"]')
    .screenshot({ path: info.outputPath('overture-clusters-map.png') });

  // Drag the map: a new bbox request follows after the 300 ms debounce.
  const map = page.locator('.leaflet-container');
  const box = (await map.boundingBox())!;
  const before = urls.length;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 180, box.y + box.height / 2 - 60, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => urls.length).toBeGreaterThan(before);
  expect(bboxOf(urls.at(-1)!)).not.toBe(bboxOf(urls[0]!));

  // A cluster zooms into its points: the next frame is narrower.
  const wide = width(bboxOf(urls.at(-1)!)!);
  const afterDrag = urls.length;
  // Keyboard activation (Enter) also proves clusters are reachable without a mouse.
  await clusters.first().click();
  await expect.poll(() => urls.length).toBeGreaterThan(afterDrag);
  expect(width(bboxOf(urls.at(-1)!)!)).toBeLessThan(wide);

  // Curated pins are never clustered and open the selected-place card (keyboard too).
  await page.locator('.leaflet-marker-icon[title="Chợ Hàn"]').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('article', { name: 'Đang chọn Chợ Hàn' }).filter({ visible: true }),
  ).toBeVisible();
});

test('HTTP mock (a2): a cluster opens with the keyboard (Enter) like a click', async ({
  page,
  gateway,
}) => {
  test.skip(!mapRun, 'Needs a build with a fake browser key (WOLFARI_LEAFLET_TEST=true).');
  await prepareMap(page);
  await mockPlan(page, gateway);
  const urls: string[] = [];
  await page.route('**/places/search?*', (route) => {
    urls.push(route.request().url());
    return ok(route, frameResults(bboxOf(route.request().url())!));
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  const cluster = page.locator('.leaflet-marker-icon[title$="địa điểm — phóng to"]').first();
  await expect(cluster).toBeVisible();
  await page.waitForTimeout(500);
  const loaded = urls.length;
  const wide = width(bboxOf(urls.at(-1)!)!);
  await cluster.focus();
  await expect(cluster).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => urls.length).toBeGreaterThan(loaded);
  expect(width(bboxOf(urls.at(-1)!)!)).toBeLessThan(wide);
});

test('HTTP mock (c): BBOX_TOO_LARGE and zoom < 11 ask to zoom in without loading', async ({
  page,
  gateway,
}, info) => {
  test.skip(!mapRun, 'Needs a build with a fake browser key (WOLFARI_LEAFLET_TEST=true).');
  await prepareMap(page);
  await mockPlan(page, gateway);
  let tooLarge = true;
  const urls: string[] = [];
  await page.route('**/places/search?*', (route) => {
    urls.push(route.request().url());
    if (tooLarge)
      return route.fulfill({
        status: 400,
        json: {
          error: { code: 'BBOX_TOO_LARGE', message: 'bbox too large', retryable: false },
          meta: {},
        },
      });
    return ok(route, frameResults(bboxOf(route.request().url())!));
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  const notice = page.locator('[data-explore="zoom"]');
  await expect(notice).toHaveText('Phóng to để xem địa điểm');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('overture-zoom-in.png'), fullPage: true });
  await page
    .locator('[data-region="place-panel"]')
    .screenshot({ path: info.outputPath('overture-zoom-in-panel.png') });

  // Accepted frame → points load; zooming out below 11 clears them with no request.
  tooLarge = false;
  await page.locator('.leaflet-control-zoom-in').click();
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await expect(notice).toHaveCount(0);
  for (let i = 0; i < 3; i++) await page.locator('.leaflet-control-zoom-out').click();
  await expect(notice).toHaveText('Phóng to để xem địa điểm');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
  // At zoom 10, panning keeps asking to zoom in and sends nothing.
  await page.waitForTimeout(600);
  const settled = urls.length;
  const box = (await page.locator('.leaflet-container').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  expect(urls).toHaveLength(settled);
  await expect(notice).toHaveText('Phóng to để xem địa điểm');
});

test('HTTP mock (b): group chip sends category, keeps the keyword and survives reload', async ({
  page,
  gateway,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (mapRun) await prepareMap(page);
  await mockPlan(page, gateway);
  const keyword: URLSearchParams[] = [];
  const explore: URLSearchParams[] = [];
  await page.route('**/places/search?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has('bbox')) {
      explore.push(params);
      return ok(route, frameResults(params.get('bbox')!));
    }
    keyword.push(params);
    // No utility in this area: the group empty state is shown.
    return ok(route, params.get('category') === 'services' ? [] : [golden]);
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  const search = page.getByRole('searchbox', { name: 'Tìm địa điểm' });
  await search.fill('cho');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(
    page.locator('[data-region="place-list"] li').filter({ hasText: 'Chợ Hàn' }),
  ).toBeVisible();
  expect(keyword[0]!.has('category')).toBe(false);
  expect(keyword[0]!.get('geocode')).toBe('false');

  const chips = page.getByRole('group', { name: 'Nhóm địa điểm' });
  await expect(chips.getByRole('button')).toHaveText([
    'Du lịch',
    'Ăn uống',
    'Cà phê',
    'Lưu trú',
    'Bar',
    'Mua sắm',
    'Giải trí',
    'Spa',
    'Giao thông',
    'Tiện ích',
    'Tất cả',
  ]);
  await chips.getByRole('button', { name: 'Tiện ích', exact: true }).click();
  await expect.poll(() => keyword.at(-1)?.get('category')).toBe('services');
  expect(keyword.at(-1)!.get('q')).toBe('cho');
  await expect(search).toHaveValue('cho');
  await expect(page).toHaveURL(/[?&]group=services(&|$)/);
  await expect(chips.getByRole('button', { name: 'Tiện ích', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByText('Không có địa điểm thuộc nhóm này trong khu vực').first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('overture-chips.png'), fullPage: true });
  await page
    .locator('[data-region="place-panel"]')
    .screenshot({ path: info.outputPath('overture-chips-panel.png') });

  await page.reload();
  await expect(
    page
      .getByRole('group', { name: 'Nhóm địa điểm' })
      .getByRole('button', { name: 'Tiện ích', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  if (mapRun) await expect.poll(() => explore.at(-1)?.get('category')).toBe('services');
});

test('HTTP mock (d): an Overture POI shows its provenance and is added to Day 2', async ({
  page,
  gateway,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (mapRun) await prepareMap(page);
  const model = await mockPlan(page, gateway);
  const trip = gateway.trips[0]!;
  const locationId = '77777777-3333-4333-8333-333333333333';
  const place = overture(1, 16.0712, 108.2201);
  await page.route('**/places/search?*', (route) =>
    new URL(route.request().url()).searchParams.has('bbox')
      ? ok(route, [])
      : ok(route, [place], { provider: 'WOLFARI' }),
  );
  await page.route('**/selected-locations', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      selection_token: 'signed-ov-1',
      expected_plan_version: trip.plan_version,
    });
    trip.plan_version++;
    trip.export_revision++;
    for (const item of model.activities) item.plan_version = trip.plan_version;
    model.selectedLocations.push({
      id: locationId,
      trip_id: tripId,
      name: place.name,
      address: place.address,
      latitude: '16.071200',
      longitude: '108.220100',
      provider: 'WOLFARI',
      provider_place_id: 'ov-1',
      source: 'PROVIDER',
      // Selection metadata keeps categories + attribution only.
      metadata: { categories: ['traveler_service'], attribution: OVERTURE },
      fetched_at: '2026-11-18T03:00:00Z',
    });
    return route.fulfill({
      status: 201,
      json: {
        data: {
          location_id: locationId,
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
  await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill('nha thuoc');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const row = page.locator('[data-region="place-list"] li').filter({ hasText: place.name });
  await expect(row).toContainText('Tiện ích cho khách · Hải Châu, Đà Nẵng');
  const badge = row.getByText('Overture', { exact: true });
  await expect(badge).toHaveAttribute(
    'title',
    'Dữ liệu mở từ Overture Maps Foundation, nhóm chưa kiểm tay',
  );
  await expect(row).not.toContainText('Chưa xác minh vị trí');

  // Desktop: the existing selected-place card carries the source badge.
  const card = page
    .getByRole('article', { name: `Đang chọn ${place.name}` })
    .filter({ visible: true });
  await expect(card.getByText('Overture', { exact: true })).toBeVisible();
  await card.screenshot({ path: info.outputPath('overture-selected-card.png') });

  // The detail panel is the compact-layout view in the approved template (<= 768 px).
  await page.setViewportSize({ width: 390, height: 900 });
  await row.getByRole('button').first().click();
  const detail = page.getByRole('complementary', { name: 'Chi tiết địa điểm' });
  const provenance = detail.getByRole('definition');
  await expect(detail.getByLabel('Nguồn dữ liệu địa điểm')).toBeVisible();
  await expect(provenance.nth(0)).toHaveText('Tiện ích cho khách');
  await expect(provenance.nth(1)).toHaveText('Đà Nẵng');
  await expect(provenance.nth(2)).toContainText('Overture');
  await expect(provenance.nth(2)).toContainText('Bản dữ liệu 22/10/2026 · Cập nhật 18/11/2026');
  await expect(provenance.nth(3)).toHaveText(OVERTURE);
  await page.screenshot({ path: info.outputPath('overture-detail.png'), fullPage: true });
  await detail.screenshot({ path: info.outputPath('overture-detail-panel.png') });

  await detail.getByRole('button', { name: 'Thêm vào ngày…', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ngày 2 · 02/11' }).click();
  await expect.poll(() => model.writes.length).toBe(1);
  expect(model.writes[0]!.body).toEqual({
    expected_plan_version: 2,
    title: place.name,
    activity_type: 'SIGHTSEEING',
    selected_location_id: locationId,
    scheduled_date: '2026-11-02',
    position: 0,
  });
  // The success link sits in the list view, hidden while the compact detail panel is open.
  await expect(page.locator('a', { hasText: 'Xem lịch trình Ngày 2' })).toHaveCount(1);

  // After reload the saved place has no search result: its ov- key still marks it Overture.
  await page.reload();
  const saved = page.locator('[data-region="place-list"] li').filter({ hasText: place.name });
  await expect(saved.getByText('Overture', { exact: true })).toBeVisible();
  // Scheduled rows show their activity type, as before.
  await expect(saved).toContainText('Tham quan · Hải Châu, Đà Nẵng');
});

test('HTTP mock (e): a pre-Overture backend keeps the previous behaviour', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (mapRun) await prepareMap(page);
  await mockPlan(page, gateway);
  let bboxRequests = 0;
  await page.route('**/places/search?*', (route) => {
    if (new URL(route.request().url()).searchParams.has('bbox')) {
      bboxRequests++;
      // The previous Gateway rejects unknown query parameters.
      return route.fulfill({
        status: 400,
        json: {
          error: { code: 'VALIDATION_FAILED', message: 'unknown parameter', retryable: false },
          meta: {},
        },
      });
    }
    return route.fulfill({
      json: {
        data: [
          {
            id: 'geo-1',
            name: 'Hoi An POI',
            address: 'Quang Nam',
            coordinates: { latitude: 15.88, longitude: 108.33 },
            selection_token: 'signed',
            attribution: 'Geoapify / OpenStreetMap',
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
    });
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  if (mapRun) await expect.poll(() => bboxRequests).toBe(1);
  await expect(page.locator('[data-explore]')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill('Hoi An');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const row = page.locator('[data-region="place-list"] li').filter({ hasText: 'Hoi An POI' });
  await expect(row).toContainText('Tham quan · Quang Nam');
  await expect(row.getByText('Geoapify', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Dữ liệu địa điểm: Geoapify / © OpenStreetMap contributors', { exact: true }),
  ).toBeVisible();
  if (mapRun) {
    // Moving the map does not retry an unsupported bbox query.
    await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill('');
    await page.locator('.leaflet-control-zoom-in').click();
    await page.waitForTimeout(600);
    expect(bboxRequests).toBe(1);
  }
});
