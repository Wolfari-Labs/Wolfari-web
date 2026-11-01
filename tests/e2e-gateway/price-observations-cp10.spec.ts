import AxeBuilder from '@axe-core/playwright';
import { test, expect, login } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const watchId = '99999999-3333-4333-8333-333333333333';
const cursor = 'opaque+/cursor=';

test('Gateway Price Watch keeps loaded observations through a cursor error without inventing a fare', async ({
  page,
  gateway,
}, testInfo) => {
  const cursors: (string | null)[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let allowInitialSuccess = false;
  let failNext = true;
  const watch = {
    id: watchId,
    trip_id: tripId,
    user_id: gateway.profile.id,
    status: 'ACTIVE',
    status_reason: null,
    version: 2,
    expires_at: '2030-01-01T00:00:00Z',
    threshold_price: '9007199254740993',
    normalized_query: {
      transport_type: 'FLIGHT',
      provider: 'MOCK_FLIGHT',
      origin: 'DAD',
      destination: 'SGN',
      departure_date: '2029-01-02',
      departure_at: '2029-01-02T09:00:00Z',
      return_date: null,
      journey_type: 'ONE_WAY',
      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class: 'ECONOMY',
      currency: 'VND',
    },
  };
  const observation = (id: string, price: string, observed_at: string, fetched_at: string) => ({
    id,
    price,
    currency: 'VND',
    provider: 'MOCK_FLIGHT',
    observed_at,
    fetched_at,
  });
  const first = observation(
    '88888888-1111-4111-8111-111111111111',
    '9007199254740993',
    '2026-10-30T03:00:00Z',
    '2026-10-30T03:15:00Z',
  );
  const second = observation(
    '88888888-2222-4222-8222-222222222222',
    '9007199254740992',
    '2026-10-29T03:00:00Z',
    '2026-10-29T03:15:00Z',
  );
  await page.route(`**/api/v1/trips/${tripId}/price-watches*`, (route) =>
    route.fulfill({ json: { data: [watch], meta: { next_cursor: null } } }),
  );
  await page.route(`**/api/v1/price-watches/${watchId}/observations*`, (route) => {
    const url = new URL(route.request().url());
    const next = url.searchParams.get('cursor');
    cursors.push(next);
    expect(url.searchParams.get('limit')).toBe('20');
    if (next === null && !allowInitialSuccess) {
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Try again', retryable: true },
          meta: { correlation_id: 'mock-only' },
        },
      });
    }
    if (next !== null) {
      expect(next).toBe(cursor);
      expect(url.search).toContain('cursor=opaque%2B%2Fcursor%3D');
      if (failNext) {
        failNext = false;
        return route.fulfill({
          status: 503,
          json: {
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Try again', retryable: true },
            meta: { correlation_id: 'mock-only' },
          },
        });
      }
    }
    return route.fulfill({
      json: {
        data: next === null ? [first] : [second],
        meta: { next_cursor: next === null ? cursor : null },
      },
    });
  });

  await login(page);
  await page.goto(`/trips/${tripId}/price-watch`);
  await expect(page.getByRole('heading', { name: 'DAD đến SGN' })).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Lịch sử giá' });
  await trigger.click();
  const history = page.getByRole('dialog', { name: 'Chi tiết theo dõi giá' });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  const transitionDuration = await history.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  );
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);
  await expect(history).toContainText('Chưa tải được lịch sử quan sát.');
  await expect(history.getByRole('listitem')).toHaveCount(0);
  await expect(history.getByRole('button', { name: 'Tải thêm lịch sử' })).toHaveCount(0);
  allowInitialSuccess = true;
  await history.getByRole('button', { name: 'Thử lại' }).click();
  await expect(history).toContainText('9.007.199.254.740.993 ₫');
  await expect(history).toContainText('MOCK_FLIGHT');
  await expect(history).toContainText('Nhận dữ liệu:');
  await expect(history).toContainText('Quan sát gần nhất đã tải');
  await expect(history).toContainText('Quan sát:');
  await expect(history).toContainText('Nguồn: MOCK_FLIGHT');
  await expect(history).toContainText('Không xác nhận giá hiện tại');
  await expect(history).toContainText('múi giờ thiết bị');
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await history.screenshot({ path: testInfo.outputPath('price-observations-loaded.png') });
  await history.getByRole('button', { name: 'Tải thêm lịch sử' }).click();
  await expect(history).toContainText('Không tải được trang lịch sử tiếp theo.');
  await expect(history).toContainText('Các quan sát đã tải vẫn được giữ.');
  await expect(history.getByRole('button', { name: 'Tải thêm lịch sử' })).toHaveCount(0);
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await expect(history).toContainText('9.007.199.254.740.993 ₫');
  await history.screenshot({ path: testInfo.outputPath('price-observations-page-error.png') });
  await history.getByRole('button', { name: 'Thử lại' }).click();
  await expect(history.getByRole('listitem')).toHaveCount(2);
  await expect(history).toContainText('9.007.199.254.740.992 ₫');
  await expect(history).toContainText('9.007.199.254.740.993 ₫');
  expect(cursors[0]).toBeNull();
  expect(cursors.filter((value) => value !== null)).toEqual([cursor, cursor]);
  expect(
    gateway.calls.filter((call) => call.path.includes('/price-watches') && call.method !== 'GET'),
  ).toEqual([]);
  await expect(history.getByText(/Giá thấp nhất:|Đặt vé ngay|Thanh toán ngay/i)).toHaveCount(0);
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(history).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const scan = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await history.screenshot({ path: testInfo.outputPath('price-observations-web402.png') });
  await page.keyboard.press('Escape');
  await expect(history).toBeHidden();
  await expect(trigger).toBeFocused();
});
