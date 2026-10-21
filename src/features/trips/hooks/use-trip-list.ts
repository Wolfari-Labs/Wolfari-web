import { useQuery } from '@tanstack/react-query';
import type { TripListScenario } from '../model/trip-list';
import { useTripRepository } from '../repositories/repository-context';
import { tripQueryKeys } from '../model/trip-query-keys';

export function useTripList(scenario: TripListScenario, enabled = true) {
  const repository = useTripRepository();
  return useQuery({
    queryKey: tripQueryKeys.list(scenario),
    queryFn: ({ signal }) => repository.listTrips({ scenario, signal }),
    enabled,
  });
}
