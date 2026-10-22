import { useInfiniteQuery } from '@tanstack/react-query';
import type { TripListScenario } from '../model/trip-list';
import { useTripRepository } from '../repositories/repository-context';
import { tripQueryKeys } from '../model/trip-query-keys';

export function useTripList(scenario: TripListScenario, enabled = true) {
  const repository = useTripRepository();
  return useInfiniteQuery({
    queryKey: tripQueryKeys.list(scenario),
    initialPageParam: null as string | null,
    queryFn: async ({ signal, pageParam }) => {
      const result = await repository.listTrips({
        scenario,
        signal,
        ...(pageParam === null ? {} : { cursor: pageParam }),
        limit: 20,
      });
      if (result.status === 'error') throw result.error;
      return result.status === 'empty' ? { items: [], nextCursor: null } : result.data;
    },
    getNextPageParam: (lastPage, _pages, _lastPageParam, pageParams) => {
      const cursor = lastPage.nextCursor;
      return cursor && !pageParams.includes(cursor) ? cursor : undefined;
    },
    retry: false,
    enabled,
  });
}
