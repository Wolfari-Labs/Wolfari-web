import { test, expect } from './gateway-fixture';
import { assertOverviewCardLayout } from '../overview-layout-check';

const tripId = '11111111-1111-4111-8111-111111111111';
const path = `/trips/${tripId}`;

test.beforeEach(async ({ page, gateway }) => {
  // Install the base HTTP fixture before per-test routes (Playwright routes are LIFO).
  void gateway;
  await page.route(`**/api/v1/trips/${tripId}/price-watches*`, (route) =>
    route.fulfill({ json: { data: [], meta: { next_cursor: null } } }),
  );
});

for (const [width, height] of [
  [1440, 960],
  [1366, 768],
  [1366, 520],
  [402, 874],
] as const) {
  test(`HTTP mock: overview fits ${width}x${height} with independent runtime panels`, async ({
    page,
    gateway,
  }, info) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    await expect(
      page.locator('[data-region="trip-overview-fund"]').getByText('Chưa bật quỹ nhóm.'),
    ).toBeVisible();
    await expect(page.locator('[data-region="trip-overview-itinerary"]')).toBeVisible();
    await assertOverviewCardLayout(page);
    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        overflow: main.scrollHeight - main.clientHeight,
      };
    });
    expect(metrics.width).toBeLessThanOrEqual(width);
    expect(metrics.height).toBeLessThanOrEqual(height);
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    expect(
      gateway.calls.filter(
        (call) => call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET',
      ),
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath(`gateway-overview-${width}x${height}.png`) });
  });
}

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login?returnTo=' + encodeURIComponent(path));
  await page.getByLabel('Email', { exact: true }).fill('trang@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(' password with spaces ');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(path);
}

for (const height of [960, 700, 520]) {
  test(`HTTP mock: compact fund and packing progress remain visible at height ${height}`, async ({
    page,
    gateway,
  }, info) => {
    await page.setViewportSize({ width: 1440, height });
    await page.route(`**/api/v1/trips/${tripId}/fund`, (route) =>
      route.fulfill({
        json: {
          data: {
            id: '77777777-1111-4111-8111-111111111111',
            trip_id: tripId,
            holder_user_id: gateway.profile.id,
            currency: 'VND',
            budget_amount: '9000000',
            current_balance: '6250000',
            reserved_refund: '250000',
            available_balance: '6000000',
            status: 'OPEN',
            finance_version: 3,
            closed_at: null,
          },
          meta: { correlation_id: 'overview-fund-mock' },
        },
      }),
    );
    await signIn(page);
    const fund = page.locator('[data-region="trip-overview-fund"]');
    await expect(fund.locator('p')).toHaveCount(2);
    await expect(fund.getByText('6.250.000 ₫', { exact: true })).toBeVisible();
    await expect(fund.getByText('69% ngân sách · 9.000.000 ₫')).toBeVisible();
    await expect(fund.getByText('6.250.000 ₫', { exact: true })).toHaveCSS(
      'color',
      'rgb(0, 177, 207)',
    );
    await expect(fund.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '69');
    for (const region of ['fund', 'packing']) {
      const panel = page.locator(`[data-region="trip-overview-${region}"]`);
      const bar = panel.getByRole('progressbar');
      await expect(bar).toHaveCSS('height', '12px');
      const bounds = (await panel.boundingBox())!,
        track = (await bar.boundingBox())!;
      expect(track.y + track.height).toBeLessThanOrEqual(bounds.y + bounds.height);
      expect(bounds.y + bounds.height - track.y - track.height).toBeGreaterThanOrEqual(20);
      expect(bounds.y + bounds.height - track.y - track.height).toBeLessThanOrEqual(25);
      const copy = (await panel.locator('p').last().boundingBox())!;
      expect(track.y - copy.y - copy.height).toBeGreaterThanOrEqual(12);
      expect(
        await bar.evaluate((el) => {
          const parent = el.parentElement!;
          return parent.scrollHeight - parent.clientHeight;
        }),
      ).toBeLessThanOrEqual(1);
    }
    const fare = page.locator('[data-region="trip-overview-fare"]');
    const emptyCopy = fare.getByText('Chưa có dữ liệu', { exact: true });
    await expect(emptyCopy).toBeVisible();
    await expect(fare.getByText('—', { exact: true })).toBeVisible();
    const fareBox = (await fare.boundingBox())!,
      copyBox = (await emptyCopy.boundingBox())!;
    expect(copyBox.y + copyBox.height).toBeLessThanOrEqual(fareBox.y + fareBox.height);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: info.outputPath(`overview-fund-${height}.png`) });
    await expect(fund.getByRole('link')).toHaveAttribute('href', `${path}/fund`);
  });
}

test('HTTP mock: fare read failure stays an error, retry gives the concise empty state', async ({
  page,
}) => {
  let failing = true;
  await page.route(`**/api/v1/trips/${tripId}/price-watches*`, (route) =>
    failing
      ? route.fulfill({
          status: 503,
          json: {
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Retry', retryable: true },
            meta: { correlation_id: 'overview-fare-mock' },
          },
        })
      : route.fulfill({ json: { data: [], meta: { next_cursor: null } } }),
  );
  await signIn(page);
  const fare = page.locator('[data-region="trip-overview-fare"]');
  await expect(fare.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(fare.getByText('Chưa có dữ liệu', { exact: true })).toHaveCount(0);
  failing = false;
  await fare.getByRole('button', { name: 'Tải lại' }).click();
  await expect(page).toHaveURL(path);
  await expect(fare.getByText('Chưa có dữ liệu', { exact: true })).toBeVisible();
  await expect(fare.getByText('—', { exact: true })).toBeVisible();
  await fare.click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(`${path}/price-watch`);
});

test('HTTP mock: existing fare watches are not reported as empty or as live prices', async ({
  page,
  gateway,
}) => {
  await page.route(`**/api/v1/trips/${tripId}/price-watches*`, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: '99999999-3333-4333-8333-333333333333',
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
          },
        ],
        meta: { next_cursor: 'more-watches' },
      },
    }),
  );
  await signIn(page);
  const fare = page.locator('[data-region="trip-overview-fare"]');
  await expect(fare.getByText('1+ mục theo dõi')).toBeVisible();
  await expect(fare.getByText('Nguồn mô phỏng · MOCK_FLIGHT')).toBeVisible();
  await expect(fare.getByText('Chưa có dữ liệu', { exact: true })).toHaveCount(0);
  await expect(fare.getByText(/9007199254740993|₫/)).toHaveCount(0);
});

test('HTTP mock: overview retains source regions and isolates Plan, Fund and Members results', async ({
  page,
  gateway,
}) => {
  gateway.failures.set(`GET /api/v1/trips/${tripId}/plan`, 503);
  gateway.failures.set(`GET /api/v1/trips/${tripId}/members`, 503);
  await signIn(page);

  const overview = page.locator('[data-flow="trip-overview"]');
  await expect(overview.getByRole('heading', { name: 'Đà Nẵng Gateway' })).toBeVisible();
  await expect(overview.locator('[data-region="trip-overview-summaries"] > section')).toHaveCount(
    4,
  );
  await expect(overview.locator('[data-region="trip-overview-workspace"] > *')).toHaveCount(3);
  const plan = overview.locator('[data-region="trip-overview-itinerary"]');
  const fund = overview.locator('[data-region="trip-overview-fund"]');
  const packing = overview.locator('[data-region="trip-overview-packing"]');
  const map = overview.locator('[data-region="trip-overview-map"]');
  const fare = overview.locator('[data-region="trip-overview-fare"]');
  await expect(plan.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(packing.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(fund.getByText('Chưa bật quỹ nhóm.')).toBeVisible();
  await expect(fund.getByRole('link', { name: 'Ngân sách / Quỹ nhóm' })).toHaveAttribute(
    'href',
    `${path}/fund`,
  );
  await expect(map.getByRole('link', { name: 'Xem bản đồ địa điểm' })).toHaveAttribute(
    'href',
    `${path}/map`,
  );
  await expect(fare.getByRole('link', { name: 'Theo dõi giá vé' })).toHaveAttribute(
    'href',
    `${path}/price-watch`,
  );
  await expect(fare.getByText('Chưa khả dụng')).toHaveCount(0);
  await expect(fare.getByText('Chưa có dữ liệu', { exact: true })).toBeVisible();
  await expect(overview.getByText('Không thể tải danh sách thành viên.')).toBeVisible();
  await expect(plan.getByText('0 hoạt động')).toHaveCount(0);
  await expect(packing.getByText('0/0 món')).toHaveCount(0);

  const fundReadsBeforeRetry = gateway.calls.filter(
    (call) => call.path === `/api/v1/trips/${tripId}/fund`,
  );
  expect(fundReadsBeforeRetry.length).toBeGreaterThan(0);

  gateway.failures.delete(`GET /api/v1/trips/${tripId}/plan`);
  gateway.failures.delete(`GET /api/v1/trips/${tripId}/members`);
  await plan.getByRole('button', { name: 'Tải lại' }).click();
  await overview.getByRole('button', { name: 'Tải lại thành viên' }).click();
  await expect(plan.getByText('Chưa có hoạt động trong ngày này.')).toBeVisible();
  await expect(packing.getByText('0/0 món')).toBeVisible();
  await expect(packing.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(overview.getByText('Đã tải 2 thành viên ở trang đầu.')).toBeVisible();
  await expect(overview.getByRole('link', { name: 'Thành viên', exact: true })).toBeVisible();
  expect(gateway.calls.filter((call) => call.path === `/api/v1/trips/${tripId}/fund`)).toHaveLength(
    fundReadsBeforeRetry.length,
  );
});

test('HTTP mock: Trip read error does not masquerade as a permission denial or trigger panel reads', async ({
  page,
  gateway,
}) => {
  gateway.failures.set(`GET /api/v1/trips/${tripId}`, 503);
  await signIn(page);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(main.getByText('Bạn không có quyền truy cập')).toHaveCount(0);
  await expect(page.locator('[data-flow="trip-overview"]')).toHaveCount(0);
  expect(
    gateway.calls.filter((call) =>
      ['/plan', '/members', '/fund'].some(
        (suffix) => call.path === `/api/v1/trips/${tripId}${suffix}`,
      ),
    ),
  ).toHaveLength(0);
});
