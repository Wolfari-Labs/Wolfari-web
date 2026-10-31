import { test, expect } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const path = `/trips/${tripId}`;

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login?returnTo=' + encodeURIComponent(path));
  await page.getByLabel('Email', { exact: true }).fill('trang@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(' password with spaces ');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(path);
}

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
  await expect(fund.getByRole('link', { name: 'Mở quỹ nhóm' })).toHaveAttribute(
    'href',
    `${path}/fund`,
  );
  await expect(map.getByRole('link', { name: 'Xem bản đồ địa điểm' })).toHaveAttribute(
    'href',
    `${path}/map`,
  );
  await expect(fare.getByRole('link', { name: 'Xem dữ liệu theo dõi giá vé' })).toHaveAttribute(
    'href',
    `${path}/price-watch`,
  );
  await expect(fare.getByText('Chưa khả dụng')).toHaveCount(0);
  await expect(overview.getByText('Không thể tải danh sách thành viên.')).toBeVisible();
  await expect(plan.getByText('0 hoạt động')).toHaveCount(0);
  await expect(packing.getByText('0/0 món')).toHaveCount(0);

  gateway.failures.delete(`GET /api/v1/trips/${tripId}/plan`);
  gateway.failures.delete(`GET /api/v1/trips/${tripId}/members`);
  await plan.getByRole('button', { name: 'Tải lại' }).click();
  await overview.getByRole('button', { name: 'Tải lại thành viên' }).click();
  await expect(plan.getByText('Chưa có hoạt động trong ngày này.')).toBeVisible();
  await expect(packing.getByText('0/0 món')).toBeVisible();
  await expect(overview.getByText('Đã tải 2 thành viên ở trang đầu.')).toBeVisible();
  await expect(overview.getByRole('link', { name: 'Thành viên', exact: true })).toBeVisible();
  expect(gateway.calls.filter((call) => call.path === `/api/v1/trips/${tripId}/fund`)).toHaveLength(
    1,
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
