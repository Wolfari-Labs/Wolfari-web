import type {
  ReadResult,
  TripListViewModel,
  TripListItem,
} from '../../features/trips/model/trip-list';
import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import { fixtureTripCatalog, fixtureViewerId, readableFixtureTrips } from './trip-catalog';

export function createFixtureTripRepository(
  options: { viewerId?: string; records?: readonly TripListItem[] } = {},
): TripRepository {
  const viewerId = options.viewerId ?? fixtureViewerId;
  const records = structuredClone(options.records ?? fixtureTripCatalog);
  return {
    async listTrips({ scenario, signal }): Promise<ReadResult<TripListViewModel>> {
      signal.throwIfAborted();
      if (scenario === 'loading') {
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      }
      if (scenario === 'empty') return { status: 'empty' };
      if (scenario !== 'success') {
        return {
          status: 'error',
          error: {
            code:
              scenario === 'forbidden'
                ? 'PERMISSION_DENIED'
                : scenario === 'conflict'
                  ? 'VERSION_CONFLICT'
                  : 'SERVICE_UNAVAILABLE',
            correlationId: 'fixture-trip-list',
            retryable: scenario === 'error',
          },
        };
      }
      const items = readableFixtureTrips(viewerId, records);
      if (items.length === 0) return { status: 'empty' };
      return { status: 'ready', data: structuredClone({ items, nextCursor: null }) };
    },
  };
}
