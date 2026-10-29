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
    public_description: null,
    activity_type: 'WALK',
    selected_location_id: null,
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
  const controls = { conflictNext: false, forbidden: false };
  const writes: { method: string; body: Record<string, unknown>; key: string }[] = [];
  await page.route(`**/api/v1/trips/${tripId}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (data: unknown) =>
      route.fulfill({
        json: { data, meta: { correlation_id: 'plan-e2e', export_revision: trip.export_revision } },
      });
    if (path.endsWith('/plan'))
      return respond({
        trip_id: tripId,
        plan_version: trip.plan_version,
        export_revision: trip.export_revision,
        activities,
        selected_locations: [],
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
    expect(body.expected_plan_version).toBe(trip.plan_version);
    writes.push({ method: request.method(), body, key });
    if (controls.forbidden || controls.conflictNext) {
      const status = controls.forbidden ? 403 : 409;
      controls.conflictNext = false;
      return route.fulfill({
        status,
        json: {
          error: {
            code: status === 403 ? 'PERMISSION_DENIED' : 'VERSION_CONFLICT',
            message: 'test',
            retryable: false,
          },
          meta: {},
        },
      });
    }
    trip.plan_version++;
    trip.export_revision++;
    const id = path.split('/').at(-1)!;
    if (request.method() === 'POST') {
      activities.push({
        ...activity(
          '55555555-3333-4333-8333-333333333333',
          String(body.title),
          Number(body.position),
        ),
        activity_type: String(body.activity_type),
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
      for (const key of ['scheduled_date', 'starts_at', 'ends_at', 'description'] as const) {
        if (key in body) selected[key] = body[key] as string | null;
      }
    }
    activities = activities.map((item) => ({ ...item, plan_version: trip.plan_version }));
    if (request.method() === 'DELETE' || id === 'order')
      return respond({ plan_version: trip.plan_version, export_revision: trip.export_revision });
    return respond(
      request.method() === 'POST'
        ? activities.at(-1)
        : activities.find(
            (item) => item.id === (id === 'completion' ? path.split('/').at(-2) : id),
          ),
    );
  });
  return { writes, controls, activities };
}
