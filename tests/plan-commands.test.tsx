import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TripRepositoryProvider } from '../src/features/trips/repositories/repository-context';
import { PlanRepositoryProvider } from '../src/features/plan/repositories/plan-context';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import { useTripPlanSnapshot } from '../src/features/plan/hooks/use-trip-plan-snapshot';
import { describe, expect, it, vi } from 'vitest';
import {
  usePlanCommands,
  type PlanCommandContext,
} from '../src/features/plan/hooks/use-plan-commands';
import type { PlanCommandResult } from '../src/features/plan/model/plan';
import { restorePlanCommand } from '../src/features/plan/model/plan-command-intent';

const success = { status: 'success' as const, data: {}, correlationId: null };
const error = (code: 'VERSION_CONFLICT' | 'SERVICE_UNAVAILABLE' | 'PERMISSION_DENIED') => ({
  status: 'error' as const,
  error: { code, correlationId: null, retryable: false },
});

describe('Plan command lifecycle', () => {
  it('refetches partial server changes and blocks even a definitive validation error until review', async () => {
    const refresh = vi.fn(async () => true);
    const hook = renderHook(() =>
      usePlanCommands({ tripId: 'partial-arrangement', planVersion: 7, refresh }),
    );
    await act(async () => {
      expect(
        await hook.result.current.execute(async () => ({
          status: 'error',
          error: { code: 'VALIDATION_FAILED', correlationId: null, retryable: false },
          partialFailure: true,
        })),
      ).toBe(false);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toMatchObject({
      status: 'error',
      blocked: true,
      partialFailure: true,
      error: { code: 'VALIDATION_FAILED' },
    });
    const next = vi.fn(async () => success);
    await act(async () => {
      expect(await hook.result.current.execute(next)).toBe(false);
    });
    expect(next).not.toHaveBeenCalled();
    await act(async () => {
      expect(await hook.result.current.reconcile()).toBe(true);
    });
    expect(hook.result.current).toMatchObject({
      status: 'idle',
      blocked: false,
      partialFailure: false,
    });
    hook.unmount();
  });

  it('warns of possible partial arrangement after reload and retains it if receipt replay loses permission', async () => {
    const recoveryScope = 'arrangement-recovery:alice';
    const key = `wolfari:plan-command:${recoveryScope}`;
    const intent = {
      kind: 'arrange',
      basePlanVersion: 7,
      steps: [
        { kind: 'schedule', activityId: 'a', scheduledDate: '2026-11-06' },
        { kind: 'reorder', activityIds: ['a', 'b'] },
      ],
    };
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        expectedPlanVersion: 7,
        idempotencyKey: '18bab54a-4296-496f-92d7-69bc8d1a9a3d',
        payload: intent,
      }),
    );
    const update = vi.fn(async () => error('PERMISSION_DENIED'));
    const reorder = vi.fn();
    const refresh = vi.fn(async () => true);
    const hook = renderHook(() =>
      usePlanCommands({
        tripId: 'arrangement-recovery',
        planVersion: 12,
        refresh,
        recoveryScope,
        restoreCommand: (payload) =>
          restorePlanCommand(
            {
              getPlan: vi.fn(),
              updateActivity: update,
              reorderActivities: reorder,
            },
            'arrangement-recovery',
            payload,
          ),
      }),
    );
    expect(hook.result.current).toMatchObject({
      status: 'unknown',
      blocked: true,
      partialFailure: true,
    });
    expect(update).not.toHaveBeenCalled();
    await act(async () => {
      await hook.result.current.reconcile();
    });
    await act(async () => {
      expect(await hook.result.current.retryUnknown()).toBe(false);
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ expectedPlanVersion: 7 }));
    expect(reorder).not.toHaveBeenCalled();
    expect(hook.result.current).toMatchObject({
      status: 'error',
      blocked: true,
      partialFailure: true,
    });
    expect(window.sessionStorage.getItem(key)).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(2);
    hook.unmount();
  });
  it('writes a terminal marker if deleting a confirmed recovery record fails', async () => {
    const options = {
      tripId: 'terminal',
      planVersion: 1,
      refresh: async () => true,
      recoveryScope: 'terminal:alice',
    };
    const hook = renderHook(() => usePlanCommands(options));
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw Error('blocked deletion');
    });
    await act(async () => {
      await hook.result.current.execute(async () => success, { kind: 'delete', activityId: 'a' });
    });
    remove.mockRestore();
    hook.unmount();
    const restore = vi.fn(() => vi.fn(async () => success));
    const next = renderHook(() => usePlanCommands({ ...options, restoreCommand: restore }));
    expect(next.result.current.status).toBe('conflict');
    expect(next.result.current.blocked).toBe(true);
    expect(restore).not.toHaveBeenCalled();
    await act(async () => {
      expect(await next.result.current.reconcile()).toBe(true);
    });
    expect(next.result.current.blocked).toBe(false);
    next.unmount();
    window.sessionStorage.removeItem('wolfari:plan-command:terminal:alice');
  });
  it('restores an interrupted intent for the same actor without automatically replaying it', async () => {
    const refresh = vi.fn(async () => true);
    const original = vi.fn(async () => error('SERVICE_UNAVAILABLE'));
    const payload = { kind: 'delete', activityId: 'activity-1' };
    const first = renderHook(() =>
      usePlanCommands({
        tripId: 'recovery',
        planVersion: 4,
        refresh,
        recoveryScope: 'recovery:alice',
      }),
    );
    await act(async () => {
      await first.result.current.execute(original, payload);
    });
    const saved = JSON.parse(window.sessionStorage.getItem('wolfari:plan-command:recovery:alice')!);
    first.unmount();
    const replay = vi.fn(async () => success);
    const restore = vi.fn(() => replay);
    const second = renderHook(() =>
      usePlanCommands({
        tripId: 'recovery',
        planVersion: 8,
        refresh,
        recoveryScope: 'recovery:alice',
        restoreCommand: restore,
      }),
    );
    expect(restore).toHaveBeenCalledWith(payload);
    expect(second.result.current.status).toBe('unknown');
    expect(second.result.current.blocked).toBe(true);
    expect(replay).not.toHaveBeenCalled();
    const otherActor = renderHook(() =>
      usePlanCommands({
        tripId: 'recovery',
        planVersion: 8,
        refresh,
        recoveryScope: 'recovery:bob',
        restoreCommand: restore,
      }),
    );
    expect(otherActor.result.current.status).toBe('idle');
    await act(async () => {
      await second.result.current.reconcile();
    });
    await act(async () => {
      await second.result.current.retryUnknown();
    });
    expect(replay).toHaveBeenCalledWith(
      expect.objectContaining({ expectedPlanVersion: 4, idempotencyKey: saved.idempotencyKey }),
    );
    expect(window.sessionStorage.getItem('wolfari:plan-command:recovery:alice')).toBeNull();
    second.unmount();
    otherActor.unmount();
  });

  it('does not send a recoverable write if its recovery record cannot be persisted', async () => {
    const hook = renderHook(() =>
      usePlanCommands({
        tripId: 'storage',
        planVersion: 1,
        refresh: async () => true,
        recoveryScope: 'storage:alice',
      }),
    );
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('quota');
    });
    const command = vi.fn(async () => success);
    await act(async () => {
      expect(await hook.result.current.execute(command, { kind: 'delete', activityId: 'a' })).toBe(
        false,
      );
    });
    expect(command).not.toHaveBeenCalled();
    expect(hook.result.current.recoveryAvailable).toBe(false);
    write.mockRestore();
    hook.unmount();
  });

  it('keeps the coherent snapshot mounted while Trip and Plan refetch finish separately', async () => {
    const trips = createFixtureTripRepository();
    const plans = createFixturePlanRepository();
    const request = {
      tripId: previewTripId,
      scenario: 'success' as const,
      signal: new AbortController().signal,
    };
    const t = await trips.getTrip(request);
    const p = await plans.getPlan(request);
    if (t.status !== 'ready' || p.status !== 'ready') throw Error('fixtures missing');
    let finishPlan!: () => void;
    let refreshed = false;
    let mismatched = false;
    let readFailure: 'SERVICE_UNAVAILABLE' | 'PERMISSION_DENIED' | null = null;
    const nextPlan = {
      ...p.data,
      planVersion: 2,
      activities: p.data.activities.map((item) => ({ ...item, planVersion: 2 })),
      selectedLocations: p.data.selectedLocations.map((item) => ({ ...item, planVersion: 2 })),
      dressCodes: p.data.dressCodes.map((item) => ({ ...item, planVersion: 2 })),
      packingItems: p.data.packingItems.map((item) => ({ ...item, planVersion: 2 })),
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tripRepository = {
      ...trips,
      getTrip: vi.fn(async () =>
        refreshed ? { status: 'ready' as const, data: { ...t.data, planVersion: 2 } } : t,
      ),
    };
    const planRepository = {
      ...plans,
      getPlan: vi.fn(async () => {
        if (readFailure) return error(readFailure);
        if (mismatched) return p;
        if (!refreshed) return p;
        await new Promise<void>((resolve) => {
          finishPlan = resolve;
        });
        return { status: 'ready' as const, data: nextPlan };
      }),
    };
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>
          <TripRepositoryProvider repository={tripRepository}>
            <PlanRepositoryProvider repository={planRepository}>{children}</PlanRepositoryProvider>
          </TripRepositoryProvider>
        </QueryClientProvider>
      );
    }
    const hook = renderHook(() => useTripPlanSnapshot(previewTripId, 'success'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(hook.result.current.state.status).toBe('ready'));
    refreshed = true;
    let running!: Promise<boolean>;
    act(() => {
      running = hook.result.current.retry();
    });
    await waitFor(() => expect(tripRepository.getTrip).toHaveBeenCalledTimes(2));
    expect(hook.result.current.state.status).toBe('ready');
    expect(hook.result.current.refreshing).toBe(true);
    await act(async () => {
      finishPlan();
      expect(await running).toBe(true);
    });
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        status: 'ready',
        plan: { planVersion: 2 },
        trip: { planVersion: 2 },
      }),
    );
    readFailure = 'SERVICE_UNAVAILABLE';
    await act(async () => {
      expect(await hook.result.current.retry()).toBe(false);
    });
    expect(hook.result.current.state.status).toBe('ready');
    expect(hook.result.current.refreshFailed).toBe(true);
    readFailure = null;
    mismatched = true;
    await act(async () => {
      expect(await hook.result.current.retry()).toBe(false);
    });
    expect(hook.result.current.refreshing).toBe(false);
    expect(hook.result.current.refreshFailed).toBe(true);
    expect(hook.result.current.state).toMatchObject({
      status: 'ready',
      trip: { planVersion: 2 },
      plan: { planVersion: 2 },
    });
    readFailure = 'PERMISSION_DENIED';
    await act(async () => {
      expect(await hook.result.current.retry()).toBe(false);
    });
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        status: 'error',
        error: { code: 'PERMISSION_DENIED' },
      }),
    );
    hook.unmount();
    client.clear();
  });
  it('permits one write per trip across hook instances and refreshes after confirmation', async () => {
    let finish!: (value: PlanCommandResult<unknown>) => void;
    const command = vi.fn(
      () =>
        new Promise<PlanCommandResult<unknown>>((resolve) => {
          finish = resolve;
        }),
    );
    const refresh = vi.fn(async () => true);
    const a = renderHook(() => usePlanCommands({ tripId: 'one', planVersion: 7, refresh }));
    const b = renderHook(() => usePlanCommands({ tripId: 'one', planVersion: 7, refresh }));
    let running!: Promise<boolean>;
    act(() => {
      running = a.result.current.execute(command);
    });
    await act(async () => {
      expect(await b.result.current.execute(command)).toBe(false);
    });
    expect(command).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(success);
      expect(await running).toBe(true);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a.result.current.status).toBe('success');
  });

  it('never retries unknown automatically and retains exact key/version/intent after reconciliation', async () => {
    const refresh = vi.fn(async () => true);
    const calls: PlanCommandContext[] = [];
    const command = vi.fn(async (context: PlanCommandContext) => {
      calls.push(context);
      return calls.length === 1 ? error('SERVICE_UNAVAILABLE') : success;
    });
    const hook = renderHook(
      ({ version }) => usePlanCommands({ tripId: 'unknown', planVersion: version, refresh }),
      { initialProps: { version: 3 } },
    );
    await act(async () => {
      await hook.result.current.execute(command);
    });
    expect(hook.result.current.status).toBe('unknown');
    expect(hook.result.current.blocked).toBe(true);
    await act(async () => {
      expect(await hook.result.current.execute(vi.fn(async () => success))).toBe(false);
      expect(await hook.result.current.retryUnknown()).toBe(false);
    });
    hook.rerender({ version: 10 });
    await act(async () => {
      await hook.result.current.reconcile();
    });
    expect(command).toHaveBeenCalledTimes(1);
    await act(async () => {
      expect(await hook.result.current.retryUnknown()).toBe(true);
    });
    expect(calls[1]?.expectedPlanVersion).toBe(3);
    expect(calls[1]?.idempotencyKey).toBe(calls[0]?.idempotencyKey);
  });

  it('requires a successful explicit refresh after conflict before a new user intent', async () => {
    const refresh = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const hook = renderHook(
      ({ version }) => usePlanCommands({ tripId: 'conflict', planVersion: version, refresh }),
      { initialProps: { version: 3 } },
    );
    await act(async () => {
      await hook.result.current.execute(async () => error('VERSION_CONFLICT'));
    });
    await act(async () => {
      expect(await hook.result.current.reconcile()).toBe(false);
    });
    expect(hook.result.current.blocked).toBe(true);
    hook.rerender({ version: 4 });
    await act(async () => {
      expect(await hook.result.current.reconcile()).toBe(true);
    });
    const command = vi.fn(async () => success);
    await act(async () => {
      await hook.result.current.execute(command);
    });
    expect(command).toHaveBeenCalledWith(expect.objectContaining({ expectedPlanVersion: 4 }));
  });

  it('never replays a confirmed write when the subsequent snapshot read fails', async () => {
    const hook = renderHook(() =>
      usePlanCommands({ tripId: 'confirmed', planVersion: 1, refresh: async () => false }),
    );
    const command = vi.fn(async () => success);
    await act(async () => {
      expect(await hook.result.current.execute(command)).toBe(true);
    });
    expect(hook.result.current.blocked).toBe(true);
    await act(async () => {
      expect(await hook.result.current.retryUnknown()).toBe(false);
    });
    expect(command).toHaveBeenCalledTimes(1);
  });

  it('keeps an unknown intent blocked when reconciliation fails', async () => {
    const refresh = vi.fn(async () => {
      throw Error('read offline');
    });
    const command = vi.fn(async () => error('SERVICE_UNAVAILABLE'));
    const hook = renderHook(() => usePlanCommands({ tripId: 'offline', planVersion: 5, refresh }));
    await act(async () => {
      await hook.result.current.execute(command);
    });
    await act(async () => {
      expect(await hook.result.current.reconcile()).toBe(false);
    });
    expect(hook.result.current.status).toBe('unknown');
    expect(hook.result.current.blocked).toBe(true);
    expect(hook.result.current.canRetryUnknown).toBe(false);
    await act(async () => {
      expect(await hook.result.current.retryUnknown()).toBe(false);
    });
    expect(command).toHaveBeenCalledTimes(1);
  });

  it('ignores late responses after changing trips', async () => {
    let finish!: (value: PlanCommandResult<unknown>) => void;
    const refresh = vi.fn(async () => true);
    const hook = renderHook(({ tripId }) => usePlanCommands({ tripId, planVersion: 1, refresh }), {
      initialProps: { tripId: 'old' },
    });
    let running!: Promise<boolean>;
    act(() => {
      running = hook.result.current.execute(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    });
    hook.rerender({ tripId: 'new' });
    await act(async () => {
      finish(success);
      expect(await running).toBe(false);
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('idle');
  });

  it('shows definitive permission errors without treating them as unknown', async () => {
    const hook = renderHook(() =>
      usePlanCommands({ tripId: 'denied', planVersion: 1, refresh: async () => true }),
    );
    await act(async () => {
      await hook.result.current.execute(async () => error('PERMISSION_DENIED'));
    });
    expect(hook.result.current.status).toBe('error');
    expect(hook.result.current.error?.code).toBe('PERMISSION_DENIED');
    expect(hook.result.current.canRetryUnknown).toBe(false);
    expect(hook.result.current.blocked).toBe(true);
  });
});
