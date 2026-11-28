import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const hash = 'a'.repeat(64);
const image = {
  url: `/api/v1/travel/poi-images/${hash}/1280.webp`,
  thumbnail_url: `/api/v1/travel/poi-images/${hash}/640.webp`,
  small_url: `/api/v1/travel/poi-images/${hash}/320.webp`,
  source_url: 'https://commons.wikimedia.org/wiki/File:Hoi_An.jpg',
  license: 'CC-BY-SA-4.0',
  attribution: 'Ảnh An · CC BY-SA 4.0 · Wikimedia Commons',
  is_placeholder: false,
};
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);

test('HTTP mock: licensed place photos and walking/cycling day routes keep credits visible', async ({
  page,
  gateway,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const model = await mockPlan(page, gateway);
  const locations = [
    {
      id: '77777777-1111-4111-8111-111111111111',
      name: 'Hội An',
      latitude: '15.88',
      longitude: '108.33',
      provider_place_id: 'hoi-an',
      metadata: {},
    },
    {
      id: '77777777-2222-4222-8222-222222222222',
      name: 'Bãi biển',
      latitude: '15.91',
      longitude: '108.35',
      provider_place_id: 'beach',
      metadata: {},
    },
  ];
  for (const location of locations) {
    model.selectedLocations.push({
      ...location,
      trip_id: tripId,
      address: 'Quảng Nam',
      provider: 'WOLFARI',
      source: 'PROVIDER',
      fetched_at: null,
      plan_version: 1,
    });
  }
  model.activities.forEach((activity, index) => {
    activity.selected_location_id = locations[index]!.id;
    activity.scheduled_date = '2026-11-01';
  });
  await page.route('**/api/v1/travel/poi-images/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: pixel }),
  );
  await page.route('**/places/search?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('q') !== 'Hội An') return route.fallback();
    return route.fulfill({
      json: {
        data: [
          {
            id: 'hoi-an',
            name: 'Hội An',
            address: 'Quảng Nam',
            coordinates: { latitude: 15.88, longitude: 108.33 },
            provider: 'WOLFARI',
            selection_token: 'signed-photo-lookup',
            attribution: '© OpenStreetMap contributors',
            hero_image: image,
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
  const modes: string[] = [];
  await page.route('**/api/v1/travel/route', (route) => {
    const body = route.request().postDataJSON();
    modes.push(body.mode);
    return route.fulfill({
      json: {
        data: { distance_m: 2000, duration_seconds: 900, geometry: body.coordinates },
        meta: {
          provider: 'OSRM',
          status: 'SUCCESS',
          fetched_at: '2026-11-26T00:00:00Z',
          stale: body.mode === 'CYCLING',
          is_mock: false,
          warnings: [],
          attribution: [
            {
              text: '© OpenStreetMap contributors',
              url: 'https://www.openstreetmap.org/copyright',
            },
          ],
        },
      },
    });
  });
  await login(page);
  await page.goto(`/trips/${tripId}/map`);
  await page
    .getByRole('button', { name: /Hội An/ })
    .first()
    .click();
  const card = page.getByRole('article', { name: 'Đang chọn Hội An' }).filter({ visible: true });
  const photo = card.getByRole('img', { name: 'Ảnh Hội An', exact: true });
  await expect(photo).toBeVisible();
  await expect(async () => {
    const source = await photo.evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      return new URL(img.currentSrc).pathname;
    });
    expect([image.small_url, image.thumbnail_url, image.url]).toContain(source);
  }).toPass({ timeout: 5_000 });
  await expect(card.getByRole('link', { name: image.attribution })).toBeVisible();
  await expect(card).not.toContainText('Nguồn:');
  await page.getByRole('combobox', { name: 'Ngày', exact: true }).selectOption('2026-11-01');
  await expect(page.getByText('2 km · 15 phút (ước lượng ô tô)', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cách di chuyển', exact: true }).selectOption('WALKING');
  await expect(page.getByText('2 km · 15 phút (đi bộ ước tính)', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cách di chuyển', exact: true }).selectOption('CYCLING');
  await expect(page.getByText('2 km · 15 phút (xe đạp ước tính)', { exact: true })).toBeVisible();
  await expect(page.getByText('Dữ liệu tuyến cũ · ', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: '© OpenStreetMap contributors', exact: true }),
  ).toBeVisible();
  expect(modes).toEqual(['DRIVING', 'WALKING', 'CYCLING']);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: info.outputPath('photos-route-desktop.png') });

  await page.setViewportSize({ width: 402, height: 874 });
  const detail = page.getByRole('complementary', { name: 'Chi tiết địa điểm' });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('img', { name: 'Ảnh Hội An' })).toBeVisible();
  await expect(detail.getByRole('link', { name: image.attribution })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: info.outputPath('photo-detail-mobile.png') });
});
