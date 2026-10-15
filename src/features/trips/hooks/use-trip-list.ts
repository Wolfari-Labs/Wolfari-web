import { useQuery } from '@tanstack/react-query';
import type { TripListScenario } from '../model/trip-list';
import { useTripRepository } from '../repositories/repository-context';

export function useTripList(scenario: TripListScenario) {
  const repository = useTripRepository();
  return useQuery({
    queryKey: ['trips', 'list', scenario],
    queryFn: ({ signal }) => repository.listTrips({ scenario, signal }),
  });
}
