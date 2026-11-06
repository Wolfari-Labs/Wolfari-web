import type { Page } from '@playwright/test';
import { expect, type GatewayModel } from './gateway-fixture';
const tripId = '11111111-1111-4111-8111-111111111111';
export async function mockPlan(page: Page, gateway: GatewayModel) {
  const trip = gateway.trips.find((item) => item.id === tripId)!;
  const activity = (id: string, title: string, position: number) => ({
    id,
    trip_id: tripId,
    title,
    position,
    description: null as string | null,
    public_description: null as string | null,
    activity_type: 'WALK',
    selected_location_id: null as string | null,
    scheduled_date: null as string | null,
    starts_at: null as string | null,
    ends_at: null as string | null,
    status: 'TODO',
    source: 'MANUAL',
    plan_version: trip.plan_version,
    created_by_user_id: gateway.profile.id,
    completed_by_user_id: null as string | null,
    completed_at: null as string | null,
  });
  let activities = [
    activity('55555555-1111-4111-8111-111111111111', 'Đi dạo', 0),
    activity('55555555-2222-4222-8222-222222222222', 'Ăn sáng', 1),
  ];
  const controls = {
    conflictNext: false,
    forbidden: false,
    failAtWrite: 0,
    failureCode: 'VERSION_CONFLICT',
    unknownAfterCommitAtWrite: 0,
  };
  const selectedLocations: Record<string, unknown>[] = [];
  const writes: { method: string; path: string; body: Record<string, unknown>; key: string }[] = [];
  const receipts = new Map<
    string,
    { fingerprint: string; data: unknown; exportRevision: number }
  >();
  let createdCount = 0;
  await page.route(`**/api/v1/trips/${tripId}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (data: unknown, exportRevision = trip.export_revision) =>
      route.fulfill({
        json: { data, meta: { correlation_id: 'plan-e2e', export_revision: exportRevision } },
      });
    if (path.endsWith('/plan'))
      return respond({
        trip_id: tripId,
        plan_version: trip.plan_version,
        export_revision: trip.export_revision,
        activities,
        selected_locations: selectedLocations.map((location) => ({
          ...location,
          plan_version: trip.plan_version,
        })),
        dress_codes: [],
        packing_items: [],
        permissions: {
          can_read: true,
          can_edit: !controls.forbidden,
          can_complete: !controls.forbidden,
        },
      });
    if (!path.includes('/activities')) return route.fallback();
    const body = request.postDataJSON() as Record<string, unknown>;
    const key = request.headers()['idempotency-key']!;
    expect(key).toBeTruthy();
    expect(request.headers().authorization).toBe('Bearer e2e-memory-token');
    writes.push({ method: request.method(), path, body, key });
    const fingerprint = JSON.stringify({ method: request.method(), path, body });
    const receipt = receipts.get(key);
    if (receipt) {
      expect(fingerprint, 'An idempotent retry must keep the exact command').toBe(
        receipt.fingerprint,
      );
      return respond(receipt.data, receipt.exportRevision);
    }
    expect(body.expected_plan_version, 'Commands must chain confirmed server versions').toBe(
      trip.plan_version,
    );
    if (controls.forbidden || controls.conflictNext || controls.failAtWrite === writes.length) {
      const code = controls.forbidden
        ? 'PERMISSION_DENIED'
        : controls.failAtWrite === writes.length
          ? controls.failureCode
          : 'VERSION_CONFLICT';
      const status =
        code === 'PERMISSION_DENIED' ? 403 : code === 'SERVICE_UNAVAILABLE' ? 503 : 409;
      controls.conflictNext = false;
      return route.fulfill({
        status,
        json: {
          error: {
            code,
            message: 'test',
            retryable: status === 503,
          },
          meta: {},
        },
      });
    }
    trip.plan_version++;
    trip.export_revision++;
    const id = path.split('/').at(-1)!;
    if (request.method() === 'POST') {
      createdCount += 1;
      activities.push({
        ...activity(
          `55555555-3333-4333-8333-${String(createdCount).padStart(12, '0')}`,
          String(body.title),
          Number(body.position),
        ),
        activity_type: String(body.activity_type),
        selected_location_id: (body.selected_location_id ?? null) as string | null,
        scheduled_date: (body.scheduled_date ?? null) as string | null,
        starts_at: (body.starts_at ?? null) as string | null,
        ends_at: (body.ends_at ?? null) as string | null,
        description: (body.description ?? null) as string | null,
        public_description: (body.public_description ?? null) as string | null,
      });
    } else if (id === 'order') {
      const ids = body.activity_ids as string[];
      expect([...ids].sort()).toEqual(activities.map((item) => item.id).sort());
      activities = ids.map((itemId, position) => ({
        ...activities.find((item) => item.id === itemId)!,
        position,
      }));
    } else if (request.method() === 'DELETE') {
      expect(body.confirmed).toBe(true);
      activities = activities
        .filter((item) => item.id !== id)
        .map((item, position) => ({ ...item, position }));
    } else if (id === 'completion') {
      const selected = activities.find((item) => item.id === path.split('/').at(-2))!;
      selected.status = String(body.status);
      selected.completed_by_user_id = gateway.profile.id;
      selected.completed_at = '2026-10-23T00:00:00Z';
    } else {
      const selected = activities.find((item) => item.id === id)!;
      if (typeof body.title === 'string') selected.title = body.title;
      if (typeof body.activity_type === 'string') selected.activity_type = body.activity_type;
      for (const key of [
        'scheduled_date',
        'starts_at',
        'ends_at',
        'description',
        'public_description',
        'selected_location_id',
      ] as const) {
        if (key in body) selected[key] = body[key] as string | null;
      }
    }
    activities = activities.map((item) => ({ ...item, plan_version: trip.plan_version }));
    const data =
      request.method() === 'DELETE' || id === 'order'
        ? { plan_version: trip.plan_version, export_revision: trip.export_revision }
        : request.method() === 'POST'
          ? activities.at(-1)
          : activities.find(
              (item) => item.id === (id === 'completion' ? path.split('/').at(-2) : id),
            );
    receipts.set(key, {
      fingerprint,
      data: structuredClone(data),
      exportRevision: trip.export_revision,
    });
    if (controls.unknownAfterCommitAtWrite === writes.length)
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Receipt lost', retryable: true },
          meta: {},
        },
      });
    return respond(data);
  });
  return {
    writes,
    controls,
    get activities() {
      return activities;
    },
    selectedLocations,
  };
}
