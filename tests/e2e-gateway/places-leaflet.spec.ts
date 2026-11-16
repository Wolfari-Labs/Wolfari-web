import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
test('HTTP mock tiles failure: real Leaflet pins, selection, attribution and manual coordinates', async ({
  page,
  gateway,
}, info) => {
  test.skip(
    process.env.WOLFARI_LEAFLET_TEST !== 'true',
    'Run separately with a fake browser key; never calls a live tiles provider.',
  );
  const model = await mockPlan(page, gateway),
    trip = gateway.trips[0]!;
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
  await page.route('https://maps.geoapify.com/**', (route) => route.abort());
  await login(page);
  await page.goto(`/trips/${trip.id}/map`);
  const pin = page.locator('.leaflet-marker-icon').first();
  await expect(pin).toBeVisible();
  await pin.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('article', { name: 'Đang chọn Hoi An saved' }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Powered by Geoapify' })).toBeVisible();
  await expect(page.getByText('Chưa tải được một số ô bản đồ.', { exact: false })).toBeVisible();
  const map = page.locator('.leaflet-container');
  await page.screenshot({ path: info.outputPath('leaflet-map.png'), fullPage: true });
  await map.click({ position: { x: 100, y: 100 } });
  await expect(page.getByLabel('Vĩ độ')).not.toHaveValue('16.0544');
  await expect(page.getByRole('button', { name: 'Lưu pin thủ công' })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('leaflet-tile-failure.png'), fullPage: true });
});
