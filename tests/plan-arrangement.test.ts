import { describe, expect, it, vi } from 'vitest';
import {
  buildPlanArrangement,
  parsePlanArrangement,
  type GatewayPlanMove,
  type PlanArrangementIntent,
} from '../src/features/plan/model/plan-arrangement';
import { restorePlanCommand } from '../src/features/plan/model/plan-command-intent';
import type {
  ActivityViewModel,
  PlanRepository,
  PlanViewModel,
} from '../src/features/plan/model/plan';

const day = '2026-11-06';
const next = '2026-11-07';
function activity(id: string, position: number, scheduled: string | null): ActivityViewModel {
  return {
    id,
    tripId: 'trip',
    title: id,
    description: null,
    publicDescription: null,
    activityType: 'SIGHTSEEING',
    selectedLocationId: null,
    startsAt: scheduled ? `${scheduled}T0${position + 1}:00:00Z` : null,
    endsAt: scheduled ? `${scheduled}T0${position + 2}:00:00Z` : null,
    scheduledDate: null,
    position,
    status: 'TODO',
    source: 'MANUAL',
    planVersion: 7,
    createdByUserId: 'actor',
    completedByUserId: null,
    completedAt: null,
    presentation: { cover: null },
  };
}
function plan(): PlanViewModel {
  return {
    tripId: 'trip',
    planVersion: 7,
    exportRevision: 3,
    activities: [
      activity('a', 0, day),
      activity('b', 1, day),
      activity('c', 2, day),
      activity('d', 3, next),
      activity('p', 4, null),
      activity('q', 5, null),
    ],
    selectedLocations: [
      {
        id: 'location',
        tripId: 'trip',
        name: 'Quán ven hồ',
        address: 'Địa chỉ từ địa điểm đã chọn',
        latitude: null,
        longitude: null,
        provider: null,
        providerPlaceId: null,
        source: 'MANUAL',
        openingHours: null,
        fetchedAt: null,
        metadata: { types: ['cafe'] },
        planVersion: 7,
      },
    ],
    dressCodes: [],
    packingItems: [],
    permissions: { canRead: true, canEdit: true, canComplete: true },
  };
}
const move = (id: string, index: number, target: string | null = day): GatewayPlanMove => ({
  source: { type: 'ACTIVITY', id },
  target: { day: target, index },
});
function arrange(id: string, index: number, target: string | null = day) {
  return buildPlanArrangement(plan(), 'UTC', move(id, index, target))!;
}
function order(intent: PlanArrangementIntent) {
  const last = intent.steps.at(-1);
  if (last?.kind !== 'reorder') throw Error('Missing full order');
  return last.activityIds;
}
function schedules(intent: PlanArrangementIntent) {
  return intent.steps.filter((step) => step.kind === 'schedule');
}
function apply(snapshot: PlanViewModel, intent: PlanArrangementIntent): PlanViewModel {
  const activities = snapshot.activities.map((item) => {
    const update = schedules(intent).find((step) => step.activityId === item.id);
    return {
      ...item,
      ...(update ? { startsAt: null, endsAt: null, scheduledDate: update.scheduledDate } : {}),
      position: order(intent).indexOf(item.id),
    };
  });
  return { ...snapshot, activities, planVersion: snapshot.planVersion + 1 };
}
const context = {
  expectedPlanVersion: 7,
  idempotencyKey: '18bab54a-4296-496f-92d7-69bc8d1a9a3d',
  signal: new AbortController().signal,
};
const failure = (code: 'VERSION_CONFLICT' | 'SERVICE_UNAVAILABLE' | 'PERMISSION_DENIED') => ({
  status: 'error' as const,
  error: { code, correlationId: null, retryable: false },
});
function repository() {
  const create = vi.fn<NonNullable<PlanRepository['createActivity']>>(async (request) => ({
    status: 'success',
    data: {
      ...activity('created', request.activity.position, null),
      ...request.activity,
      planVersion: request.expectedPlanVersion + 1,
    },
    correlationId: null,
  }));
  const update = vi.fn<NonNullable<PlanRepository['updateActivity']>>(async (request) => ({
    status: 'success',
    data: {
      ...activity(request.activityId, 0, null),
      ...request.fields,
      planVersion: request.expectedPlanVersion + 1,
    },
    correlationId: null,
  }));
  const reorder = vi.fn<NonNullable<PlanRepository['reorderActivities']>>(async (request) => ({
    status: 'success',
    data: { planVersion: request.expectedPlanVersion + 1, exportRevision: 3 },
    correlationId: null,
  }));
  const repo: PlanRepository = {
    getPlan: vi.fn(),
    createActivity: create,
    updateActivity: update,
    reorderActivities: reorder,
  };
  return { repo, create, update, reorder };
}

describe('Gateway arrangement snapshot model', () => {
  it.each([
    [0, ['p', 'a', 'b', 'c', 'd', 'q'], ['p', 'a', 'b', 'c']],
    [1, ['a', 'p', 'b', 'c', 'd', 'q'], ['p', 'b', 'c']],
    [3, ['a', 'b', 'c', 'p', 'd', 'q'], ['p']],
  ] as const)(
    'inserts a pool activity at %i and resets only item + suffix',
    (index, ids, reset) => {
      const intent = arrange('p', index);
      expect(order(intent)).toEqual(ids);
      expect(schedules(intent).map((step) => step.activityId)).toEqual(reset);
      expect(schedules(intent).every((step) => step.scheduledDate === day)).toBe(true);
      expect(new Set(order(intent)).size).toBe(6);
    },
  );

  it('keeps prefix times and dates intact while clearing only the new suffix times', () => {
    const original = plan();
    const changed = apply(original, arrange('p', 1));
    expect(changed.activities.find((item) => item.id === 'a')).toEqual(original.activities[0]);
    for (const id of ['p', 'b', 'c'])
      expect(changed.activities.find((item) => item.id === id)).toMatchObject({
        startsAt: null,
        endsAt: null,
        scheduledDate: day,
      });
    expect(changed.activities.find((item) => item.id === 'd')?.startsAt).toBe(
      original.activities[3]?.startsAt,
    );
  });

  it('supports empty days without dropping IDs from other days or the pool', () => {
    const intent = arrange('p', 0, '2026-11-08');
    expect(order(intent)).toEqual(['a', 'b', 'c', 'd', 'q', 'p']);
    expect(schedules(intent)).toEqual([
      { kind: 'schedule', activityId: 'p', scheduledDate: '2026-11-08' },
    ]);
  });

  it('uses post-removal indexes when reordering down/up repeatedly', () => {
    const down = arrange('a', 2);
    expect(order(down)).toEqual(['b', 'c', 'a', 'd', 'p', 'q']);
    expect(schedules(down).map((step) => step.activityId)).toEqual(['a']);
    const changed = apply(plan(), down);
    const up = buildPlanArrangement(changed, 'UTC', move('a', 0))!;
    expect(order(up)).toEqual(['a', 'b', 'c', 'd', 'p', 'q']);
    // a is already date-only, so only the still-timed suffix needs a PATCH.
    expect(schedules(up).map((step) => step.activityId)).toEqual(['b', 'c']);
    expect(parsePlanArrangement(JSON.parse(JSON.stringify(up)))).toEqual(up);
  });

  it('moves a timed activity across days without editing the old-day neighbours', () => {
    const intent = arrange('b', 0, next);
    expect(order(intent)).toEqual(['a', 'c', 'b', 'd', 'p', 'q']);
    expect(schedules(intent)).toEqual([
      { kind: 'schedule', activityId: 'b', scheduledDate: next },
      { kind: 'schedule', activityId: 'd', scheduledDate: next },
    ]);
  });

  it('returns an activity to the pool clearing only that activity date/time', () => {
    const intent = arrange('b', 1, null);
    expect(order(intent)).toEqual(['a', 'c', 'd', 'p', 'b', 'q']);
    expect(schedules(intent)).toEqual([{ kind: 'schedule', activityId: 'b', scheduledDate: null }]);
  });

  it.each([move('a', 0), move('b', 1), move('p', 0, null), move('missing', 0)])(
    'ignores unchanged slots and missing sources: %j',
    (input) => {
      expect(buildPlanArrangement(plan(), 'UTC', input)).toBeNull();
    },
  );

  it('validates dates, indexes, timezone and editing permission before building any write', () => {
    for (const input of [move('p', -1), move('p', 4), move('p', 0.5), move('p', 0, 'bad')])
      expect(buildPlanArrangement(plan(), 'UTC', input)).toBeNull();
    expect(buildPlanArrangement(plan(), 'bad/zone', move('p', 0))).toBeNull();
    const readonly = {
      ...plan(),
      permissions: { canRead: true, canEdit: false, canComplete: true },
    };
    expect(buildPlanArrangement(readonly, 'UTC', move('p', 0))).toBeNull();
  });

  it('uses trip timezone calendar dates, including DST, without inventing new instants', () => {
    const original = plan();
    const snapshot = {
      ...original,
      activities: [
        {
          ...original.activities[0]!,
          startsAt: '2026-11-01T05:30:00Z',
          endsAt: '2026-11-01T06:30:00Z',
        },
        original.activities[4]!,
      ],
    };
    const intent = buildPlanArrangement(snapshot, 'America/New_York', move('p', 0, '2026-11-01'))!;
    expect(schedules(intent).map((step) => step.scheduledDate)).toEqual([
      '2026-11-01',
      '2026-11-01',
    ]);
  });

  it('creates from a real selected location then inserts its receipt ID into the full order', () => {
    const intent = buildPlanArrangement(plan(), 'UTC', {
      source: { type: 'LOCATION', id: 'location' },
      target: { day, index: 1 },
    })!;
    expect(intent.steps[0]).toEqual({
      kind: 'create',
      activity: {
        title: 'Quán ven hồ',
        activityType: 'MEAL',
        description: 'Địa chỉ từ địa điểm đã chọn',
        publicDescription: null,
        selectedLocationId: 'location',
        startsAt: null,
        endsAt: null,
        scheduledDate: day,
        position: 6,
      },
    });
    expect(order(intent)).toEqual(['a', null, 'b', 'c', 'd', 'p', 'q']);
    expect(schedules(intent).map((step) => step.activityId)).toEqual(['b', 'c']);
    expect(parsePlanArrangement(JSON.parse(JSON.stringify(intent)))).toEqual(intent);
  });

  it('does not duplicate an existing activity for a selected location or create in the pool', () => {
    const original = plan();
    const source = { type: 'LOCATION' as const, id: 'location' };
    const duplicate = {
      ...original,
      activities: [{ ...original.activities[4]!, selectedLocationId: 'location' }],
    };
    expect(
      buildPlanArrangement(duplicate, 'UTC', { source, target: { day, index: 0 } }),
    ).toBeNull();
    expect(
      buildPlanArrangement(original, 'UTC', { source, target: { day: null, index: 0 } }),
    ).toBeNull();
  });
});

describe('Gateway arrangement serial commands and durable exact replay', () => {
  it('executes serial PATCHes then a complete global reorder with confirmed versions and UUID keys', async () => {
    const { repo, update, reorder } = repository();
    const command = restorePlanCommand(repo, 'trip', arrange('p', 1))!;
    expect(command.arrangement).toBe(true);
    expect(await command(context)).toMatchObject({ status: 'success', data: { planVersion: 11 } });
    expect(
      update.mock.calls.map(([request]) => [request.activityId, request.expectedPlanVersion]),
    ).toEqual([
      ['p', 7],
      ['b', 8],
      ['c', 9],
    ]);
    expect(update.mock.calls[0]![0].fields).toEqual({
      startsAt: null,
      endsAt: null,
      scheduledDate: day,
    });
    expect(reorder).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedPlanVersion: 10,
        activityIds: ['a', 'p', 'b', 'c', 'd', 'q'],
      }),
    );
    const keys = [...update.mock.calls, ...reorder.mock.calls].map(
      ([request]) => request.idempotencyKey,
    );
    expect(new Set(keys).size).toBe(4);
    expect(
      keys.every((key) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key),
      ),
    ).toBe(true);
  });

  it('uses a created receipt ID, never a local draft ID, and replays the exact snapshot', async () => {
    const { repo, create, update, reorder } = repository();
    const intent = buildPlanArrangement(plan(), 'UTC', {
      source: { type: 'LOCATION', id: 'location' },
      target: { day, index: 3 },
    })!;
    const command = restorePlanCommand(repo, 'trip', intent)!;
    await command(context);
    await restorePlanCommand(repo, 'trip', JSON.parse(JSON.stringify(intent)))!(context);
    expect(update).not.toHaveBeenCalled();
    expect(create.mock.calls[0]![0]).toEqual(create.mock.calls[1]![0]);
    expect(reorder.mock.calls[0]![0]).toEqual(reorder.mock.calls[1]![0]);
    expect(reorder.mock.calls[0]![0].activityIds).toEqual([
      'a',
      'b',
      'c',
      'created',
      'd',
      'p',
      'q',
    ]);
  });

  it('stops after a definitive conflict/permission loss, marking confirmed partial state', async () => {
    for (const code of ['VERSION_CONFLICT', 'PERMISSION_DENIED'] as const) {
      const { repo, update, reorder } = repository();
      update.mockResolvedValueOnce({
        status: 'success',
        data: { ...activity('p', 0, null), planVersion: 8 },
        correlationId: null,
      });
      update.mockResolvedValueOnce(failure(code));
      expect(await restorePlanCommand(repo, 'trip', arrange('p', 1))!(context)).toEqual({
        ...failure(code),
        partialFailure: true,
      });
      expect(update).toHaveBeenCalledTimes(2);
      expect(reorder).not.toHaveBeenCalled();
    }
  });

  it('never rebases an old snapshot on the newest rendered version', async () => {
    const { repo, update, reorder } = repository();
    expect(
      await restorePlanCommand(repo, 'trip', arrange('p', 1))!({
        ...context,
        expectedPlanVersion: 12,
      }),
    ).toEqual(failure('VERSION_CONFLICT'));
    expect(update).not.toHaveBeenCalled();
    expect(reorder).not.toHaveBeenCalled();
  });

  it('replays earlier confirmed receipts with identical step keys/versions after unknown + reload', async () => {
    const { repo, update, reorder } = repository();
    const receipts = new Map<
      string,
      Awaited<ReturnType<NonNullable<PlanRepository['updateActivity']>>>
    >();
    let lostResponse = true;
    update.mockImplementation(async (request) => {
      const saved = receipts.get(request.idempotencyKey);
      if (saved) return saved;
      const result = {
        status: 'success' as const,
        data: {
          ...activity(request.activityId, 0, null),
          planVersion: request.expectedPlanVersion + 1,
        },
        correlationId: null,
      };
      receipts.set(request.idempotencyKey, result);
      if (request.activityId === 'b' && lostResponse) {
        lostResponse = false;
        return failure('SERVICE_UNAVAILABLE');
      }
      return result;
    });
    const intent = arrange('p', 1);
    expect(await restorePlanCommand(repo, 'trip', intent)!(context)).toEqual({
      ...failure('SERVICE_UNAVAILABLE'),
      partialFailure: true,
    });
    expect(reorder).not.toHaveBeenCalled();
    expect(
      await restorePlanCommand(repo, 'trip', JSON.parse(JSON.stringify(intent)))!(context),
    ).toMatchObject({ status: 'success' });
    expect(update.mock.calls[0]![0]).toEqual(update.mock.calls[2]![0]);
    expect(update.mock.calls[1]![0]).toEqual(update.mock.calls[3]![0]);
    expect(update.mock.calls[4]![0].expectedPlanVersion).toBe(9);
    expect(reorder.mock.calls[0]![0].expectedPlanVersion).toBe(10);
    expect(receipts.size).toBe(3);
  });

  it('marks thrown/aborted intermediate requests partial and never sends later steps', async () => {
    const { repo, update, reorder } = repository();
    const controller = new AbortController();
    update.mockImplementationOnce(async (request) => {
      controller.abort();
      return {
        status: 'success',
        data: { ...activity('p', 0, null), planVersion: request.expectedPlanVersion + 1 },
        correlationId: null,
      };
    });
    expect(
      await restorePlanCommand(repo, 'trip', arrange('p', 1))!({
        ...context,
        signal: controller.signal,
      }),
    ).toEqual({ ...failure('SERVICE_UNAVAILABLE'), partialFailure: true });
    expect(update).toHaveBeenCalledTimes(1);
    expect(reorder).not.toHaveBeenCalled();
    const thrown = repository();
    thrown.update.mockRejectedValueOnce(Error('response lost'));
    expect(await restorePlanCommand(thrown.repo, 'trip', arrange('p', 1))!(context)).toEqual({
      ...failure('SERVICE_UNAVAILABLE'),
      partialFailure: true,
    });
    expect(thrown.reorder).not.toHaveBeenCalled();
  });

  it('accepts a confirmed no-op receipt without inventing a version bump', async () => {
    const { repo, update, reorder } = repository();
    update.mockResolvedValueOnce({
      status: 'success',
      data: { ...activity('p', 0, null), planVersion: 7 },
      correlationId: null,
    });
    await restorePlanCommand(repo, 'trip', arrange('p', 3))!(context);
    expect(reorder.mock.calls[0]![0].expectedPlanVersion).toBe(7);
  });

  it('rejects a malformed version receipt without using a guessed version for the next step', async () => {
    const { repo, update, reorder } = repository();
    update.mockResolvedValueOnce({
      status: 'success',
      data: { ...activity('p', 0, null), planVersion: 99 },
      correlationId: null,
    });
    expect(await restorePlanCommand(repo, 'trip', arrange('p', 1))!(context)).toMatchObject({
      status: 'error',
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(reorder).not.toHaveBeenCalled();
  });

  it('takes a defensive immutable copy of recovered steps and their arrays', async () => {
    const { repo, update, reorder } = repository();
    const intent = JSON.parse(JSON.stringify(arrange('p', 3)));
    const command = restorePlanCommand(repo, 'trip', intent)!;
    intent.steps[0].scheduledDate = next;
    intent.steps[1].activityIds.reverse();
    await command(context);
    expect(update.mock.calls[0]![0].fields.scheduledDate).toBe(day);
    expect(reorder.mock.calls[0]![0].activityIds).toEqual(['a', 'b', 'c', 'p', 'd', 'q']);
  });

  it.each([
    { kind: 'arrange', basePlanVersion: 7, steps: [] },
    { kind: 'arrange', basePlanVersion: 0, steps: [{ kind: 'reorder', activityIds: ['a'] }] },
    {
      kind: 'arrange',
      basePlanVersion: 7,
      tripId: 'other',
      steps: [{ kind: 'reorder', activityIds: ['a'] }],
    },
    { kind: 'arrange', basePlanVersion: 7, steps: [{ kind: 'reorder', activityIds: ['a', 'a'] }] },
    { kind: 'arrange', basePlanVersion: 7, steps: [{ kind: 'reorder', activityIds: ['a', null] }] },
    {
      kind: 'arrange',
      basePlanVersion: 7,
      steps: [
        { kind: 'schedule', activityId: 'missing', scheduledDate: day },
        { kind: 'reorder', activityIds: ['a'] },
      ],
    },
    {
      kind: 'arrange',
      basePlanVersion: 7,
      steps: [
        { kind: 'schedule', activityId: 'a', scheduledDate: '2026-02-30' },
        { kind: 'reorder', activityIds: ['a'] },
      ],
    },
    {
      kind: 'arrange',
      basePlanVersion: 7,
      steps: [
        { kind: 'schedule', activityId: 'a', scheduledDate: day, title: 'injected' },
        { kind: 'reorder', activityIds: ['a'] },
      ],
    },
    {
      kind: 'arrange',
      basePlanVersion: 7,
      steps: [
        { kind: 'reorder', activityIds: ['a'] },
        { kind: 'schedule', activityId: 'a', scheduledDate: day },
      ],
    },
  ])('rejects malformed stored sequences %j', (input) => {
    expect(restorePlanCommand(repository().repo, 'trip', input)).toBeNull();
  });

  it('requires each API capability and never manufactures fixture writes', () => {
    expect(restorePlanCommand({ getPlan: vi.fn() }, 'trip', arrange('p', 1))).toBeNull();
  });
});
