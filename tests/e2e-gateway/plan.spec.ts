import type { Page } from '@playwright/test';
import { expect, login, test, type GatewayModel } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';

async function mockPlan(page: Page, gateway: GatewayModel) {
  const trip = gateway.trips.find((item) => item.id === tripId)!;
  const activity = (id: string, title: string, position: number) => ({
    id, trip_id: tripId, title, position,
    description: null as string | null, public_description: null,
    activity_type: 'WALK', selected_location_id: null,
    starts_at: null, ends_at: null, status: 'TODO', source: 'MANUAL',
    plan_version: trip.plan_version, created_by_user_id: gateway.profile.id,
    completed_by_user_id: null as string | null, completed_at: null as string | null,
  });
  let activities = [activity('activity-one', 'Đi dạo', 0), activity('activity-two', 'Ăn sáng', 1)];
  const writes: { method: string; body: Record<string, unknown>; key: string }[] = [];
  await page.route(`**/api/v1/trips/${tripId}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (data: unknown) => route.fulfill({ json: { data, meta: { correlation_id: 'plan-e2e' } } });
    if (path.endsWith('/plan')) return respond({
      trip_id: tripId, plan_version: trip.plan_version, export_revision: trip.export_revision,
      activities, selected_locations: [], dress_codes: [], packing_items: [],
      permissions: { can_read: true, can_edit: true, can_complete: true },
    });
    if (!path.includes('/activities')) return route.fallback();
    const body = request.postDataJSON() as Record<string, unknown>;
    const key = request.headers()['idempotency-key']!;
    expect(key).toBeTruthy();
    expect(request.headers().authorization).toBe('Bearer e2e-memory-token');
    expect(body.expected_plan_version).toBe(trip.plan_version);
    writes.push({ method: request.method(), body, key });
    trip.plan_version++;
    trip.export_revision++;
    const id = path.split('/').at(-1)!;
    if (request.method() === 'POST') {
      activities.push({ ...activity('activity-created', String(body.title), Number(body.position)), activity_type: String(body.activity_type) });
    } else if (id === 'order') {
      const ids = body.activity_ids as string[];
      expect([...ids].sort()).toEqual(activities.map((item) => item.id).sort());
      activities = ids.map((itemId, position) => ({ ...activities.find((item) => item.id === itemId)!, position }));
    } else if (request.method() === 'DELETE') {
      expect(body.confirmed).toBe(true);
      activities = activities.filter((item) => item.id !== id).map((item, position) => ({ ...item, position }));
    } else if (id === 'completion') {
      const selected = activities.find((item) => item.id === path.split('/').at(-2))!;
      selected.status = String(body.status);
      selected.completed_by_user_id = gateway.profile.id;
      selected.completed_at = '2026-10-23T00:00:00Z';
    } else {
      const selected = activities.find((item) => item.id === id)!;
      if (typeof body.title === 'string') selected.title = body.title;
      if (typeof body.activity_type === 'string') selected.activity_type = body.activity_type;
    }
    activities = activities.map((item) => ({ ...item, plan_version: trip.plan_version }));
    if (request.method() === 'DELETE' || id === 'order') return respond({ plan_version: trip.plan_version, export_revision: trip.export_revision });
    return respond(request.method() === 'POST' ? activities.at(-1) : activities.find((item) => item.id === (id === 'completion' ? path.split('/').at(-2) : id)));
  });
  return { writes };
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`HTTP mock: Plan CRUD, completion and full reorder (${viewport.name})`, async ({ page, gateway }) => {
    await page.setViewportSize(viewport);
    const mock = await mockPlan(page, gateway);
    await login(page);
    await page.goto(`/trips/${tripId}/plan`);
    await expect(page.getByRole('heading', { name: 'Hoạt động trên server' })).toBeVisible();
    await page.getByRole('button', { name: 'Tạo hoạt động trên server' }).click();
    await page.getByLabel('Tên hoạt động', { exact: true }).fill('Tham quan bảo tàng');
    await page.getByLabel('Loại hoạt động', { exact: true }).fill('SIGHTSEEING');
    await page.getByRole('button', { name: 'Lưu trên server' }).click();
    const created = page.getByRole('listitem', { name: 'Tham quan bảo tàng', exact: true });
    await expect(created).toBeVisible();
    await created.getByRole('button', { name: 'Sửa trên server' }).click();
    await page.getByLabel('Tên hoạt động', { exact: true }).fill('Bảo tàng lịch sử');
    await page.getByRole('button', { name: 'Lưu trên server' }).click();
    const edited = page.getByRole('listitem', { name: 'Bảo tàng lịch sử', exact: true });
    await expect(edited).toBeVisible();
    await edited.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
    await expect(edited.getByRole('button', { name: 'Hoàn tất', exact: true })).toHaveCount(0);
    await edited.getByRole('button', { name: 'Đưa lên' }).click();
    await expect.poll(() => mock.writes.filter((write) => write.method === 'PUT').length).toBe(1);
    await edited.getByRole('button', { name: 'Xóa trên server' }).click();
    await page.getByRole('button', { name: 'Xác nhận xóa trên server' }).click();
    await expect(edited).toHaveCount(0);
    expect(mock.writes.map((write) => write.method)).toEqual(['POST', 'PATCH', 'PATCH', 'PUT', 'DELETE']);
    expect(mock.writes.map((write) => write.body.expected_plan_version)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(mock.writes.map((write) => write.key)).size).toBe(5);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hoạt động trên server' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Bảo tàng lịch sử', exact: true })).toHaveCount(0);
  });
}

test('HTTP mock: local draft changes do not send activity mutations', async ({ page, gateway }) => {
  const mock = await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await page.getByRole('button', { name: 'Bản nháp trên thiết bị' }).click();
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  await page.getByRole('button', { name: 'Kéo hoạt động Đi dạo', exact: true }).press('ArrowRight');
  await page.getByLabel('Xem hoạt động Đi dạo', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chỉnh sửa hoạt động' }).first()).toBeVisible();
  expect(mock.writes).toEqual([]);
});
