import { test, expect } from './gateway-fixture';

// Browser-to-Gateway contract coverage with HTTP route mocks only; this does not exercise a real Backend.
const firstTripId = '11111111-1111-4111-8111-111111111111';
const createdTripId = '99999999-9999-4999-8999-999999999999';

test('HTTP mock: login, cursor list, detail, create and conflict-safe settings update', async ({
  page,
  gateway,
}) => {
  await page.goto('/login?returnTo=%2Ftrips');
  await page.getByLabel('Email', { exact: true }).fill('trang@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(' password with spaces ');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.locator('article[data-trip-id]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Mở chuyến đi Đà Nẵng Gateway' })).toBeVisible();
  await page.getByRole('button', { name: 'Tải thêm chuyến đi' }).click();
  await expect(page.locator('article[data-trip-id]')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Mở chuyến đi Phú Quốc Gateway' })).toBeVisible();

  const listCalls = gateway.calls.filter(
    (call) => call.method === 'GET' && call.path === '/api/v1/trips',
  );
  const firstPageCalls = listCalls.filter(
    (call) => new URLSearchParams(call.query).get('cursor') === null,
  );
  const secondPageCalls = listCalls.filter(
    (call) => new URLSearchParams(call.query).get('cursor') === 'trip-page-two/+==',
  );
  expect(firstPageCalls.length).toBeGreaterThanOrEqual(1);
  expect(secondPageCalls).toHaveLength(1);
  expect(new URLSearchParams(firstPageCalls[0]!.query).get('limit')).toBe('20');

  await page.getByRole('link', { name: 'Mở chuyến đi Đà Nẵng Gateway' }).click();
  await expect(page).toHaveURL(`/trips/${firstTripId}`);
  await expect(page.locator('[data-flow="trip-overview"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đà Nẵng Gateway', exact: true })).toBeVisible();

  await page.goto('/trips/new');
  await page.getByLabel('Tên chuyến đi').fill('Huế Gateway mới');
  await expect(page.getByLabel('Điểm đến chính')).toHaveCount(0);
  await page.getByLabel('Ngày đi').fill('2026-12-10');
  await page.getByLabel('Ngày về').fill('2026-12-12');
  await page.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
  const success = page.getByRole('dialog', { name: 'Chuyến đi đã sẵn sàng' });
  await expect(success).toBeVisible();

  const createCall = gateway.calls.find(
    (call) => call.method === 'POST' && call.path === '/api/v1/trips',
  );
  expect(createCall).toBeDefined();
  expect(createCall!.body).toEqual({
    name: 'Huế Gateway mới',
    start_at: '2026-12-09T17:00:00.000Z',
    end_at: '2026-12-12T17:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    client_request_id: createCall!.idempotencyKey,
  });
  expect(createCall!.idempotencyKey).toMatch(/.+/);

  await success.getByRole('link', { name: /Mở chuyến đi/ }).click();
  await expect(page).toHaveURL(`/trips/${createdTripId}`);
  await expect(page.getByRole('heading', { name: 'Huế Gateway mới', exact: true })).toBeVisible();

  const settingsUrl = `/trips/${createdTripId}/settings`;
  await page.goto(settingsUrl);
  await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click();
  const publicDescription = page.getByRole('textbox', { name: 'Mô tả công khai' });
  await publicDescription.fill('Giới thiệu công khai từ Gateway.');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page).toHaveURL(settingsUrl);
  await expect(page.getByText('Đã lưu thông tin chuyến đi.')).toBeVisible();
  await expect(page.getByText('Giới thiệu công khai từ Gateway.')).toBeVisible();

  let patches = gateway.calls.filter(
    (call) => call.method === 'PATCH' && call.path === `/api/v1/trips/${createdTripId}`,
  );
  expect(patches).toHaveLength(1);
  expect(patches[0]!.body).toEqual({
    public_description: 'Giới thiệu công khai từ Gateway.',
    expected_plan_version: 1,
    expected_export_revision: 1,
  });
  expect(patches[0]!.idempotencyKey).toMatch(/.+/);

  await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click();
  await publicDescription.fill('Bản nháp phải được giữ sau xung đột.');
  gateway.tripConflictOnce = true;
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText(/Thông tin chuyến đi đã thay đổi/)).toBeVisible();
  await expect(publicDescription).toHaveValue('Bản nháp phải được giữ sau xung đột.');

  patches = gateway.calls.filter(
    (call) => call.method === 'PATCH' && call.path === `/api/v1/trips/${createdTripId}`,
  );
  expect(patches).toHaveLength(2);
  expect(patches[1]!.body).toMatchObject({
    public_description: 'Bản nháp phải được giữ sau xung đột.',
    expected_export_revision: 2,
  });

  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page).toHaveURL(settingsUrl);
  await expect(page.getByText('Đã lưu thông tin chuyến đi.')).toBeVisible();
  patches = gateway.calls.filter(
    (call) => call.method === 'PATCH' && call.path === `/api/v1/trips/${createdTripId}`,
  );
  expect(patches).toHaveLength(3);
  expect(patches[2]!.body).toEqual({
    public_description: 'Bản nháp phải được giữ sau xung đột.',
    expected_plan_version: 1,
    expected_export_revision: 3,
  });
  expect(patches[2]!.idempotencyKey).not.toBe(patches[1]!.idempotencyKey);
});
