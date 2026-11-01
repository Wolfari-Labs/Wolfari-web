import { expect, test, login, type GatewayModel } from './gateway-fixture';
import type { Page } from '@playwright/test';

const tripId = '11111111-1111-4111-8111-111111111111';
const tripPath = `/trips/${tripId}`;
const planPath = `/api/v1/trips/${tripId}/plan`;
const locationId = '66666666-1111-4111-8111-111111111111';
const unscheduledLocationId = '66666666-2222-4222-8222-222222222222';
const activityId = '55555555-1111-4111-8111-111111111111';

interface PlanRows {
  activities: Record<string, unknown>[];
  selected_locations: Record<string, unknown>[];
  dress_codes: Record<string, unknown>[];
  packing_items: Record<string, unknown>[];
}

async function mockProjection(
  page: Page,
  gateway: GatewayModel,
  rows: Partial<PlanRows> = {},
  hold?: { onRequest: () => void; untilRelease: Promise<void> },
) {
  const trip = gateway.trips.find((item) => item.id === tripId)!;
  await page.route(`**${planPath}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (hold) {
      hold.onRequest();
      await hold.untilRelease;
    }
    return route.fulfill({
      json: {
        data: {
          trip_id: tripId,
          plan_version: trip.plan_version,
          export_revision: trip.export_revision,
          activities: rows.activities ?? [],
          selected_locations: rows.selected_locations ?? [],
          dress_codes: rows.dress_codes ?? [],
          packing_items: rows.packing_items ?? [],
          permissions: { can_read: true, can_edit: true, can_complete: true },
        },
        meta: { correlation_id: 'cp07-projection' },
      },
    });
  });
}

function selectedLocation(id: string, name: string, coordinates: boolean) {
  return {
    id,
    trip_id: tripId,
    name,
    address: 'Đà Nẵng',
    latitude: coordinates ? '16.05' : null,
    longitude: coordinates ? '108.20' : null,
    provider: null,
    provider_place_id: null,
    source: 'MANUAL',
    opening_hours: null,
    fetched_at: null,
    metadata: {},
    plan_version: 1,
  };
}

function activity() {
  return {
    id: activityId,
    trip_id: tripId,
    title: 'Đi bộ sáng',
    position: 0,
    description: null,
    public_description: null,
    activity_type: 'WALK',
    selected_location_id: locationId,
    scheduled_date: '2026-11-02',
    starts_at: null,
    ends_at: null,
    status: 'TODO',
    source: 'MANUAL',
    plan_version: 1,
    created_by_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    completed_by_user_id: null,
    completed_at: null,
  };
}

function tripWrites(gateway: GatewayModel) {
  return gateway.calls.filter(
    (call) => call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET',
  );
}

test('CP07 Map reads only saved locations and filters scheduled/unscheduled locally', async ({
  page,
  gateway,
}) => {
  await mockProjection(page, gateway, {
    activities: [activity()],
    selected_locations: [
      selectedLocation(locationId, 'Bãi biển Mỹ Khê', true),
      selectedLocation(unscheduledLocationId, 'Ngũ Hành Sơn', false),
    ],
  });
  await login(page);
  await page.goto(`${tripPath}/map`);

  const map = page.locator('[data-flow="gateway-map-read"]');
  await expect(map.getByText('Bãi biển Mỹ Khê', { exact: true }).first()).toBeVisible();
  await expect(map.getByText('Ngũ Hành Sơn', { exact: true }).first()).toBeVisible();
  await expect(map.getByText('Bản đồ nền chưa khả dụng')).toBeVisible();
  await map.getByRole('button', { name: 'Trong lịch', exact: true }).click();
  await expect(map.getByRole('button', { name: /Bãi biển Mỹ Khê/ })).toBeVisible();
  await expect(map.getByRole('button', { name: /Ngũ Hành Sơn/ })).toHaveCount(0);
  await map.getByRole('button', { name: 'Chưa xếp', exact: true }).click();
  await expect(map.getByRole('button', { name: /Ngũ Hành Sơn/ })).toBeVisible();
  await expect(map.getByRole('button', { name: /Bãi biển Mỹ Khê/ })).toHaveCount(0);
  await expect(map.getByText('Chưa có tọa độ hợp lệ')).toBeVisible();
  await expect(map.getByRole('button', { name: /Lưu|Thêm địa điểm|Bỏ chọn/ })).toHaveCount(0);
  expect(tripWrites(gateway)).toEqual([]);
});

test('CP07 Dress projects real scope/description and local scope filter without save controls', async ({
  page,
  gateway,
}) => {
  await mockProjection(page, gateway, {
    activities: [activity()],
    dress_codes: [
      {
        id: '88888888-1111-4111-8111-111111111111',
        trip_id: tripId,
        scope_type: 'TRIP',
        plan_date: null,
        activity_id: null,
        label: 'Trang phục thoáng mát',
        description: 'Áo nhẹ cho cả chuyến',
        public_description: null,
        source: 'MANUAL',
        plan_version: 1,
      },
      {
        id: '88888888-2222-4222-8222-222222222222',
        trip_id: tripId,
        scope_type: 'DAY',
        plan_date: '2026-11-02',
        activity_id: null,
        label: 'Áo chống nắng',
        description: null,
        public_description: 'Mang theo trong ngày thứ hai',
        source: 'MANUAL',
        plan_version: 1,
      },
      {
        id: '88888888-3333-4333-8333-333333333333',
        trip_id: tripId,
        scope_type: 'ACTIVITY',
        plan_date: null,
        activity_id: activityId,
        label: 'Giày đi bộ',
        description: 'Giày dễ di chuyển',
        public_description: null,
        source: 'MANUAL',
        plan_version: 1,
      },
    ],
  });
  await login(page);
  await page.goto(`${tripPath}/dress-code`);

  await expect(page.getByText('Trang phục thoáng mát', { exact: true })).toBeVisible();
  await expect(page.getByText('Áo nhẹ cho cả chuyến', { exact: true })).toBeVisible();
  await expect(page.getByText('Áo chống nắng', { exact: true })).toBeVisible();
  await expect(page.getByText('Giày đi bộ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Theo ngày', exact: true }).click();
  await expect(page.getByText('Áo chống nắng', { exact: true })).toBeVisible();
  await expect(page.getByText('Trang phục thoáng mát', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mang theo trong ngày thứ hai', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Lưu|Thêm hướng dẫn|Tải ảnh|Áp dụng/ }),
  ).toHaveCount(0);
  expect(tripWrites(gateway)).toEqual([]);
});

test('CP07 Packing reports real progress and renders completed status without write actions', async ({
  page,
  gateway,
}) => {
  const membershipId = gateway.trips[0]!.current_membership.id;
  await mockProjection(page, gateway, {
    packing_items: [
      {
        id: '99999999-1111-4111-8111-111111111111',
        trip_id: tripId,
        name: 'Áo mưa',
        quantity: '2',
        unit: 'cái',
        note: 'Cho ngày mưa',
        category: 'Quần áo',
        assigned_member_id: membershipId,
        due_at: '2026-11-01T10:00:00Z',
        status: 'COMPLETED',
        source: 'MANUAL',
        completed_by_user_id: gateway.profile.id,
        completed_at: '2026-11-01T08:00:00Z',
        plan_version: 1,
      },
      {
        id: '99999999-2222-4222-8222-222222222222',
        trip_id: tripId,
        name: 'Sạc dự phòng',
        quantity: '1',
        unit: null,
        note: null,
        category: 'Điện tử',
        assigned_member_id: null,
        due_at: null,
        status: 'TODO',
        source: 'MANUAL',
        completed_by_user_id: null,
        completed_at: null,
        plan_version: 1,
      },
    ],
  });
  await login(page);
  await page.goto(`${tripPath}/packing`);

  await expect(page.getByText('1/2 món đã hoàn thành')).toBeVisible();
  await expect(page.getByText('Áo mưa', { exact: true })).toBeVisible();
  await expect(page.getByText('Sạc dự phòng', { exact: true })).toBeVisible();
  await expect(page.getByText('Quần áo', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Điện tử', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Danh sách hiện chỉ hỗ trợ xem.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Thêm vật dụng|Đánh dấu|Thao tác Áo mưa/ }),
  ).toHaveCount(0);
  expect(tripWrites(gateway)).toEqual([]);
});

test('CP07 empty Map/Dress/Packing remain readable and issue no writes', async ({
  page,
  gateway,
}) => {
  await login(page);
  for (const [path, emptyText] of [
    ['map', /Chuyến đi chưa có địa điểm/],
    ['dress-code', /Chưa có hướng dẫn trang phục/],
    ['packing', /Chưa có hành lý đã lưu/],
  ] as const) {
    await page.goto(`${tripPath}/${path}`);
    await expect(page.getByText(emptyText).first()).toBeVisible();
  }
  expect(tripWrites(gateway)).toEqual([]);
});

const loadingRows: Partial<PlanRows> = {
  selected_locations: [selectedLocation(locationId, 'Bãi biển Mỹ Khê', false)],
  dress_codes: [
    {
      id: '88888888-1111-4111-8111-111111111111',
      trip_id: tripId,
      scope_type: 'TRIP',
      plan_date: null,
      activity_id: null,
      label: 'Trang phục thoáng mát',
      description: 'Áo nhẹ cho cả chuyến',
      public_description: null,
      source: 'MANUAL',
      plan_version: 1,
    },
  ],
  packing_items: [
    {
      id: '99999999-1111-4111-8111-111111111111',
      trip_id: tripId,
      name: 'Áo mưa',
      quantity: '2',
      unit: 'cái',
      note: null,
      category: 'Quần áo',
      assigned_member_id: null,
      due_at: null,
      status: 'TODO',
      source: 'MANUAL',
      completed_by_user_id: null,
      completed_at: null,
      plan_version: 1,
    },
  ],
};

for (const { path, flow, savedText } of [
  { path: 'map', flow: 'gateway-map-read', savedText: 'Bãi biển Mỹ Khê' },
  { path: 'dress-code', flow: 'gateway-dress-read', savedText: 'Trang phục thoáng mát' },
  { path: 'packing', flow: 'packing-read', savedText: 'Áo mưa' },
] as const) {
  test(`CP07 ${path} holds loading until Plan read completes`, async ({ page, gateway }) => {
    let markRequest!: () => void;
    const requested = new Promise<void>((resolve) => {
      markRequest = resolve;
    });
    let releasePlan!: () => void;
    const held = new Promise<void>((resolve) => {
      releasePlan = resolve;
    });
    await mockProjection(page, gateway, loadingRows, {
      onRequest: markRequest,
      untilRelease: held,
    });
    await login(page);
    try {
      await page.goto(`${tripPath}/${path}`);
      await requested;
      const route = page.locator(`[data-flow="${flow}"]`);
      await expect(route.getByRole('heading', { name: 'Đang tải…' })).toBeVisible();
      await expect(route.getByText(savedText, { exact: true })).toHaveCount(0);
      expect(tripWrites(gateway)).toEqual([]);
      releasePlan();
      await expect(route.getByText(savedText, { exact: true }).first()).toBeVisible();
      await expect(route.getByRole('heading', { name: 'Đang tải…' })).toHaveCount(0);
      expect(tripWrites(gateway)).toEqual([]);
    } finally {
      releasePlan();
    }
  });
}

for (const path of ['map', 'dress-code', 'packing'] as const) {
  test(`CP07 ${path} exposes Plan read error and retry`, async ({ page, gateway }) => {
    gateway.failures.set(`GET ${planPath}`, 503);
    await login(page);
    await page.goto(`${tripPath}/${path}`);
    await expect(page.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
    gateway.failures.delete(`GET ${planPath}`);
    await page.getByRole('button', { name: 'Tải lại' }).click();
    await expect(page.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toHaveCount(0);
    expect(tripWrites(gateway)).toEqual([]);
  });
}

test('CP07 read permission denial blocks all three projection routes', async ({
  page,
  gateway,
}) => {
  gateway.trips[0]!.permissions.can_read = false;
  await login(page);
  for (const path of ['map', 'dress-code', 'packing'] as const) {
    await page.goto(`${tripPath}/${path}`);
    await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeVisible();
  }
  expect(tripWrites(gateway)).toEqual([]);
});
