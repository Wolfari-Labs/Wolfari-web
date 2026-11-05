import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayPlanRepository } from '../src/infrastructure/repositories/plan.gateway-repository';
import {
  createTravelRepository,
  decodeRecommendation,
} from '../src/infrastructure/repositories/travel.gateway-repository';
import {
  parsePreparationIntent,
  validLocationWrite,
  validDressWrite,
  validPackingWrite,
  canTogglePacking,
  packingRequiresReset,
} from '../src/features/plan/model/preparation';
import {
  PlanCommandsContext,
  useOwnedPlanCommands,
  usePlanCommands,
} from '../src/features/plan/hooks/use-plan-commands';
import type { PlanViewModel, PackingItemViewModel } from '../src/features/plan/model/plan';
import type { TripDetailViewModel } from '../src/features/trips/model/trip-detail';
import { restorePlanCommand } from '../src/features/plan/model/plan-command-intent';
import { overlappingActivities } from '../src/features/plan/components/ScheduleValidation';

const tripId = '11111111-1111-4111-8111-111111111111',
  id = '22222222-2222-4222-8222-222222222222';
const memberId = '33333333-3333-4333-8333-333333333333';
const fields = {
  name: 'Áo mưa',
  quantity: '1',
  unit: null,
  category: null,
  note: null,
  dueAt: null,
};
const location = { name: 'Bảo tàng', address: null, latitude: '16.05', longitude: '108.2' };
const meta = {
  status: 'SUCCESS',
  provider: 'test-provider',
  fetched_at: '2026-11-05T00:00:00Z',
  stale: false,
  is_mock: false,
  warnings: [],
};
const request = () => ({
  tripId,
  expectedPlanVersion: 1,
  idempotencyKey: '44444444-4444-4444-8444-444444444444',
  signal: new AbortController().signal,
});
function setup(data: unknown, status = 200) {
  const transport = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ data, meta: { correlation_id: 'test' } }), { status }),
    );
  const client = createGatewayHttpClient({ transport });
  return {
    transport,
    repo: createGatewayPlanRepository(undefined, client),
    travel: createTravelRepository(client),
  };
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
describe('SRS 1.2 preparation contracts', () => {
  it.each([
    'packing-create',
    'packing-update',
    'packing-delete',
    'packing-assignment',
    'packing-completion',
    'location-create',
    'location-update',
    'location-delete',
    'dress-create',
    'dress-update',
    'dress-delete',
  ])('serializes %s with shared version and immutable key', async (operation) => {
    const intent = parsePreparationIntent({
      operation,
      ...(operation.endsWith('create') ? {} : { id }),
      ...(operation === 'packing-assignment'
        ? { assignedMemberId: null }
        : operation === 'packing-completion'
          ? { status: 'TODO' }
          : operation.endsWith('delete')
            ? {}
            : {
                fields: operation.startsWith('location')
                  ? location
                  : operation.startsWith('dress')
                    ? {
                        scopeType: 'DAY',
                        planDate: '2026-11-05',
                        activityId: null,
                        label: 'Nhẹ',
                        description: null,
                        publicDescription: null,
                      }
                    : fields,
              }),
    });
    expect(intent).not.toBeNull();
    const { repo, transport } = setup({ id, trip_id: tripId, plan_version: 2 });
    expect(await repo.mutatePreparation!({ ...request(), intent: intent! })).toMatchObject({
      status: 'success',
      data: { planVersion: 2 },
    });
    const [url, options] = transport.mock.calls[0]!;
    expect(url).toContain(
      operation.startsWith('location')
        ? '/locations'
        : operation.startsWith('dress')
          ? '/dress-codes'
          : '/packing-items',
    );
    expect(new Headers(options?.headers).get('idempotency-key')).toBe(request().idempotencyKey);
    const body = JSON.parse(String(options?.body));
    expect(body.expected_plan_version).toBe(1);
    if (operation === 'packing-assignment') {
      expect(url).toContain('/assignment');
      expect(options?.method).toBe('PUT');
      expect(body.assigned_member_id).toBeNull();
    }
    if (operation === 'packing-completion') {
      expect(url).toContain('/completion');
      expect(body.status).toBe('TODO');
    }
    if (operation.startsWith('dress') && !operation.endsWith('delete'))
      expect(body.scope_type).toBe('DAY');
  });
  it('uses body apply_request_id, not CRUD key header, and refuses stale base before sending', async () => {
    const { repo, transport } = setup({
      recommendation_id: id,
      apply_request_id: request().idempotencyKey,
      applied_plan_version: 2,
    });
    const intent = {
      operation: 'recommendation-apply' as const,
      id,
      selectedItemIds: ['proposal-1'],
      basePlanVersion: 1,
    };
    expect(await repo.mutatePreparation!({ ...request(), intent })).toMatchObject({
      status: 'success',
    });
    const options = transport.mock.calls[0]![1];
    expect(new Headers(options?.headers).has('idempotency-key')).toBe(false);
    expect(JSON.parse(String(options?.body))).toEqual({
      expected_plan_version: 1,
      selected_item_ids: ['proposal-1'],
      apply_request_id: request().idempotencyKey,
    });
    expect(
      await repo.mutatePreparation!({ ...request(), expectedPlanVersion: 2, intent }),
    ).toMatchObject({ status: 'error', error: { code: 'VERSION_CONFLICT' } });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each([
    { plan_version: 1 },
    { plan_version: 2, trip_id: id },
    { plan_version: 2, id: memberId },
  ])('rejects an inconsistent receipt %j', async (data) => {
    const { repo } = setup(data);
    expect(
      await repo.mutatePreparation!({ ...request(), intent: { operation: 'packing-delete', id } }),
    ).toMatchObject({ status: 'error' });
  });
  it('does not treat 202 as confirmed success', async () => {
    const { repo } = setup({ plan_version: 2 }, 202);
    expect(
      await repo.mutatePreparation!({ ...request(), intent: { operation: 'packing-delete', id } }),
    ).toMatchObject({ status: 'error' });
  });
  it('keeps old BE snapshots readable while new capabilities default false', async () => {
    const { repo } = setup({
      trip_id: tripId,
      plan_version: 1,
      export_revision: 1,
      activities: [],
      selected_locations: [],
      dress_codes: [],
      packing_items: [],
      permissions: { can_read: true, can_edit: true, can_complete: true },
    });
    const result = await repo.getPlan({ ...request(), scenario: 'success' });
    expect(result).toMatchObject({
      status: 'ready',
      data: {
        capabilities: { locations_write: false, packing_completion: false },
        permissions: { canEdit: true },
      },
    });
  });
  it('restores validated preparation commands without depending on advertised capabilities', async () => {
    const { repo } = setup({ plan_version: 2 });
    const command = restorePlanCommand(repo, tripId, {
      kind: 'preparation',
      intent: { operation: 'packing-create', fields },
    });
    expect(command).not.toBeNull();
    expect(await command!(request())).toMatchObject({ status: 'success' });
    expect(
      restorePlanCommand(repo, tripId, {
        kind: 'preparation',
        intent: { operation: 'packing-create', fields: { ...fields, assigned_member_id: id } },
      }),
    ).toBeNull();
  });
});
describe('validation and SRS permissions', () => {
  it.each([
    { ...location, latitude: null },
    { ...location, latitude: '91' },
    { ...location, longitude: '181' },
    { ...location, latitude: '1.1234567' },
  ])('rejects malformed coordinates %j', (value) => expect(validLocationWrite(value)).toBe(false));
  it('accepts manual locations without coordinates', () =>
    expect(validLocationWrite({ ...location, latitude: null, longitude: null })).toBe(true));
  it.each(['TRIP', 'DAY', 'ACTIVITY'])('rejects invalid Dress target %s', (scopeType) =>
    expect(
      validDressWrite({
        scopeType,
        planDate: '2026-02-30',
        activityId: null,
        label: 'A',
        description: null,
        publicDescription: null,
      }),
    ).toBe(false),
  );
  it.each(['0', '-1', '1.001', '100000000', 'NaN'])('rejects invalid quantity %s', (quantity) =>
    expect(validPackingWrite({ ...fields, quantity })).toBe(false),
  );
  it.each([
    [true, null, true],
    [true, id, true],
    [false, memberId, true],
    [false, id, false],
    [false, null, false],
  ])('editor=%s assignee=%s toggle=%s', (editor, assignedMemberId, expected) => {
    const trip = {
      archivedAt: null,
      lifecycle: 'ONGOING',
      currentMembership: { id: memberId, leftAt: null },
    } as TripDetailViewModel;
    const plan = { permissions: { canEdit: editor, canComplete: false } } as PlanViewModel;
    const item = { assignedMemberId, completedByUserId: memberId } as PackingItemViewModel;
    expect(canTogglePacking(trip, plan, item)).toBe(expected);
    expect(canTogglePacking({ ...trip, lifecycle: 'ARCHIVED' }, plan, item)).toBe(false);
  });
  it('resets changed name/quantity/assignment but not note/category/unit/date', () => {
    const before = {
      ...fields,
      assignedMemberId: memberId,
      status: 'COMPLETED',
    } as PackingItemViewModel;
    expect(packingRequiresReset(before, { ...before, name: 'Áo khoác' })).toBe(true);
    expect(packingRequiresReset(before, { ...before, quantity: '2' })).toBe(true);
    expect(packingRequiresReset(before, { ...before, assignedMemberId: null })).toBe(true);
    expect(packingRequiresReset(before, { ...before, quantity: '1.00' })).toBe(false);
    expect(packingRequiresReset(before, before)).toBe(false);
  });
  it('finds actual overlaps, not adjacent or unscheduled Activities', () => {
    const values = [
      { id: 'a', title: 'A', startsAt: '2026-11-05T01:00:00Z', endsAt: '2026-11-05T02:00:00Z' },
      { id: 'b', title: 'B', startsAt: '2026-11-05T02:00:00Z', endsAt: '2026-11-05T03:00:00Z' },
    ];
    expect(overlappingActivities(values)).toHaveLength(0);
    expect(overlappingActivities([...values, { ...values[0]!, id: 'c' }])).toHaveLength(1);
  });
});
describe('provider and DSS read boundaries', () => {
  it('route is read-like POST, with metadata and genuine geometry', async () => {
    const { travel, transport } = setup({
      data: {
        distance_m: 125,
        duration_seconds: 90,
        geometry: [
          { latitude: 16, longitude: 108 },
          { latitude: 17, longitude: 109 },
        ],
      },
      meta,
    });
    const route = await travel.route(
      tripId,
      [
        { latitude: 16, longitude: 108 },
        { latitude: 17, longitude: 109 },
      ],
      'WALKING',
      request().signal,
    );
    expect(route.data?.distanceM).toBe(125);
    expect(route.meta.provider).toBe('test-provider');
    expect(new Headers(transport.mock.calls[0]![1]?.headers).has('idempotency-key')).toBe(false);
  });
  it.each(['NO_RESULT', 'ERROR'])('missing route %s never becomes zero', async (status) => {
    const { travel } = setup({ data: null, meta: { ...meta, status } });
    expect((await travel.route(tripId, [], 'WALKING', request().signal)).data).toBeNull();
  });
  it('rejects a mock provider as live route data', async () => {
    const { travel } = setup({
      data: { distance_m: 0, duration_seconds: 0, geometry: [] },
      meta: { ...meta, is_mock: true },
    });
    expect((await travel.route(tripId, [], 'WALKING', request().signal)).data).toBeNull();
  });
  it('search candidates retain external identity, never saved UUID/version', async () => {
    const { travel } = setup({
      data: [
        {
          id: 'external-place',
          name: 'Bảo tàng',
          address: null,
          coordinates: { latitude: 16, longitude: 108 },
        },
      ],
      meta,
    });
    const result = await travel.search(tripId, 'Bảo tàng', request().signal);
    expect(result.data?.[0]).toMatchObject({ providerPlaceId: 'external-place' });
    expect(result.data?.[0]).not.toHaveProperty('planVersion');
  });
  it('validates proposal Trip, type, base version, uniqueness and expiry shape', () => {
    const proposal = {
      id,
      trip_id: tripId,
      type: 'PACKING_DRESS',
      base_plan_version: 1,
      expires_at: '2026-11-06T00:00:00Z',
      status: 'PENDING',
      input_hash: 'hash',
      rule_version: '1',
      proposal: {
        items: [
          {
            id: 'p1',
            type: 'PACKING_ITEM',
            values: { name: 'Áo mưa' },
            reason: 'Mưa',
            rule_ids: ['rain'],
          },
        ],
      },
      provider_sources: [meta],
      warnings: [],
    };
    expect(decodeRecommendation(proposal, tripId).items[0]?.reason).toBe('Mưa');
    expect(() => decodeRecommendation({ ...proposal, trip_id: id }, tripId)).toThrow();
    expect(() =>
      decodeRecommendation(
        {
          ...proposal,
          proposal: { items: [...proposal.proposal.items, ...proposal.proposal.items] },
        },
        tripId,
      ),
    ).toThrow();
  });
});
describe('shared command owner', () => {
  it('blocks a second mounted feature after unknown, reuses exact intent, and does not replay confirmed writes after failed reads', async () => {
    const refresh = vi.fn(async () => true),
      write = vi
        .fn()
        .mockResolvedValueOnce({
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        })
        .mockResolvedValue({ status: 'success', data: {}, correlationId: null });
    function Wrapper({ children }: { children: ReactNode }) {
      const commands = useOwnedPlanCommands({
        tripId,
        planVersion: 1,
        refresh,
        recoveryScope: 'shared',
      });
      return (
        <PlanCommandsContext.Provider value={{ scope: 'shared', commands }}>
          {children}
        </PlanCommandsContext.Provider>
      );
    }
    const options = { tripId, planVersion: 1, refresh, recoveryScope: 'shared' };
    const { result } = renderHook(
      () => ({ a: usePlanCommands(options), b: usePlanCommands(options) }),
      { wrapper: Wrapper },
    );
    await act(async () => {
      await result.current.a.execute(write, { kind: 'delete', activityId: id });
    });
    expect(result.current.b.blocked).toBe(true);
    const second = vi.fn();
    await act(async () => {
      expect(await result.current.b.execute(second)).toBe(false);
    });
    expect(second).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.b.reconcile();
    });
    refresh.mockResolvedValue(false);
    await act(async () => {
      await result.current.b.retryUnknown();
    });
    expect(write.mock.calls[0]?.[0].idempotencyKey).toBe(write.mock.calls[1]?.[0].idempotencyKey);
    expect(result.current.a.status).toBe('conflict');
    await act(async () => {
      await result.current.a.retryUnknown();
    });
    expect(write).toHaveBeenCalledTimes(2);
  });
});
