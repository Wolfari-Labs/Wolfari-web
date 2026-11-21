import type { Page } from '@playwright/test';
import { expect, type GatewayModel } from './gateway-fixture';

export const tripId = '11111111-1111-4111-8111-111111111111';
const itemId = '88888888-1111-4111-8111-111111111111';
const root = `/api/v1/trips/${tripId}`;
export async function install(page: Page, gateway: GatewayModel) {
  const trip = gateway.trips.find((t) => t.id === tripId)!;
  const state = {
    editor: true,
    capability: true,
    loseResponse: false,
    reject: '',
    rows: [] as Record<string, unknown>[],
    writes: [] as { method: string; path: string; body: Record<string, unknown>; key: string }[],
  };
  const receipts = new Map<string, unknown>();
  await page.route(`**${root}/**`, async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const send = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'packing-http-mock' } } });
    const fail = (code: string, status: number) =>
      route.fulfill({
        status,
        json: { error: { code, message: code, correlation_id: 'packing-http-mock' } },
      });
    if (path === `${root}/plan`)
      return send({
        trip_id: tripId,
        plan_version: trip.plan_version,
        export_revision: trip.export_revision,
        activities: [],
        selected_locations: [],
        dress_codes: [],
        packing_items: state.rows.map((r) => ({ ...r, plan_version: trip.plan_version })),
        permissions: { can_read: true, can_edit: state.editor, can_complete: false },
        capabilities: { packing_write: state.capability },
      });
    if (!path.startsWith(`${root}/packing-items`)) return route.fallback();
    expect(path).not.toContain('/assignment');
    const method = req.method(),
      body = req.postDataJSON() as Record<string, unknown>,
      key = req.headers()['idempotency-key']!;
    expect(key).toBeTruthy();
    state.writes.push({ method, path, body, key });
    if (state.reject) return fail(state.reject, state.reject === 'VALIDATION_FAILED' ? 400 : 409);
    if (receipts.has(key)) return send(receipts.get(key));
    if (body.expected_plan_version !== trip.plan_version) return fail('VERSION_CONFLICT', 409);
    const completion = path.endsWith('/completion');
    if (!state.editor && !completion) return fail('PERMISSION_DENIED', 403);
    trip.plan_version++;
    trip.export_revision++;
    if (method === 'DELETE') state.rows = [];
    else if (method === 'POST') {
      expect(path).toBe(`${root}/packing-items`);
      state.rows.push({
        id: itemId,
        trip_id: tripId,
        name: '',
        quantity: '1.00',
        unit: null,
        category: null,
        note: null,
        due_at: null,
        assigned_member_id: null,
        status: 'TODO',
        source: 'MANUAL',
        completed_by_user_id: null,
        completed_at: null,
        ...body,
      });
    } else {
      expect(method).toBe('PATCH');
      const item = state.rows[0]!;
      Object.assign(item, body);
      if (completion)
        Object.assign(item, {
          completed_by_user_id: body.status === 'COMPLETED' ? gateway.profile.id : null,
          completed_at: body.status === 'COMPLETED' ? '2026-11-21T03:00:00Z' : null,
        });
    }
    const receipt =
      method === 'DELETE'
        ? {
            trip_id: tripId,
            plan_version: trip.plan_version,
            export_revision: trip.export_revision,
            deleted: true,
          }
        : { ...state.rows[0], plan_version: trip.plan_version };
    receipts.set(key, receipt);
    if (state.loseResponse) {
      state.loseResponse = false;
      return route.abort('failed');
    }
    return send(receipt, method === 'POST' ? 201 : 200);
  });
  return { state, trip };
}
