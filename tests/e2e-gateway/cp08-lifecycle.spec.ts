import { expect, login, test } from './gateway-fixture';

const ownerTripId = '11111111-1111-4111-8111-111111111111';
const memberTripId = '33333333-3333-4333-8333-333333333333';

const payload = (data: unknown) => ({ data, meta: { correlation_id: 'cp08-lifecycle' } });

test('HTTP mock: Owner removal stays pending until operation confirmation and keeps status across tabs', async ({
  page,
  gateway,
}) => {
  const memberId = `b${ownerTripId.slice(1)}`;
  const writes: { key: string; body: unknown }[] = [];
  let operationState: 'PROCESSING' | 'SUCCEEDED' = 'PROCESSING';

  await page.route(`**/api/v1/trips/${ownerTripId}/members/${memberId}`, async (route) => {
    const request = route.request();
    expect(request.method()).toBe('DELETE');
    const key = request.headers()['idempotency-key'];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    const body: unknown = request.postDataJSON();
    expect(body).toEqual({
      reason: 'Không còn tham gia chuyến đi',
      expected_membership_revision: 1,
    });
    writes.push({ key: key!, body });
    await route.fulfill({
      status: 202,
      json: payload({ operation_id: key, trip_id: ownerTripId, state: 'PROCESSING' }),
    });
  });
  await page.route('**/api/v1/operations/*', async (route) => {
    const key = route.request().url().split('/').at(-1);
    expect(key).toBe(writes[0]?.key);
    await route.fulfill({
      json: payload({ operation_id: key, trip_id: ownerTripId, state: operationState }),
    });
  });

  await login(page);
  await page.goto(`/trips/${ownerTripId}/members`);
  const region = page.getByRole('region', { name: 'Danh sách thành viên' });
  await expect(region.getByText('Member Gateway', { exact: true })).toBeVisible();
  await region.getByRole('button', { name: 'Xóa thành viên · Member Gateway' }).click();
  await page.getByRole('textbox', { name: 'Lý do rời/xóa' }).fill('Không còn tham gia chuyến đi');
  await page.getByRole('button', { name: 'Xác nhận rời/xóa' }).click();

  const status = page.getByRole('region', { name: 'Kết quả thao tác' });
  await expect(status.getByText('Đang xử lý. Vui lòng chờ xác nhận.')).toBeVisible();
  await expect(region.getByText('Member Gateway', { exact: true })).toBeVisible();
  await expect(
    region.getByRole('button', { name: 'Xóa thành viên · Member Gateway' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Lời mời', exact: true }).click();
  await expect(status).toBeVisible();
  expect(writes).toHaveLength(1);

  operationState = 'SUCCEEDED';
  await status.getByRole('button', { name: 'Kiểm tra lại kết quả' }).click();
  await expect(status.getByText('Đã hoàn tất thao tác.')).toBeVisible();
  await page.getByRole('button', { name: 'Thành viên', exact: true }).click();
  // The mock's member projection remains stale. The UI must not remove its row optimistically.
  await expect(region.getByText('Member Gateway', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(gateway.calls.some((call) => call.method === 'POST' && call.path.endsWith('/leave'))).toBe(
    false,
  );
});

test('HTTP mock: Member leave keeps the same intent after unknown outcome and exposes confirmed result after access loss', async ({
  page,
  gateway,
}) => {
  const writes: { key: string; body: unknown }[] = [];
  let operationState: 'PENDING_RECOVERY' | 'SUCCEEDED' = 'PENDING_RECOVERY';
  let confirmed = false;

  await page.route(`**/api/v1/trips/${memberTripId}/leave`, async (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    const key = request.headers()['idempotency-key'];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    const body: unknown = request.postDataJSON();
    expect(body).toEqual({
      reason: 'Không thể tiếp tục chuyến đi',
      expected_membership_revision: 1,
    });
    writes.push({ key: key!, body });
    if (writes.length === 1) {
      await route.fulfill({
        status: 503,
        json: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Unknown write result', retryable: true },
          meta: { correlation_id: 'cp08-unknown' },
        },
      });
      return;
    }
    await route.fulfill({
      status: 202,
      json: payload({ operation_id: key, trip_id: memberTripId, state: 'PENDING_RECOVERY' }),
    });
  });
  await page.route('**/api/v1/operations/*', async (route) => {
    const key = route.request().url().split('/').at(-1);
    expect(key).toBe(writes[0]?.key);
    await route.fulfill({
      json: payload({ operation_id: key, trip_id: memberTripId, state: operationState }),
    });
  });
  await page.route(`**/api/v1/trips/${memberTripId}`, async (route) => {
    if (!confirmed) return route.fallback();
    const current = gateway.trips.find((trip) => trip.id === memberTripId)!;
    await route.fulfill({
      json: payload({
        ...current,
        current_membership: { ...current.current_membership, left_at: '2026-11-01T10:00:00Z' },
        permissions: { can_read: false, can_update: false },
      }),
    });
  });

  await login(page);
  await page.goto(`/trips/${memberTripId}/members`);
  await expect(page.getByRole('button', { name: 'Rời chuyến đi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rời chuyến đi', exact: true }).click();
  await page.getByRole('textbox', { name: 'Lý do rời/xóa' }).fill('Không thể tiếp tục chuyến đi');
  await page.getByRole('button', { name: 'Xác nhận rời/xóa' }).click();

  const status = page.getByRole('region', { name: 'Kết quả thao tác' });
  await expect(
    status.getByText('Chưa xác nhận được kết quả. Kiểm tra lại hoặc gửi lại đúng yêu cầu.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rời chuyến đi', exact: true })).toBeDisabled();
  await status.getByRole('button', { name: 'Gửi lại đúng yêu cầu' }).click();
  await expect(
    status.getByText('Đang chờ kết nối phục hồi. Không tạo giao dịch thay thế.'),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);

  operationState = 'SUCCEEDED';
  confirmed = true;
  await status.getByRole('button', { name: 'Kiểm tra lại kết quả' }).click();
  await expect(status.getByText('Đã hoàn tất thao tác.')).toBeVisible();
  await expect(
    page.getByText(
      'Thao tác đã gửi vẫn có thể kiểm tra kết quả ở phía trên sau khi rời chuyến đi.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Về danh sách chuyến đi' })).toBeVisible();
  expect(writes).toHaveLength(2);
});
