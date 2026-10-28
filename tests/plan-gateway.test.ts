import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayPlanRepository } from '../src/infrastructure/repositories/plan.gateway-repository';
import type { ActivityUpdateFields } from '../src/features/plan/model/plan';

const activity = {
  id: '22222222-2222-4222-8222-222222222222',
  trip_id: '11111111-1111-4111-8111-111111111111',
  title: 'Walk',
  activity_type: 'OTHER',
  description: null,
  public_description: null,
  selected_location_id: null,
  starts_at: null,
  ends_at: null,
  position: 0,
  status: 'TODO',
  source: 'MANUAL',
  plan_version: 3,
  created_by_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  completed_by_user_id: null,
  completed_at: null,
};
const snapshot = {
  trip_id: '11111111-1111-4111-8111-111111111111',
  plan_version: 3,
  export_revision: 7,
  activities: [activity],
  selected_locations: [],
  dress_codes: [],
  packing_items: [],
  permissions: { can_read: true, can_edit: false, can_complete: true },
};
const request = () => ({
  tripId: '11111111-1111-4111-8111-111111111111',
  expectedPlanVersion: 2,
  idempotencyKey: 'operation',
  signal: new AbortController().signal,
});
function setup(data: unknown) {
  const transport = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ data, meta: { correlation_id: 'trace' } }), { status: 200 }),
    );
  const repo = createGatewayPlanRepository(undefined, createGatewayHttpClient({ transport }));
  return { repo, transport };
}
describe('Plan Gateway contract', () => {
  it('reads and writes calendar day-only without losing null or omission semantics', async () => {
    const { repo, transport } = setup({ ...activity, scheduled_date: '2026-11-01' });
    const result = await repo.updateActivity!({
      ...request(),
      activityId: '22222222-2222-4222-8222-222222222222',
      fields: { scheduledDate: '2026-11-01', startsAt: null, endsAt: null },
    });
    expect(result).toMatchObject({
      status: 'success',
      data: { scheduledDate: '2026-11-01', startsAt: null, endsAt: null },
    });
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toEqual({
      expected_plan_version: 2,
      scheduled_date: '2026-11-01',
      starts_at: null,
      ends_at: null,
    });
    await repo.updateActivity!({
      ...request(),
      activityId: '22222222-2222-4222-8222-222222222222',
      fields: { title: 'Changed' },
    });
    expect(JSON.parse(String(transport.mock.calls[1]![1]?.body))).not.toHaveProperty(
      'scheduled_date',
    );
  });
  it.each(['2026-02-29', '2026-11-01T00:00:00Z', 'bad'])(
    'rejects malformed scheduled_date %s',
    async (scheduled_date) => {
      const { repo } = setup({ ...snapshot, activities: [{ ...activity, scheduled_date }] });
      expect(await repo.getPlan({ ...request(), scenario: 'success' })).toMatchObject({
        status: 'error',
      });
    },
  );
  it('maps a complete snapshot with exact revisions and independent permissions', async () => {
    const { repo } = setup(snapshot);
    const result = await repo.getPlan({ ...request(), scenario: 'success' });
    expect(result).toMatchObject({
      status: 'ready',
      data: {
        planVersion: 3,
        exportRevision: 7,
        permissions: { canEdit: false, canComplete: true },
        activities: [{ id: '22222222-2222-4222-8222-222222222222', position: 0 }],
      },
    });
  });
  it.each([
    { plan_version: undefined },
    { export_revision: 0 },
    { activities: null },
    { permissions: { can_read: true, can_edit: 'false', can_complete: true } },
    { activities: [{ ...activity, id: undefined }] },
    { activities: [{ ...activity, id: 'local-draft-id' }] },
    { activities: [{ ...activity, trip_id: 'another' }] },
    { activities: [{ ...activity, status: 'UNKNOWN' }] },
    { activities: [{ ...activity, plan_version: 2 }] },
    { activities: [activity, activity] },
  ])('rejects malformed snapshots instead of fabricating defaults: %j', async (patch) => {
    const { repo } = setup({ ...snapshot, ...patch });
    expect(await repo.getPlan({ ...request(), scenario: 'success' })).toMatchObject({
      status: 'error',
      error: { code: 'SERVICE_UNAVAILABLE', retryable: false },
    });
  });
  it('creates through typed snake-case fields with idempotency and credentials', async () => {
    const { repo, transport } = setup(activity);
    expect(
      await repo.createActivity!({
        ...request(),
        activity: { title: 'Walk', activityType: 'OTHER', position: 0, publicDescription: null },
      }),
    ).toMatchObject({ status: 'success', data: { planVersion: 3 }, correlationId: 'trace' });
    const [path, options] = transport.mock.calls[0]!;
    expect(path).toBe('/api/v1/trips/11111111-1111-4111-8111-111111111111/activities');
    expect(options).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(new Headers(options!.headers).get('Idempotency-Key')).toBe('operation');
    expect(JSON.parse(String(options!.body))).toEqual({
      expected_plan_version: 2,
      title: 'Walk',
      activity_type: 'OTHER',
      position: 0,
      public_description: null,
    });
  });
  it('rejects a validly-shaped mutation receipt from another Trip or activity', async () => {
    const otherId = '99999999-9999-4999-8999-999999999999';
    const { repo: wrongTrip } = setup({ ...activity, trip_id: otherId });
    expect(
      await wrongTrip.createActivity!({
        ...request(),
        activity: { title: 'Walk', activityType: 'OTHER', position: 0 },
      }),
    ).toMatchObject({ status: 'error' });
    const { repo: wrongActivity } = setup({ ...activity, id: otherId });
    expect(
      await wrongActivity.updateActivity!({
        ...request(),
        activityId: activity.id,
        fields: { title: 'Walk' },
      }),
    ).toMatchObject({ status: 'error' });
    expect(
      await wrongActivity.setActivityCompletion!({
        ...request(),
        activityId: activity.id,
        status: 'COMPLETED',
      }),
    ).toMatchObject({ status: 'error' });
  });
  it('whitelists PATCH fields, preserves explicit null and cannot override expected version', async () => {
    const { repo, transport } = setup(activity);
    const fields = {
      publicDescription: null,
      startsAt: null,
      endsAt: null,
      activityType: 'OTHER',
      expected_plan_version: 999,
      status: 'COMPLETED',
    } as ActivityUpdateFields;
    await repo.updateActivity!({ ...request(), activityId: 'a/b', fields });
    expect(transport.mock.calls[0]![0]).toBe(
      '/api/v1/trips/11111111-1111-4111-8111-111111111111/activities/a%2Fb',
    );
    expect(JSON.parse(String(transport.mock.calls[0]![1]!.body))).toEqual({
      expected_plan_version: 2,
      public_description: null,
      starts_at: null,
      ends_at: null,
      activity_type: 'OTHER',
    });
  });
  it('keeps DELETE confirmation and reorder permutation contracts', async () => {
    const { repo, transport } = setup({
      trip_id: '11111111-1111-4111-8111-111111111111',
      plan_version: 4,
      export_revision: 8,
    });
    expect(
      await repo.deleteActivity!({
        ...request(),
        activityId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toMatchObject({
      status: 'success',
      data: { planVersion: 4, exportRevision: 8 },
    });
    expect(JSON.parse(String(transport.mock.calls[0]![1]!.body))).toEqual({
      expected_plan_version: 2,
      confirmed: true,
    });
    await repo.reorderActivities!({ ...request(), activityIds: ['b', 'a'] });
    expect(transport.mock.calls[1]![0]).toBe(
      '/api/v1/trips/11111111-1111-4111-8111-111111111111/activities/order',
    );
    expect(transport.mock.calls[1]![1]!.method).toBe('PUT');
    expect(JSON.parse(String(transport.mock.calls[1]![1]!.body))).toEqual({
      expected_plan_version: 2,
      activity_ids: ['b', 'a'],
    });
  });
  it('sends completion as a separate permission-aware command', async () => {
    const { repo, transport } = setup({ ...activity, status: 'COMPLETED' });
    await repo.setActivityCompletion!({
      ...request(),
      activityId: '22222222-2222-4222-8222-222222222222',
      status: 'COMPLETED',
    });
    expect(transport.mock.calls[0]![0]).toBe(
      '/api/v1/trips/11111111-1111-4111-8111-111111111111/activities/22222222-2222-4222-8222-222222222222/completion',
    );
    expect(JSON.parse(String(transport.mock.calls[0]![1]!.body))).toEqual({
      expected_plan_version: 2,
      status: 'COMPLETED',
    });
  });
  it('rejects missing mutation revisions', async () => {
    const { repo } = setup({ plan_version: 4 });
    expect(
      await repo.deleteActivity!({
        ...request(),
        activityId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toMatchObject({
      status: 'error',
      error: { retryable: false },
    });
  });
  it('preserves conflict details and never automatically retries writes', async () => {
    const { repo, transport } = setup(null);
    transport.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'VERSION_CONFLICT',
              message: 'Conflict',
              retryable: false,
              details: { plan_version: 9 },
            },
            meta: { correlation_id: 'conflict' },
          }),
          { status: 409 },
        ),
    );
    expect(await repo.reorderActivities!({ ...request(), activityIds: [] })).toMatchObject({
      status: 'error',
      error: { code: 'VERSION_CONFLICT', details: { plan_version: 9 }, correlationId: 'conflict' },
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('reports uncertain network outcomes without retrying or replacing operation keys', async () => {
    const { repo, transport } = setup(null);
    transport.mockRejectedValue(new TypeError('offline'));
    expect(
      await repo.createActivity!({
        ...request(),
        activity: { title: 'Walk', activityType: 'OTHER', position: 0 },
      }),
    ).toMatchObject({ status: 'error', error: { code: 'SERVICE_UNAVAILABLE', retryable: true } });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('preserves cancellation and optional commands without a client', async () => {
    const { repo, transport } = setup(snapshot);
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    await expect(
      repo.getPlan({
        tripId: '11111111-1111-4111-8111-111111111111',
        scenario: 'success',
        signal: controller.signal,
      }),
    ).rejects.toThrow('cancelled');
    expect(transport).not.toHaveBeenCalled();
    expect(createGatewayPlanRepository().createActivity).toBeUndefined();
  });
});
