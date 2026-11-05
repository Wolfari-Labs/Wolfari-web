import { useCallback, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlanCommandsContext, useOwnedPlanCommands } from '../hooks/use-plan-commands';
import { TripPlanRefreshContext, useTripPlanSnapshot } from '../hooks/use-trip-plan-snapshot';
import { usePlanRepository } from '../repositories/plan-context';
import { restorePlanCommand } from '../model/plan-command-intent';
import { ScheduleValidation } from './ScheduleValidation';

export function TripCommandsProvider({
  tripId,
  actorId,
  children,
}: {
  tripId: string;
  actorId: string;
  children: ReactNode;
}) {
  const snapshot = useTripPlanSnapshot(tripId, 'success');
  const repository = usePlanRepository();
  const cache = useQueryClient();
  const restoreCommand = useCallback(
    (payload: unknown) => restorePlanCommand(repository, tripId, payload),
    [repository, tripId],
  );
  const refresh = useCallback(async () => {
    // Mark all projections stale without independently racing active Trip/Plan reads.
    await Promise.all(
      ['plan', 'trip', 'trips', 'shell', 'members'].map((key) =>
        cache.invalidateQueries({ queryKey: [key], refetchType: 'none' }),
      ),
    );
    const ready = await snapshot.retry();
    if (ready)
      await Promise.all(
        ['shell', 'trips', 'members'].map((key) =>
          cache.refetchQueries({ queryKey: [key], type: 'active' }),
        ),
      );
    if (ready)
      await cache.refetchQueries({
        predicate: (q) => q.queryKey[0] === 'plan' && q.queryKey[2] === 'overview',
        type: 'active',
      });
    return ready;
  }, [cache, snapshot.retry]);
  const scope = `${tripId}:${actorId}`;
  const commands = useOwnedPlanCommands({
    tripId,
    planVersion: snapshot.state.status === 'ready' ? snapshot.state.plan.planVersion : 1,
    refresh,
    recoveryScope: scope,
    restoreCommand,
  });
  const value = useMemo(() => ({ scope, commands }), [scope, commands]);
  return (
    <PlanCommandsContext.Provider value={value}>
      <TripPlanRefreshContext.Provider
        value={{ tripId, refreshing: snapshot.refreshing, refreshFailed: snapshot.refreshFailed }}
      >
        {snapshot.state.status === 'ready' && (
          <ScheduleValidation
            trip={snapshot.state.trip}
            plan={snapshot.state.plan}
            refresh={refresh}
          />
        )}{' '}
        {children}
      </TripPlanRefreshContext.Provider>
    </PlanCommandsContext.Provider>
  );
}
