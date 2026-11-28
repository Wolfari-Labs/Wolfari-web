import { test, expect, login } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';

test('Gateway weather uses saved coordinates and shows forecast/source in overview and days', async ({
  page,
  gateway,
}, testInfo) => {
  const trip = gateway.trips[0]!;
  const locationId = '66666666-1111-4111-8111-111111111111';
  const requests: string[] = [];
  await page.route(`**/api/v1/trips/${tripId}/plan`, (route) =>
    route.fulfill({
      json: {
        data: {
          trip_id: tripId,
          plan_version: trip.plan_version,
          export_revision: trip.export_revision,
          activities: [],
          dress_codes: [],
          packing_items: [],
          selected_locations: [
            {
              id: locationId,
              trip_id: tripId,
              name: 'Bãi biển Mỹ Khê',
              address: 'Đà Nẵng',
              latitude: '16.05',
              longitude: '108.2',
              source: 'MANUAL',
              provider: null,
              provider_place_id: null,
              opening_hours: null,
              fetched_at: null,
              metadata: {},
              plan_version: trip.plan_version,
            },
          ],
          permissions: { can_read: true, can_edit: true, can_complete: true },
        },
        meta: {},
      },
    }),
  );
  await page.route('**/api/v1/travel/weather?**', (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('latitude')).toBe('16.05');
    expect(url.searchParams.get('longitude')).toBe('108.2');
    const date = url.searchParams.get('date')!;
    requests.push(date);
    return route.fulfill({
      json: {
        data: {
          date,
          temperature_max_c: 31.3,
          temperature_min_c: 24.2,
          rain_probability: 0.4,
          uv_index: 6,
        },
        meta: {
          status: 'SUCCESS',
          provider: 'OPEN_METEO',
          fetched_at: '2026-11-01T00:00:00Z',
          stale: true,
          is_mock: true,
          warnings: [],
          attribution: [{ text: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/' }],
        },
      },
    });
  });
  await login(page);
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 1366, height: 600 },
    { width: 402, height: 874 },
    { width: 320, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/trips/${tripId}`);
    const card = page.locator('[data-region="trip-overview-weather"]');
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByText('24° – 31°')).toBeVisible();
    await expect(card).toContainText('Dữ liệu mô phỏng');
    await expect(card).toContainText('Dự báo cũ');
    const credit = card.getByRole('link', { name: 'Weather data by Open-Meteo.com' });
    await expect(credit).toBeVisible();
    const heading = card.getByRole('heading');
    const headingBounds = (await heading.boundingBox())!;
    const creditBounds = (await credit.boundingBox())!;
    expect(creditBounds.y + creditBounds.height).toBeLessThanOrEqual(headingBounds.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`weather-overview-${viewport.width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/trips/${tripId}/plan`);
  const days = page.getByRole('group', { name: 'Ngày trong lịch trình' });
  await expect(days.getByText('31°', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Dữ liệu thời tiết mô phỏng', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toBeVisible();
  expect(new Set(requests)).toEqual(new Set(['2026-11-01', '2026-11-02', '2026-11-03']));
  await page.screenshot({ path: testInfo.outputPath('weather-plan-days.png') });
});
