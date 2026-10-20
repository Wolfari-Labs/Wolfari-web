import type {
  PlanRepository,
  PlanViewModel,
  ActivityViewModel,
} from '../../features/plan/model/plan';
import { fixtureViewerId, readableFixtureTrips, previewTripId } from './trip-catalog';
import beach from '../../shared/assets/figma/a84f7.png';
import mountain from '../../shared/assets/figma/3a3f8.png';
import seafood from '../../shared/assets/figma/1dc61.png';
import bridge from '../../shared/assets/figma/42524.png';

export function createFixturePlanRepository(
  options: { viewerId?: string; editorTripIds?: readonly string[] } = {},
): PlanRepository {
  const records = readableFixtureTrips(options.viewerId ?? fixtureViewerId);
  return {
    async getPlan({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      const trip = records.find((t) => t.id === tripId);
      if (!trip || !['success', 'read-only'].includes(scenario))
        return {
          status: 'error',
          error: {
            code:
              !trip || scenario === 'not-found'
                ? 'RESOURCE_NOT_FOUND'
                : scenario === 'forbidden'
                  ? 'PERMISSION_DENIED'
                  : scenario === 'conflict'
                    ? 'VERSION_CONFLICT'
                    : 'SERVICE_UNAVAILABLE',
            correlationId: 'fixture-plan-read',
            retryable: !!trip && scenario === 'error',
          },
        };
      const seed = tripId === previewTripId;
      const names = [
        'Bán đảo Sơn Trà',
        'Ăn trưa hải sản',
        'Bãi biển Mỹ Khê',
        'Cầu Rồng',
        'Chùa Linh Ứng',
        'Ngũ Hành Sơn',
      ];
      const coordinates: readonly (readonly [string, string] | null)[] = [
        ['16.118200', '108.277700'],
        ['16.067800', '108.220800'],
        ['16.054400', '108.246100'],
        ['16.061100', '108.227700'],
        ['16.100300', '108.277100'],
        null,
      ];
      const addresses = [
        'Thọ Quang, Sơn Trà, Đà Nẵng',
        'Sơn Trà, Đà Nẵng',
        'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
        'An Hải, Sơn Trà, Đà Nẵng',
        'Hoàng Sa, Sơn Trà, Đà Nẵng',
        null,
      ];
      const locations = seed
        ? names.map((name, i) => ({
            id: `a0000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
            tripId,
            name,
            address: addresses[i] ?? null,
            latitude: coordinates[i]?.[0] ?? null,
            longitude: coordinates[i]?.[1] ?? null,
            provider: i < 2 ? 'fixture-map' : null,
            providerPlaceId: i < 2 ? `fixture-place-${i + 1}` : null,
            source: i < 2 ? ('PROVIDER' as const) : ('MANUAL' as const),
            openingHours: null,
            fetchedAt: i < 2 ? '2026-09-20T08:00:00+07:00' : null,
            metadata: {},
            planVersion: trip.planVersion,
          }))
        : [];
      const times = [
        ['08:00', '10:30'],
        ['11:30', '13:00'],
        ['14:00', '16:00'],
        ['19:00', '20:30'],
      ];
      const covers = [mountain, seafood, beach, bridge];
      const activities: ActivityViewModel[] = seed
        ? names
            .slice(0, 4)
            .map((title, i) => ({
              id: `b0000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
              tripId,
              title,
              description:
                i === 2
                  ? 'Bãi cát trắng, làn nước trong xanh và không gian thoáng đãng để cả nhóm cùng thư giãn.'
                  : null,
              publicDescription: null,
              activityType: ['SIGHTSEEING', 'MEAL', 'BEACH', 'WALK'][i]!,
              selectedLocationId: locations[i]!.id,
              startsAt: `2026-09-22T${times[i]![0]}:00+07:00`,
              endsAt: `2026-09-22T${times[i]![1]}:00+07:00`,
              position: i,
              status: 'TODO',
              source: 'MANUAL',
              planVersion: trip.planVersion,
              createdByUserId: fixtureViewerId,
              completedByUserId: null,
              completedAt: null,
              presentation: { cover: { src: covers[i]!, alt: '' } },
            }))
        : [];
      const data: PlanViewModel = {
        tripId,
        planVersion: trip.planVersion,
        exportRevision: trip.exportRevision,
        activities,
        selectedLocations: locations,
        permissions: {
          canRead: true,
          canEdit:
            scenario !== 'read-only' &&
            (trip.currentMembership.role === 'OWNER' || !!options.editorTripIds?.includes(tripId)),
          canComplete: true,
        },
      };
      return { status: 'ready', data: structuredClone(data) };
    },
  };
}
