import { useQuery } from '@tanstack/react-query';
import type { DomainError } from '../../../shared/types/result';
import { useTripRepository } from '../../trips/repositories/repository-context';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { tripQueryKeys } from '../../trips/model/trip-query-keys';
import type { TripDetailScenario } from '../../trips/model/trip-detail';
import { usePlanRepository } from '../repositories/plan-context';
import type { PlanScenario, PlanViewModel } from '../model/plan';
import { planQueryKeys } from '../model/plan-query-keys';

export type TripPlanSnapshotState =
  | { readonly status: 'loading' }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly error: DomainError }
  | {
      readonly status: 'ready';
      readonly trip: TripDetailViewModel;
      readonly plan: PlanViewModel;
    };

const unavailable = (retryable: boolean): DomainError => ({
  code: 'SERVICE_UNAVAILABLE',
  correlationId: null,
  retryable,
});

function projectionMatches(plan: PlanViewModel) {
  return [
    ...plan.activities,
    ...plan.selectedLocations,
  ].every((item) => item.tripId === plan.tripId && item.planVersion === plan.planVersion);
}

export function useTripPlanSnapshot(
  tripId: string,
  scenario: PlanScenario,
  tripScenario: TripDetailScenario = 'success',
) {
  const tripRepository = useTripRepository();
  const planRepository = usePlanRepository();
  const tripQuery = useQuery({
    queryKey: tripQueryKeys.detail(tripId, tripScenario),
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: tripScenario, signal }),
    enabled: tripId !== '',
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed =
    !!trip?.permissions.canRead &&
    trip.id === tripId &&
    trip.currentMembership.leftAt === null &&
    trip.currentMembership.tripId === tripId;
  const planQuery = useQuery({
    queryKey: planQueryKeys.detail(tripId, scenario),
    queryFn: ({ signal }) => planRepository.getPlan({ tripId, scenario, signal }),
    enabled: allowed,
  });
  const plan = planQuery.data?.status === 'ready' ? planQuery.data.data : null;

  let state: TripPlanSnapshotState;
  if (tripId === '') {
    state = {
      status: 'error',
      error: { code: 'RESOURCE_NOT_FOUND', correlationId: null, retryable: false },
    };
  } else if (tripQuery.isPending || (allowed && planQuery.isPending)) {
    state = { status: 'loading' };
  } else if (tripQuery.isError || planQuery.isError) {
    state = { status: 'error', error: unavailable(true) };
  } else if (tripQuery.data?.status === 'error') {
    state = { status: 'error', error: tripQuery.data.error };
  } else if (trip && !allowed) {
    state = {
      status: 'error',
      error: { code: 'PERMISSION_DENIED', correlationId: null, retryable: false },
    };
  } else if (planQuery.data?.status === 'error') {
    state = { status: 'error', error: planQuery.data.error };
  } else if (plan && !plan.permissions.canRead) {
    state = {
      status: 'error',
      error: { code: 'PERMISSION_DENIED', correlationId: null, retryable: false },
    };
  } else if (
    trip &&
    plan &&
    (plan.tripId !== tripId ||
      plan.planVersion !== trip.planVersion ||
      plan.exportRevision !== trip.exportRevision ||
      !projectionMatches(plan))
  ) {
    state = {
      status: 'error',
      error: { code: 'VERSION_CONFLICT', correlationId: null, retryable: false },
    };
  } else if (trip && plan) {
    state = { status: 'ready', trip, plan };
  } else {
    state = { status: 'empty' };
  }

  return {
    state,
    retry() {
      void tripQuery.refetch();
      if (allowed) void planQuery.refetch();
    },
  };
}
