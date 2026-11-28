import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

const tileZoom = (url: string) =>
  Number(/^\/v1\/tile\/osm-carto\/(\d+)\//.exec(new URL(url).pathname)?.[1]);

test('HTTP mock tiles failure: zoom and save a manual pin with real Leaflet', async ({
  page,
  gateway,
}, info) => {
  test.skip(
    process.env.WOLFARI_LEAFLET_TEST !== 'true',
    'Run separately with a fake browser key; never calls a live tiles provider.',
  );
  const model = await mockPlan(page, gateway),
    trip = gateway.trips[0]!;
  const manualId = '77777777-2222-4222-8222-222222222222';
  const tileZooms: number[] = [];
  let manualWrites = 0;
  model.selectedLocations.push({
    id: '77777777-1111-4111-8111-111111111111',
    trip_id: trip.id,
    name: 'Hoi An saved',
    address: 'VN',
    latitude: '15.88',
    longitude: '108.33',
    provider: 'GEOAPIFY',
    provider_place_id: 'id',
    source: 'PROVIDER',
    metadata: {},
    fetched_at: null,
    plan_version: trip.plan_version,
  });
  await page.route('https://maps.geoapify.com/**', (route) => {
    tileZooms.push(tileZoom(route.request().url()));
    return route.abort();
  });
  await page.route('**/selected-locations', (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    manualWrites++;
    const { latitude, longitude } = route.request().postDataJSON();
    trip.plan_version++;
    trip.export_revision++;
    for (const item of model.activities) item.plan_version = trip.plan_version;
    model.selectedLocations.push({
      id: manualId,
      trip_id: trip.id,
      name: 'Pin thủ công thử nghiệm',
      address: null,
      latitude,
      longitude,
      provider: null,
      provider_place_id: null,
      source: 'MANUAL',
      metadata: {},
      fetched_at: null,
      plan_version: trip.plan_version,
    });
    return route.fulfill({
      status: 201,
      json: { data: { id: manualId, trip_id: trip.id, plan_version: trip.plan_version }, meta: {} },
    });
  });
  const searchName = 'Chợ kiểm thử';
  const otherSearchName = 'Chợ dự phòng';
  // Keep background frame exploration empty so the test can click blank map space.
  await page.route('**/places/search?*', (route) =>
    route.fulfill({
      json: {
        data:
          new URL(route.request().url()).searchParams.get('q') === searchName
            ? [searchName, otherSearchName].map((name, index) => ({
                id: `manual-pin-search-result-${index}`,
                name,
                address: 'Hà Nội',
                coordinates: { latitude: 21.028 + index * 0.01, longitude: 105.853 },
                selection_token: 'signed-test',
                attribution: 'Geoapify / OpenStreetMap',
              }))
            : [],
        meta: {
          provider: 'WOLFARI',
          status: 'SUCCESS',
          stale: false,
          fetched_at: null,
          warnings: [],
        },
      },
    }),
  );
  await login(page);
  await page.goto(`/trips/${trip.id}/map`);
  const pin = page.locator('.leaflet-marker-icon').first();
  await expect(pin).toBeVisible();
  await expect(pin).toHaveText('1');
  await pin.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('article', { name: 'Đang chọn Hoi An saved' }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Powered by Geoapify' })).toBeVisible();
  await expect(page.getByText('Chưa tải được một số ô bản đồ.', { exact: false })).toBeVisible();
  const map = page.locator('.leaflet-container');
  const draftPin = map.getByRole('img', { name: 'Pin chưa lưu' });
  const firstMapPoint = { x: 380, y: 85 };
  const secondMapPoint = { x: 420, y: 120 };
  await expect(draftPin).toHaveCount(0);
  const zoomBefore = Math.max(...tileZooms);
  expect(zoomBefore).toBeGreaterThan(0);
  await map.hover({ position: firstMapPoint });
  await page.mouse.wheel(0, -120);
  await expect.poll(() => Math.max(...tileZooms)).toBeGreaterThan(zoomBefore);
  const zoomAfter = Math.max(...tileZooms);
  const tileCount = tileZooms.length;
  await page.mouse.wheel(0, 300);
  await expect.poll(() => tileZooms.slice(tileCount).some((zoom) => zoom < zoomAfter)).toBe(true);
  await page.screenshot({ path: info.outputPath('leaflet-map.png'), fullPage: true });

  const dialog = page.getByRole('dialog', { name: 'Thêm pin thủ công' });
  await map.click({ position: firstMapPoint });
  await expect(draftPin).toBeVisible();
  await expect(page.getByText('Chưa có địa điểm được đánh dấu tại vị trí này.')).toBeVisible();
  await expect(dialog).toHaveCount(0);
  const firstPin = await draftPin.boundingBox();
  expect(firstPin).not.toBeNull();
  await map.click({ position: secondMapPoint });
  await expect(draftPin).toHaveCount(1);
  await expect.poll(async () => (await draftPin.boundingBox())?.x).not.toBe(firstPin?.x);
  await page.getByRole('button', { name: 'Bỏ pin', exact: true }).click();
  await expect(draftPin).toHaveCount(0);
  await expect(page.getByText('Chưa có địa điểm được đánh dấu tại vị trí này.')).toHaveCount(0);
  expect(manualWrites).toBe(0);

  await page.getByRole('button', { name: 'Phóng to bản đồ', exact: true }).click();
  const collapseMap = page.getByRole('button', { name: 'Thu nhỏ bản đồ', exact: true });
  await expect(collapseMap).toBeVisible();
  await map.click({ position: { x: 380, y: 64 } });
  await page.screenshot({ path: info.outputPath('leaflet-tile-failure.png'), fullPage: true });

  const openPinForm = page.getByRole('button', { name: 'Lưu pin thủ công', exact: true });
  const pinName = dialog.getByLabel('Tên pin');
  await openPinForm.click();
  const stackingLevel = (element: Element) => Number(getComputedStyle(element).zIndex);
  const mapLayer = await page.locator('[data-region="map-panel"]').evaluate(stackingLevel);
  expect(await dialog.evaluate(stackingLevel)).toBeGreaterThan(mapLayer);
  // Verify the field can also receive pointer input while the map is expanded.
  await pinName.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(collapseMap).toBeVisible();
  await expect(draftPin).toBeVisible();

  await openPinForm.click();
  await expect(dialog).toBeVisible();
  const latitude = await dialog.getByLabel('Vĩ độ').inputValue();
  const longitude = await dialog.getByLabel('Kinh độ').inputValue();
  expect(latitude).not.toBe('16.0544');
  expect(longitude).not.toBe('108.2022');
  const versionBeforeSave = trip.plan_version;
  await pinName.fill('Pin thủ công thử nghiệm');
  const [save] = await Promise.all([
    page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/selected-locations'),
    ),
    dialog.getByRole('button', { name: 'Lưu pin thủ công', exact: true }).click(),
  ]);
  expect(save.postDataJSON()).toEqual({
    expected_plan_version: versionBeforeSave,
    name: 'Pin thủ công thử nghiệm',
    address: null,
    latitude: Number(latitude).toFixed(6),
    longitude: Number(longitude).toFixed(6),
  });
  await expect(dialog).toBeHidden();
  await expect(collapseMap).toBeVisible();
  await expect(draftPin).toHaveCount(0);
  await expect(map.getByTitle('Pin thủ công thử nghiệm', { exact: true })).toBeVisible();
  await collapseMap.click();

  // Typing dismisses the draft and lists suggestions without moving existing pins.
  await map.click({ position: { x: 380, y: 64 } });
  await expect(draftPin).toBeVisible();
  const savedMarker = map.getByTitle('Hoi An saved', { exact: true });
  const savedPosition = await savedMarker.boundingBox();
  expect(savedPosition).not.toBeNull();
  await page.getByRole('searchbox', { name: 'Tìm địa điểm' }).fill(searchName);
  const rows = page.locator('[data-region="place-list"]');
  const suggestion = rows.getByRole('button', { name: new RegExp(searchName) });
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toHaveAttribute('aria-pressed', 'false');
  await expect(rows.getByRole('button', { name: new RegExp(otherSearchName) })).toBeVisible();
  await expect(draftPin).toHaveCount(0);
  await expect(page.getByText('Chưa có địa điểm được đánh dấu tại vị trí này.')).toHaveCount(0);
  const card = page
    .getByRole('article', { name: `Đang chọn ${searchName}` })
    .filter({ visible: true });
  const searchMarker = map.getByTitle(searchName, { exact: true });
  const otherSearchMarker = map.getByTitle(otherSearchName, { exact: true });
  await expect(card).toHaveCount(0);
  await expect(searchMarker).toHaveCount(0);
  await expect(otherSearchMarker).toHaveCount(0);
  expect(await savedMarker.boundingBox()).toEqual(savedPosition);

  await suggestion.click();
  await expect(suggestion).toHaveAttribute('aria-pressed', 'true');
  await expect(searchMarker).toBeVisible();
  await expect(otherSearchMarker).toHaveCount(0);
  await expect(card).toBeVisible();

  const selectionToggle = card.locator('button[aria-pressed]');
  const close = card.getByRole('button', { name: 'Đóng thẻ địa điểm', exact: true });
  await expect(selectionToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(close).toBeVisible();
  const saveBox = (await selectionToggle.boundingBox())!;
  const closeBox = (await close.boundingBox())!;
  expect(closeBox.x).toBeCloseTo(saveBox.x, 0);
  expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(saveBox.y);

  let writesAfterSelection = 0;
  page.on('request', (request) => {
    if (
      ['POST', 'DELETE'].includes(request.method()) &&
      /\/selected-locations(?:\/|$)/.test(new URL(request.url()).pathname)
    )
      writesAfterSelection++;
  });
  const markerPosition = await searchMarker.boundingBox();
  await close.click();
  await expect(card).toHaveCount(0);
  await expect(map.locator('xpath=ancestor::section[1]')).toBeFocused();
  await expect(searchMarker).toBeVisible();
  expect(await searchMarker.boundingBox()).toEqual(markerPosition);

  await searchMarker.click();
  await expect(card).toBeVisible();
  await expect(selectionToggle).toHaveAttribute('aria-pressed', 'false');
  expect(writesAfterSelection).toBe(0);
  expect(manualWrites).toBe(1);
});
