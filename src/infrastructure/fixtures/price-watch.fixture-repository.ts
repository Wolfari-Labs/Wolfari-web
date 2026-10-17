import type {
  CabinClass,
  JourneyType,
  PriceObservation,
  PriceWatchItem,
  PriceWatchPermissions,
  PriceWatchRepository,
  PriceWatchScenario,
  PriceWatchViewModel,
  WatchStatus,
} from '../../features/price-watch/model/price-watch';
import { fixtureViewerId, previewTripId, readableFixtureTrips } from './trip-catalog';

const otherMemberId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function observation(
  id: string,
  observedAt: string,
  priceVnd: string | null,
  status: PriceObservation['status'] = 'OBSERVED',
  note: string | null = null,
): PriceObservation {
  return {
    id,
    observedAt,
    priceVnd,
    status,
    provider: 'Fixture Air Search',
    note,
  };
}

function watch({
  id,
  ownerUserId,
  ownerName,
  status,
  latestPriceVnd,
  observations,
  tripId,
  selfOwned,
}: {
  id: string;
  ownerUserId: string;
  ownerName: string;
  status: WatchStatus;
  latestPriceVnd: string | null;
  observations: readonly PriceObservation[];
  tripId: string;
  selfOwned: boolean;
}): PriceWatchItem {
  const journeyType: JourneyType = id.endsWith('2') ? 'ROUND_TRIP' : 'ONE_WAY';
  const cabin: CabinClass = id.endsWith('2') ? 'PREMIUM_ECONOMY' : 'ECONOMY';
  const latestObservedAt = [...observations].reverse().find(
    (item) => item.status !== 'PROVIDER_ERROR' && item.priceVnd !== null,
  )?.observedAt;
  return {
    id,
    tripId,
    ownerUserId,
    owner: { displayName: ownerName, avatar: null },
    origin: id.endsWith('2') ? 'Hà Nội (HAN)' : 'TP. Hồ Chí Minh (SGN)',
    destination: id.endsWith('2') ? 'Đà Nẵng (DAD)' : 'Đà Nẵng (DAD)',
    journeyType,
    departureDate: id.endsWith('2') ? '2026-10-16' : '2026-09-22',
    returnDate: journeyType === 'ROUND_TRIP' ? '2026-10-19' : null,
    passengers: id.endsWith('2') ? 2 : 1,
    cabin,
    thresholdVnd: id.endsWith('2') ? '2800000' : '2500000',
    latestPriceVnd,
    currency: 'VND',
    provider: 'Fixture Air Search',
    // A failed provider attempt updates the watch status, but it must not look
    // like a fresh fare observation. Keep the time of the last real price.
    observedAt: latestObservedAt ?? null,
    status,
    version: 4,
    createdAt: '2026-09-01T08:00:00+07:00',
    updatedAt: observations.at(-1)?.observedAt ?? '2026-09-01T08:00:00+07:00',
    selfOwned,
    observations,
  };
}

function permissions(readOnly: boolean): PriceWatchPermissions {
  return {
    canRead: true,
    canCreate: !readOnly,
    canEditOwn: !readOnly,
    canPauseOwn: !readOnly,
    canResumeOwn: !readOnly,
    canDeleteOwn: !readOnly,
    // Fixture viewer is Owner of the preview trip, so this is intentionally
    // true to show the separate “delete another member's watch” rule.
    canDeleteAny: !readOnly,
  };
}

function ready(
  tripId: string,
  viewerId: string,
  scenario: Extract<
    PriceWatchScenario,
    'success' | 'created' | 'paused' | 'stale' | 'provider-error' | 'read-only'
  >,
): PriceWatchViewModel {
  const readOnly = scenario === 'read-only';
  const selfStatus: WatchStatus =
    scenario === 'paused'
      ? 'PAUSED'
      : scenario === 'stale'
        ? 'STALE'
        : scenario === 'provider-error'
          ? 'PROVIDER_ERROR'
          : 'ACTIVE';
  const selfObservations =
    scenario === 'provider-error'
      ? [
          observation('obs-1', '2026-09-03T10:00:00+07:00', '2350000'),
          observation(
            'obs-2',
            '2026-09-08T10:00:00+07:00',
            null,
            'PROVIDER_ERROR',
            'Nguồn tìm kiếm đang lỗi · giữ lại giá quan sát gần nhất',
          ),
        ]
      : [
          observation('obs-1', '2026-09-03T10:00:00+07:00', '2450000'),
          observation('obs-2', '2026-09-08T10:00:00+07:00', '2400000'),
          observation(
            'obs-3',
            '2026-09-12T10:00:00+07:00',
            '2350000',
            scenario === 'stale' ? 'STALE' : 'OBSERVED',
            scenario === 'stale' ? 'Đã quá thời gian cập nhật dự kiến' : null,
          ),
        ];
  const watches = [
    watch({
      id: 'watch-1',
      ownerUserId: viewerId,
      ownerName: 'Trang Nguyễn',
      status: selfStatus,
      latestPriceVnd: '2350000',
      observations: selfObservations,
      tripId,
      selfOwned: true,
    }),
    watch({
      id: 'watch-2',
      ownerUserId: otherMemberId,
      ownerName: 'Minh Anh',
      status: 'ACTIVE',
      latestPriceVnd: '2790000',
      observations: [
        observation('obs-4', '2026-09-07T10:00:00+07:00', '2940000'),
        observation('obs-5', '2026-09-12T10:00:00+07:00', '2790000'),
      ],
      tripId,
      selfOwned: false,
    }),
  ];
  return {
    tripId,
    providerEnvironment: 'TEST',
    watches,
    permissions: permissions(readOnly),
    watchVersion: 4,
  };
}

function errorFor(scenario: PriceWatchScenario) {
  return {
    status: 'error' as const,
    error: {
      code:
        scenario === 'forbidden'
          ? ('PERMISSION_DENIED' as const)
          : scenario === 'not-found'
            ? ('RESOURCE_NOT_FOUND' as const)
            : scenario === 'conflict'
              ? ('VERSION_CONFLICT' as const)
              : ('SERVICE_UNAVAILABLE' as const),
      correlationId: 'fixture-price-watch-read',
      retryable: scenario === 'error',
    },
  };
}

export function createFixturePriceWatchRepository(options: { viewerId?: string } = {}): PriceWatchRepository {
  const viewerId = options.viewerId ?? fixtureViewerId;
  const trips = readableFixtureTrips(viewerId);
  return {
    async getPriceWatch({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      const trip = trips.find((item) => item.id === tripId);
      if (!trip || scenario === 'not-found') return errorFor('not-found');
      if (scenario === 'forbidden') return errorFor('forbidden');
      if (
        !['success', 'created', 'paused', 'stale', 'provider-error', 'read-only'].includes(
          scenario,
        )
      )
        return errorFor(scenario);
      return {
        status: 'ready',
        data: structuredClone(
          ready(
            tripId,
            viewerId,
            scenario as 'success' | 'created' | 'paused' | 'stale' | 'provider-error' | 'read-only',
          ),
        ),
      };
    },
  };
}

export { previewTripId };
