import { describe, expect, it, vi } from 'vitest';
import {
  restorePlanCommand,
  type PlanCommandIntent,
} from '../src/features/plan/model/plan-command-intent';
import type { PlanRepository } from '../src/features/plan/model/plan';

function setup() {
  const command = vi.fn().mockResolvedValue({ status: 'success', data: {}, correlationId: null });
  const repository: PlanRepository = {
    getPlan: vi.fn(),
    createActivity: command,
    updateActivity: command,
    deleteActivity: command,
    setActivityCompletion: command,
    reorderActivities: command,
  };
  const context = {
    expectedPlanVersion: 7,
    idempotencyKey: 'original-key',
    signal: new AbortController().signal,
  };
  return { command, repository, context };
}
describe('durable Plan command reconstruction', () => {
  it.each<PlanCommandIntent>([
    {
      kind: 'create',
      activity: { title: 'Lunch', activityType: 'MEAL', position: 0, startsAt: null, endsAt: null },
    },
    {
      kind: 'update',
      activityId: 'fixture-id',
      fields: { publicDescription: null, description: '' },
    },
    { kind: 'delete', activityId: 'fixture-id' },
    { kind: 'completion', activityId: 'fixture-id', status: 'TODO' },
    { kind: 'reorder', activityIds: ['second', 'first'] },
    { kind: 'reorder', activityIds: [] },
  ])('restores %j with original recovery context', async (intent) => {
    const { repository, command, context } = setup();
    const restored = restorePlanCommand(repository, 'trip', JSON.parse(JSON.stringify(intent)));
    expect(restored).not.toBeNull();
    await restored!(context);
    const payload = Object.fromEntries(Object.entries(intent).filter(([key]) => key !== 'kind'));
    expect(command).toHaveBeenCalledWith({ ...context, tripId: 'trip', ...payload });
  });
  it.each([
    null,
    [],
    {},
    { kind: 'unknown' },
    { kind: 'delete', activityId: '' },
    { kind: 'delete', activityId: 'a', expectedPlanVersion: 99 },
    { kind: 'delete', activityId: 'a', tripId: 'other' },
    { kind: 'completion', activityId: 'a', status: 'DONE' },
    { kind: 'reorder', activityIds: ['a', 'a'] },
    { kind: 'reorder', activityIds: ['a', 2] },
    { kind: 'create', activity: { title: 'A', activityType: 'OTHER' } },
    { kind: 'create', activity: { title: ' ', activityType: 'OTHER', position: 0 } },
    { kind: 'update', activityId: 'a', fields: {} },
    { kind: 'update', activityId: 'a', fields: { expected_plan_version: 999 } },
    { kind: 'update', activityId: 'a', fields: { starts_at: null } },
    { kind: 'update', activityId: 'a', fields: { title: null } },
    { kind: 'update', activityId: 'a', fields: { position: -1 } },
    { kind: 'update', activityId: 'a', fields: { position: 1.5 } },
    { kind: 'update', activityId: 'a', fields: { description: {} } },
    { kind: 'update', activityId: 'a', fields: { startsAt: 'bad-date' } },
  ])('rejects invalid or injected stored payload %j', (payload) => {
    const { repository, command } = setup();
    expect(restorePlanCommand(repository, 'trip', payload)).toBeNull();
    expect(command).not.toHaveBeenCalled();
  });
  it('requires repository capability and never manufactures fixture writes', () => {
    expect(
      restorePlanCommand({ getPlan: vi.fn() }, 'trip', { kind: 'delete', activityId: 'a' }),
    ).toBeNull();
  });
  it('takes a defensive snapshot of fields and order for subsequent exact retries', async () => {
    const { repository, command, context } = setup();
    const intent = { kind: 'update', activityId: 'a', fields: { title: 'Original' } };
    const restored = restorePlanCommand(repository, 'trip', intent)!;
    intent.fields.title = 'Changed';
    await restored(context);
    expect(command.mock.calls[0]![0].fields).toEqual({ title: 'Original' });
    command.mock.calls[0]![0].fields.title = 'Repository mutation';
    await restored(context);
    expect(command.mock.calls[1]![0].fields).toEqual({ title: 'Original' });
    const order = { kind: 'reorder', activityIds: ['a', 'b'] };
    const reorder = restorePlanCommand(repository, 'trip', order)!;
    order.activityIds.reverse();
    await reorder(context);
    expect(command.mock.calls[2]![0].activityIds).toEqual(['a', 'b']);
  });
});
