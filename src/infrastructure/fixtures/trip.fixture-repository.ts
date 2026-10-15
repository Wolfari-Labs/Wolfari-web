import type {
  ReadResult,
  TripListViewModel,
  TripListItem,
} from '../../features/trips/model/trip-list';
import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import {
  fixtureTripCatalog,
  fixtureViewerId,
  readableFixtureTrips,
  previewTripId,
} from './trip-catalog';
import overviewMobile from '../../shared/assets/figma/8efc6.svg';
import overviewCover from '../../shared/assets/figma/1dc61.png';

export function createFixtureTripRepository(
  options: { viewerId?: string; records?: readonly TripListItem[] } = {},
): TripRepository {
  const viewerId = options.viewerId ?? fixtureViewerId;
  const records = structuredClone(options.records ?? fixtureTripCatalog);
  return {
    async getTrip({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      const item = readableFixtureTrips(viewerId, records).find((t) => t.id === tripId);
      if (scenario !== 'success' || !item)
        return {
          status: 'error',
          error: {
            code:
              !item || scenario === 'not-found'
                ? 'RESOURCE_NOT_FOUND'
                : scenario === 'forbidden'
                  ? 'PERMISSION_DENIED'
                  : scenario === 'conflict'
                    ? 'VERSION_CONFLICT'
                    : 'SERVICE_UNAVAILABLE',
            correlationId: 'fixture-trip-detail',
            retryable: scenario === 'error',
          },
        };
      return {
        status: 'ready',
        data: structuredClone({
          ...item,
          presentation: {
            ...item.presentation,
            cover: item.presentation.cover
              ? {
                  ...item.presentation.cover,
                  src: item.id === previewTripId ? overviewCover : item.presentation.cover.src,
                  mobileSrc:
                    item.id === previewTripId ? overviewMobile : item.presentation.cover.mobileSrc,
                }
              : null,
          },
          description: null,
          publicDescription: null,
          archivedAt: null,
          planEditPolicy: 'OWNER_ONLY' as const,
        }),
      };
    },
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
