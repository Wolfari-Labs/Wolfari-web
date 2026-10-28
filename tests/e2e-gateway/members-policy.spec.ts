import { expect, login, test } from './gateway-fixture';

const ownerTripId = '11111111-1111-4111-8111-111111111111';
const memberTripId = '33333333-3333-4333-8333-333333333333';

async function openOwnerMembers(page: Parameters<typeof login>[0]) {
  await login(page);
  await page.goto(`/trips/${ownerTripId}/members`);
  await expect(page.getByText('Trang Gateway', { exact: true })).toBeVisible();
  return page.getByRole('region', { name: 'Danh sách thành viên' });
}

test('HTTP mock: Members pagination preserves opaque cursors, deduplicates IDs, and reveals departed rows only on request', async ({
  page,
  gateway,
}) => {
  const region = await openOwnerMembers(page);
  const first = gateway.calls.find((call) => call.method === 'GET' && call.path.endsWith('/members'))!;
  const firstQuery = new URLSearchParams(first.query);
  expect(firstQuery.get('limit')).toBe('100');
  expect(firstQuery.get('include_left')).toBe('false');
  expect(firstQuery.get('cursor')).toBeNull();

  await region.getByRole('button', { name: 'Tải thêm thành viên' }).click();
  await expect(region.getByText('2 thành viên đã tải')).toBeVisible();
  const memberReads = gateway.calls.filter((call) => call.method === 'GET' && call.path.endsWith('/members'));
  expect(new URLSearchParams(memberReads[1]!.query).get('cursor')).toBe('member-page/+==');
  await expect(region.locator('ul > li')).toHaveCount(2);
  await expect(region.getByText('Trang Gateway', { exact: true })).toHaveCount(1);

  await region.getByLabel('Hiển thị người đã rời').check();
  await expect(region.getByRole('button', { name: 'Tải thêm thành viên' })).toBeVisible();
  const afterToggle = gateway.calls
    .filter((call) => call.method === 'GET' && call.path.endsWith('/members'))
    .at(-1)!;
  expect(new URLSearchParams(afterToggle.query).get('include_left')).toBe('true');
  expect(new URLSearchParams(afterToggle.query).get('cursor')).toBeNull();
  await region.getByRole('button', { name: 'Tải thêm thành viên' }).click();
  await expect(region.getByText(/· Đã rời/)).toBeVisible();
  await expect(region.locator('ul > li')).toHaveCount(3);
});

test('HTTP mock: a later-page read error keeps loaded rows and retry uses the same cursor', async ({
  page,
  gateway,
}) => {
  const region = await openOwnerMembers(page);
  const path = `/api/v1/trips/${ownerTripId}/members`;
  gateway.failures.set(`GET ${path}`, 503);
  await region.getByRole('button', { name: 'Tải thêm thành viên' }).click();
  await expect(region.getByText(/Chưa tải được trang tiếp theo/)).toBeVisible();
  await expect(region.getByText('Trang Gateway', { exact: true })).toBeVisible();
  await expect(region.locator('ul > li')).toHaveCount(2);

  gateway.failures.delete(`GET ${path}`);
  await region.getByRole('button', { name: 'Thử lại trang này' }).click();
  await expect(region.getByText('2 thành viên đã tải')).toBeVisible();
  const pages = gateway.calls.filter((call) => call.method === 'GET' && call.path === path);
  expect(pages).toHaveLength(3);
  expect(pages.slice(1).map((call) => new URLSearchParams(call.query).get('cursor'))).toEqual([
    'member-page/+==',
    'member-page/+==',
  ]);
});

test('HTTP mock: active Owner saves basic policy and confirms it from the refreshed Trip projection', async ({
  page,
  gateway,
}) => {
  await openOwnerMembers(page);
  await page.getByRole('button', { name: 'Quyền sửa lịch trình' }).click();
  await page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' }).selectOption('ALL_MEMBERS');
  await page.getByRole('button', { name: 'Lưu quyền' }).click();
  await expect(page.getByText('Đã xác nhận quyền và danh sách Editor từ server.')).toBeVisible();

  const writes = gateway.calls.filter(
    (call) => call.method === 'PUT' && call.path === `/api/v1/trips/${ownerTripId}/plan-policy`,
  );
  expect(writes).toHaveLength(1);
  expect(writes[0]!.body).toEqual({
    policy: 'ALL_MEMBERS',
    editor_member_ids: [],
    expected_membership_revision: 1,
  });
  expect(writes[0]!.idempotencyKey).toBeTruthy();
  expect(gateway.trips.find((trip) => trip.id === ownerTripId)?.plan_edit_policy).toBe('ALL_MEMBERS');
  expect(
    gateway.calls.filter(
      (call) => call.method === 'GET' && call.path === `/api/v1/trips/${ownerTripId}`,
    ).length,
  ).toBeGreaterThan(1);
  expect(
    gateway.calls.filter(
      (call) => call.method === 'GET' && call.path === `/api/v1/trips/${ownerTripId}/members`,
    ).length,
  ).toBeGreaterThan(1);
});

test('HTTP mock: policy conflict refetches membership revision and requires a new explicit submission', async ({
  page,
  gateway,
}) => {
  await openOwnerMembers(page);
  gateway.planPolicyConflictOnce = true;
  await page.getByRole('button', { name: 'Quyền sửa lịch trình' }).click();
  await page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' }).selectOption('ALL_MEMBERS');
  await page.getByRole('button', { name: 'Lưu quyền' }).click();
  await expect(page.getByText(/Quyền chuyến đi đã thay đổi/)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' })).toHaveValue(
    'ALL_MEMBERS',
  );
  let writes = gateway.calls.filter(
    (call) => call.method === 'PUT' && call.path === `/api/v1/trips/${ownerTripId}/plan-policy`,
  );
  expect(writes).toHaveLength(1);
  expect((writes[0]!.body as { expected_membership_revision: number }).expected_membership_revision).toBe(1);

  await page.getByRole('button', { name: 'Lưu quyền' }).click();
  await expect(page.getByText('Đã xác nhận quyền và danh sách Editor từ server.')).toBeVisible();
  writes = gateway.calls.filter(
    (call) => call.method === 'PUT' && call.path === `/api/v1/trips/${ownerTripId}/plan-policy`,
  );
  expect(writes).toHaveLength(2);
  expect((writes[1]!.body as { expected_membership_revision: number }).expected_membership_revision).toBe(2);
  expect(writes[1]!.idempotencyKey).not.toBe(writes[0]!.idempotencyKey);
});

test('HTTP mock: unknown policy outcome is not called saved and retry reuses the same intent', async ({
  page,
  gateway,
}) => {
  await openOwnerMembers(page);
  gateway.planPolicyUnknownOnce = true;
  await page.getByRole('button', { name: 'Quyền sửa lịch trình' }).click();
  await page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' }).selectOption('ALL_MEMBERS');
  await page.getByRole('button', { name: 'Lưu quyền' }).click();
  await expect(page.getByText(/Chưa rõ kết quả/)).toBeVisible();
  await expect(page.getByText(/Đã xác nhận quyền mới/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thử lại cùng yêu cầu quyền' })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Quyền sửa lịch trình', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' })).toHaveValue('ALL_MEMBERS');
  await page.getByRole('button', { name: 'Thử lại cùng yêu cầu quyền' }).click();
  await expect(page.getByText('Đã xác nhận quyền và danh sách Editor từ server.')).toBeVisible();
  const writes = gateway.calls.filter(
    (call) => call.method === 'PUT' && call.path === `/api/v1/trips/${ownerTripId}/plan-policy`,
  );
  expect(writes).toHaveLength(2);
  expect(writes[1]!.body).toEqual(writes[0]!.body);
  expect(writes[1]!.idempotencyKey).toBe(writes[0]!.idempotencyKey);
});

test('HTTP mock: SELECTED uses membership IDs; OWNER_ONLY preserves inactive assignments; archived and member writers blocked', async ({
  page,
  gateway,
}) => {
  await login(page);
  await page.goto(`/trips/${memberTripId}/members`);
  await expect(page.getByText('Trang Gateway', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quyền sửa lịch trình' })).toHaveCount(0);

  const owner = gateway.trips.find((trip) => trip.id === ownerTripId)!;
  owner.plan_edit_policy = 'SELECTED_MEMBERS';
  await page.goto(`/trips/${ownerTripId}/members`);
  await expect(page.getByRole('button', { name: 'Quyền sửa lịch trình' })).toBeEnabled();
  await page.getByRole('button', { name: 'Quyền sửa lịch trình' }).click();
  await expect(page.getByRole('combobox', { name: 'Ai có thể sửa lịch trình' })).toHaveValue(
    'SELECTED_MEMBERS',
  );
  await page.getByRole('checkbox', { name: 'Member Gateway', exact: true }).check();
  await page.getByRole('button', { name: 'Lưu quyền' }).click();
  await expect(page.getByText('Đã xác nhận quyền và danh sách Editor từ server.')).toBeVisible();
  const memberId = 'b1111111-1111-4111-8111-111111111111';
  expect(gateway.editorAssignments.get(ownerTripId)).toEqual([memberId]);
  await page.getByLabel('Ai có thể sửa lịch trình').selectOption('OWNER_ONLY');
  await page.getByRole('button', { name: 'Lưu quyền' }).click();
  await expect(page.getByText('Đã xác nhận quyền và danh sách Editor từ server.')).toBeVisible();
  expect(gateway.editorAssignments.get(ownerTripId)).toEqual([memberId]);
  const writes = gateway.calls.filter(call => call.method === 'PUT' && call.path.endsWith('/plan-policy'));
  expect(writes.map(call => (call.body as { editor_member_ids: string[] }).editor_member_ids)).toEqual([[memberId], []]);
  await page.reload();
  await page.getByRole('button', { name: 'Quyền sửa lịch trình' }).click();
  await page.getByLabel('Ai có thể sửa lịch trình').selectOption('SELECTED_MEMBERS');
  await expect(page.getByRole('checkbox', { name: 'Member Gateway', exact: true })).toBeChecked();

  owner.plan_edit_policy = 'OWNER_ONLY';
  owner.lifecycle = 'ARCHIVED';
  owner.archived_at = '2026-10-01T00:00:00Z';
  await page.goto(`/trips/${ownerTripId}/members`);
  await page.getByRole('button', { name: 'Quyền sửa lịch trình' }).click();
  await expect(page.getByRole('button', { name: 'Lưu quyền' })).toBeDisabled();
});
