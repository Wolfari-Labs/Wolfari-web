import { test, expect, login, type GatewayModel } from './gateway-fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const tripId = '11111111-1111-4111-8111-111111111111';
const id = (n: number) => `88888888-1111-4111-8111-${String(n).padStart(12, '0')}`;
const root = `/trips/${tripId}`;
async function install(page: Page, gateway: GatewayModel) {
  const trip = gateway.trips.find((t) => t.id === tripId)!;
  const rows: {
    activities: Record<string, unknown>[];
    selected_locations: Record<string, unknown>[];
    dress_codes: Record<string, unknown>[];
    packing_items: Record<string, unknown>[];
  } = { activities: [], selected_locations: [], dress_codes: [], packing_items: [] };
  const controls = {
    editor: true,
    unknown: false,
    capabilities: true,
    expired: false,
    routeMissing: false,
  };
  const writes: { path: string; body: Record<string, unknown>; key: string | null }[] = [];
  let counter = 0;
  const provider = {
    status: 'SUCCESS',
    provider: 'HTTP test provider',
    fetched_at: '2026-11-01T00:00:00Z',
    stale: false,
    is_mock: false,
    warnings: [],
  };
  await page.route(`**/api/v1/trips/${tripId}/**`, async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const respond = (data: unknown) =>
      route.fulfill({ json: { data, meta: { correlation_id: 'srs12-http-mock' } } });
    const versioned = (items: Record<string, unknown>[]) =>
      items.map((item) => ({ ...item, plan_version: trip.plan_version }));
    if (path.endsWith('/plan'))
      return respond({
        trip_id: tripId,
        plan_version: trip.plan_version,
        export_revision: trip.export_revision,
        activities: [],
        ...Object.fromEntries(Object.entries(rows).map(([key, items]) => [key, versioned(items)])),
        permissions: { can_read: true, can_edit: controls.editor, can_complete: false },
        ...(controls.capabilities
          ? {
              capabilities: Object.fromEntries(
                [
                  'locations_write',
                  'dress_codes_write',
                  'packing_items_write',
                  'packing_assignment',
                  'packing_completion',
                  'place_search',
                  'routes',
                  'route_order_request',
                  'route_order_apply',
                  'packing_dress_request',
                  'packing_dress_apply',
                  'schedule_validation',
                ].map((key) => [key, true]),
              ),
            }
          : {}),
      });
    if (path.endsWith('/schedule-validation'))
      return respond({
        plan_version: trip.plan_version,
        warnings: [],
        unchecked_routes: ['unknown-leg'],
      });
    if (path.endsWith('/recommendations')) {
      const body = request.postDataJSON();
      return respond({
        id: id(99),
        trip_id: tripId,
        type: body.type,
        base_plan_version: trip.plan_version,
        expires_at: controls.expired ? '2000-01-01T00:00:00Z' : '2099-01-01T00:00:00Z',
        status: 'PENDING',
        input_hash: 'hash',
        rule_version: '1',
        provider_sources: [provider],
        warnings: ['Thời tiết chưa có dữ liệu xác nhận'],
        proposal: {
          items: [
            {
              id: 'p1',
              type: 'PACKING_ITEM',
              values: { name: 'Áo mưa', quantity: '1' },
              reason: 'Chuẩn bị khi cần',
              rule_ids: ['rain'],
            },
            {
              id: 'p2',
              type: 'DRESS_CODE',
              values: { scope_type: 'DAY', plan_date: '2026-11-02', label: 'Áo nhẹ' },
              reason: 'Trang phục thuận tiện',
              rule_ids: ['light'],
            },
          ],
        },
      });
    }
    const match =
      /\/(locations|dress-codes|packing-items|recommendations)(?:\/([^/]+))?(?:\/(assignment|completion|apply))?$/.exec(
        path,
      );
    if (!match || request.method() === 'GET') return route.fallback();
    const body = request.postDataJSON() as Record<string, unknown>;
    writes.push({ path, body, key: request.headers()['idempotency-key'] ?? null });
    if (controls.unknown) return route.abort('failed');
    expect(body.expected_plan_version).toBe(trip.plan_version);
    if (match[3] !== 'apply') expect(request.headers()['idempotency-key']).toBeTruthy();
    trip.plan_version++;
    trip.export_revision++;
    if (match[3] === 'apply')
      return respond({
        recommendation_id: id(99),
        apply_request_id: body.apply_request_id,
        applied_plan_version: trip.plan_version,
        created_entity_ids: [],
      });
    const key =
      match[1] === 'locations'
        ? 'selected_locations'
        : match[1] === 'dress-codes'
          ? 'dress_codes'
          : 'packing_items';
    const existing = rows[key].find((v) => v.id === match[2]);
    if (request.method() === 'DELETE') {
      rows[key] = rows[key].filter((v) => v.id !== match[2]);
      return respond({ plan_version: trip.plan_version, export_revision: trip.export_revision });
    }
    if (existing) {
      if (match[3] === 'completion') {
        existing.status = body.status;
        existing.completed_by_user_id = body.status === 'COMPLETED' ? gateway.profile.id : null;
        existing.completed_at = body.status === 'COMPLETED' ? '2026-11-01T01:00:00Z' : null;
      } else {
        const reset =
          ('name' in body && body.name !== existing.name) ||
          ('quantity' in body && Number(body.quantity) !== Number(existing.quantity)) ||
          ('assigned_member_id' in body && body.assigned_member_id !== existing.assigned_member_id);
        Object.assign(existing, body);
        if (reset && key === 'packing_items') {
          existing.status = 'TODO';
          existing.completed_at = null;
          existing.completed_by_user_id = null;
        }
      }
      return respond({ ...existing, plan_version: trip.plan_version });
    }
    const item = {
      id: id(++counter),
      trip_id: tripId,
      source: 'MANUAL',
      ...(key === 'selected_locations'
        ? {
            metadata: {},
            provider: null,
            provider_place_id: null,
            opening_hours: null,
            fetched_at: null,
          }
        : key === 'packing_items'
          ? {
              assigned_member_id: null,
              status: 'TODO',
              completed_at: null,
              completed_by_user_id: null,
            }
          : {}),
      ...body,
    };
    rows[key].push(item);
    return respond({ ...item, plan_version: trip.plan_version });
  });
  await page.route('**/api/v1/travel/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: {
        data: {
          meta: { ...provider, ...(controls.routeMissing ? { status: 'NO_RESULT' } : {}) },
          data: controls.routeMissing
            ? null
            : path.endsWith('/places')
              ? [
                  {
                    id: 'museum',
                    name: 'Bảo tàng provider',
                    address: 'Đà Nẵng',
                    coordinates: { latitude: 16.05, longitude: 108.2 },
                  },
                ]
              : {
                  distance_m: 1200,
                  duration_seconds: 600,
                  geometry: [
                    { latitude: 16, longitude: 108 },
                    { latitude: 16.05, longitude: 108.2 },
                  ],
                },
        },
        meta: { correlation_id: 'travel-http-mock' },
      },
    });
  });
  return { rows, controls, writes, trip };
}
test('SRS12: location and Dress writes survive reload with shared revisions', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  await login(page);
  await page.goto(`${root}/map`);
  await page.getByRole('button', { name: 'Thêm địa điểm', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên', { exact: true }).fill('Bảo tàng thủ công');
  await dialog.getByLabel('Vĩ độ').fill('16.05');
  await dialog.getByLabel('Kinh độ').fill('108.20');
  await dialog.getByRole('button', { name: 'Lưu địa điểm' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bảo tàng thủ công' })).toBeVisible();
  await page.goto(`${root}/dress-code`);
  await page.getByRole('button', { name: 'Thêm dress code', exact: true }).click();
  await dialog.getByLabel('Ngày', { exact: true }).fill('2026-11-02');
  await dialog.getByLabel('Tiêu đề').fill('Áo chống nắng');
  await dialog.getByRole('button', { name: 'Lưu dress code' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Áo chống nắng' })).toBeVisible();
  expect(model.writes).toHaveLength(2);
  expect(model.writes[1]!.body.expected_plan_version).toBe(2);
  expect(model.rows.dress_codes[0]?.scope_type).toBe('DAY');
});
test('SRS12: packing content, assignment, completion and reset are separate authoritative writes', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  await login(page);
  await page.goto(`${root}/packing`);
  await page.getByRole('button', { name: 'Thêm vật dụng', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên', { exact: true }).fill('Áo mưa');
  await dialog.getByRole('button', { name: 'Lưu vật dụng' }).click();
  await expect(dialog).toHaveCount(0);
  expect(model.rows.packing_items[0]?.assigned_member_id).toBeNull();
  expect(model.rows.packing_items[0]?.status).toBe('TODO');
  await page.getByRole('button', { name: 'Phân công Áo mưa', exact: true }).click();
  await dialog.getByLabel('Người chuẩn bị').selectOption(model.trip.current_membership.id);
  await dialog.getByRole('button', { name: 'Lưu phân công' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Hoàn thành Áo mưa', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ hoàn thành Áo mưa', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sửa vật dụng', exact: true }).click();
  await dialog.getByLabel('Số lượng').fill('2');
  await dialog.getByRole('button', { name: 'Lưu vật dụng' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hoàn thành Áo mưa', exact: true })).toBeVisible();
  expect(model.writes).toHaveLength(4);
  expect(model.writes[1]!.path).toContain('/assignment');
  expect(model.writes[2]!.path).toContain('/completion');
});
test('SRS12: non-editor can search and preview DSS, but cannot save or apply', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  model.controls.editor = false;
  await login(page);
  await page.goto(`${root}/map`);
  await page.getByLabel('Từ khóa địa điểm').fill('Bảo tàng');
  await page.getByRole('button', { name: 'Tìm địa điểm', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bảo tàng provider' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu địa điểm' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Yêu cầu gợi ý' }).click();
  await expect(page.getByText('Lý do: Chuẩn bị khi cần')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Áp dụng các thay đổi đã chọn' })).toBeDisabled();
  expect(model.writes).toEqual([]);
});
test('SRS12: DSS only applies selected IDs, with explicit duplicate decision', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  model.rows.packing_items.push({
    id: id(10),
    trip_id: tripId,
    name: 'Áo mưa',
    quantity: '1',
    unit: null,
    category: null,
    note: null,
    due_at: null,
    assigned_member_id: null,
    status: 'TODO',
    source: 'MANUAL',
    completed_by_user_id: null,
    completed_at: null,
  });
  await login(page);
  await page.goto(`${root}/packing`);
  await page.getByRole('button', { name: 'Yêu cầu gợi ý' }).click();
  await page.getByRole('checkbox', { name: 'Áo mưa', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Áp dụng các thay đổi đã chọn' })).toBeDisabled();
  await page
    .getByRole('checkbox', { name: 'Tôi chọn tạo vật dụng riêng dù tương tự mục đã có' })
    .check();
  await page.getByRole('button', { name: 'Áp dụng các thay đổi đã chọn' }).click();
  await expect(page.getByText('Lý do: Chuẩn bị khi cần')).toHaveCount(0);
  expect(model.writes).toHaveLength(1);
  expect(model.writes[0]!.body.selected_item_ids).toEqual(['p1']);
  expect(model.writes[0]!.body.apply_request_id).toBeTruthy();
  expect(model.writes[0]!.key).toBeNull();
});
test('SRS12: unknown Map write blocks Dress after route navigation; original journal is retained', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  model.controls.unknown = true;
  await login(page);
  await page.goto(`${root}/map`);
  await page.getByRole('button', { name: 'Thêm địa điểm', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên', { exact: true }).fill('Chưa rõ');
  await dialog.getByRole('button', { name: 'Lưu địa điểm' }).click();
  await expect(dialog.getByText(/Chưa rõ kết quả lưu/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.goto(`${root}/dress-code`);
  await expect(page.getByRole('button', { name: 'Thêm dress code', exact: true })).toBeDisabled();
  expect(model.writes).toHaveLength(1);
});
test('SRS12: narrow editor remains keyboard-accessible and has no automated accessibility violations', async ({
  page,
  gateway,
}, testInfo) => {
  await install(page, gateway);
  await login(page);
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(`${root}/dress-code`);
  await page.getByRole('button', { name: 'Thêm dress code', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );
  await page.screenshot({ path: testInfo.outputPath('dress-editor-402.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm dress code', exact: true })).toBeFocused();
});

function place(n: number) {
  return {
    id: id(n),
    trip_id: tripId,
    name: `Địa điểm ${n}`,
    address: null,
    latitude: '16',
    longitude: '108',
    provider: null,
    provider_place_id: null,
    source: 'MANUAL',
    opening_hours: null,
    fetched_at: null,
    metadata: {},
  };
}
test('SRS12: route details and missing-route state never write the Plan', async ({
  page,
  gateway,
}, testInfo) => {
  const model = await install(page, gateway);
  model.rows.selected_locations.push(place(20), place(21));
  await login(page);
  await page.goto(`${root}/map`);
  await page.getByLabel('Điểm đi', { exact: true }).selectOption(id(20));
  await page.getByLabel('Điểm đến', { exact: true }).selectOption(id(21));
  await page.getByRole('button', { name: 'Xem tuyến đường', exact: true }).click();
  await expect(page.getByText(/1,2 km · 10 phút/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('map-route.png'), fullPage: true });
  model.controls.routeMissing = true;
  await page.getByRole('button', { name: 'Xem tuyến đường', exact: true }).click();
  await expect(
    page.getByText('Chưa có tuyến đường khả dụng; chưa thể đánh giá lịch trình về mặt di chuyển.'),
  ).toBeVisible();
  expect(model.writes).toEqual([]);
});
test('SRS12: maximum saved locations and every linked Activity block unsafe deletion', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  model.rows.selected_locations.push(...Array.from({ length: 50 }, (_, n) => place(n + 20)));
  model.rows.activities.push({
    id: id(90),
    trip_id: tripId,
    title: 'Chưa xếp giờ nhưng đã gắn địa điểm',
    activity_type: 'WALK',
    description: null,
    public_description: null,
    selected_location_id: id(20),
    starts_at: null,
    ends_at: null,
    scheduled_date: null,
    position: 0,
    status: 'TODO',
    source: 'MANUAL',
    created_by_user_id: gateway.profile.id,
    completed_by_user_id: null,
    completed_at: null,
  });
  await login(page);
  await page.goto(`${root}/map`);
  await expect(page.getByRole('button', { name: 'Thêm địa điểm', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Xóa địa điểm', exact: true }).click();
  await expect(
    page.getByText('Gỡ hoặc đổi địa điểm của các Activity sau trước khi xóa:'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Mở lịch trình để chỉnh sửa Activity' }),
  ).toBeVisible();
  expect(model.writes).toEqual([]);
});
test('SRS12: expired proposals are visible but cannot be selected or applied', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  model.controls.expired = true;
  await login(page);
  await page.goto(`${root}/dress-code`);
  await page.getByRole('button', { name: 'Yêu cầu gợi ý' }).click();
  await expect(
    page.getByText('Gợi ý đã cũ hoặc hết hạn. Yêu cầu gợi ý mới trước khi áp dụng.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Áp dụng các thay đổi đã chọn' })).toBeDisabled();
  expect(model.writes).toEqual([]);
});
test('SRS12: non-editor toggles only current assigned item, then archive removes writes', async ({
  page,
  gateway,
}) => {
  const model = await install(page, gateway);
  model.controls.editor = false;
  const item = {
    trip_id: tripId,
    quantity: '1',
    unit: null,
    category: null,
    note: null,
    due_at: null,
    status: 'COMPLETED',
    source: 'MANUAL',
    completed_by_user_id: gateway.profile.id,
    completed_at: '2026-11-01T01:00:00Z',
  };
  model.rows.packing_items.push(
    { ...item, id: id(10), name: 'Của tôi', assigned_member_id: model.trip.current_membership.id },
    { ...item, id: id(11), name: 'Của người khác', assigned_member_id: id(40) },
    { ...item, id: id(12), name: 'Chưa giao', assigned_member_id: null },
  );
  await login(page);
  await page.goto(`${root}/packing`);
  await expect(
    page.getByRole('button', { name: 'Bỏ hoàn thành Của người khác', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Bỏ hoàn thành Chưa giao', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Bỏ hoàn thành Của tôi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hoàn thành Của tôi', exact: true })).toBeVisible();
  expect(model.writes).toHaveLength(1);
  model.trip.lifecycle = 'ARCHIVED';
  model.trip.archived_at = '2026-11-05T01:00:00Z';
  await page.reload();
  await expect(page.getByRole('button', { name: 'Hoàn thành Của tôi', exact: true })).toHaveCount(
    0,
  );
});
