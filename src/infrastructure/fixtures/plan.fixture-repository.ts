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
import { createFixtureTripStore, type FixtureTripStore } from './trip-store';

export function createFixturePlanRepository(
  options: { viewerId?: string; editorTripIds?: readonly string[]; store?: FixtureTripStore } = {},
): PlanRepository {
  const store = options.store ?? createFixtureTripStore();
  return {
    async getPlan({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      const trip = readableFixtureTrips(options.viewerId ?? fixtureViewerId, store.readTrips()).find((t) => t.id === tripId);
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
      const packingItem = ({
        sequence,
        name,
        category,
        status,
        quantity = '1',
        unit = null,
        note = null,
        assignedMemberId = null,
        dueAt = '2026-09-21T18:00:00+07:00',
      }: {
        sequence: number;
        name: string;
        category: string;
        status: 'TODO' | 'COMPLETED';
        quantity?: string;
        unit?: string | null;
        note?: string | null;
        assignedMemberId?: string | null;
        dueAt?: string | null;
      }): PlanViewModel['packingItems'][number] => ({
        id: `d0000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
        tripId,
        name,
        quantity,
        unit,
        note,
        category,
        assignedMemberId,
        dueAt,
        status,
        source: 'MANUAL',
        completedByUserId: status === 'COMPLETED' ? fixtureViewerId : null,
        completedAt: status === 'COMPLETED' ? '2026-09-21T20:00:00+07:00' : null,
        planVersion: trip.planVersion,
      });
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
        dressCodes: seed
          ? [
              {
                id: 'c0000000-0000-4000-8000-000000000001',
                tripId,
                scopeType: 'TRIP',
                planDate: null,
                activityId: null,
                label: 'Thoải mái và gọn nhẹ',
                description: 'Ưu tiên chất liệu thoáng mát cho cả chuyến đi.',
                publicDescription: null,
                source: 'MANUAL',
                planVersion: trip.planVersion,
              },
              {
                id: 'c0000000-0000-4000-8000-000000000002',
                tripId,
                scopeType: 'DAY',
                planDate: '2026-09-22',
                activityId: null,
                label: 'Ngày đầu năng động',
                description: 'Giày đi bộ và áo khoác mỏng.',
                publicDescription: null,
                source: 'MANUAL',
                planVersion: trip.planVersion,
              },
              {
                id: 'c0000000-0000-4000-8000-000000000003',
                tripId,
                scopeType: 'ACTIVITY',
                planDate: null,
                activityId: activities[2]?.id ?? null,
                label: 'Trang phục đi biển',
                description: null,
                publicDescription: 'Mang theo nón và đồ chống nắng.',
                source: 'DSS',
                planVersion: trip.planVersion,
              },
            ]
          : [],
        packingItems: seed
          ? [
              packingItem({ sequence: 1, name: 'Áo khoác mỏng', category: 'Quần áo', status: 'COMPLETED', assignedMemberId: trip.currentMembership.id }),
              packingItem({ sequence: 2, name: 'Quần dài', category: 'Quần áo', status: 'COMPLETED', assignedMemberId: 'b0000000-0000-4000-8000-000000000002' }),
              packingItem({ sequence: 3, name: 'Đồ ngủ', category: 'Quần áo', status: 'COMPLETED' }),
              packingItem({ sequence: 4, name: 'Áo thun', category: 'Quần áo', status: 'COMPLETED', quantity: '3', unit: 'cái' }),
              packingItem({ sequence: 5, name: 'Nón rộng vành', category: 'Quần áo', status: 'COMPLETED' }),
              packingItem({ sequence: 6, name: 'Áo mưa', category: 'Quần áo', status: 'COMPLETED' }),
              packingItem({ sequence: 7, name: 'Bàn chải đánh răng', category: 'Đồ vệ sinh', status: 'COMPLETED', assignedMemberId: trip.currentMembership.id }),
              packingItem({ sequence: 8, name: 'Sữa tắm (dạng nhỏ)', category: 'Đồ vệ sinh', status: 'TODO' }),
              packingItem({ sequence: 9, name: 'Điện thoại', category: 'Điện tử', status: 'COMPLETED' }),
              packingItem({ sequence: 10, name: 'Sạc dự phòng', category: 'Điện tử', status: 'TODO' }),
              packingItem({ sequence: 11, name: 'Kem chống nắng', category: 'Thuốc & y tế', status: 'TODO', quantity: '1.5', unit: 'chai', note: 'Dùng chung cho nhóm', assignedMemberId: trip.currentMembership.id }),
              packingItem({ sequence: 12, name: 'Thuốc đau đầu', category: 'Thuốc & y tế', status: 'TODO', dueAt: null }),
            ]
          : [],
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
