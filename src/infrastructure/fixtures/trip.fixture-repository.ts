import type {
  ReadResult,
  TripListViewModel,
  TripListItem,
} from '../../features/trips/model/trip-list';
import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import type { TripDetailViewModel } from '../../features/trips/model/trip-detail';
import {
  fixtureViewerId,
  readableFixtureTrips,
  previewTripId,
} from './trip-catalog';
import overviewMobile from '../../shared/assets/figma/8efc6.svg';
import overviewCover from '../../shared/assets/figma/1dc61.png';
import { createFixtureTripStore, type FixtureTripStore } from './trip-store';

export function createFixtureTripRepository(
  options: { viewerId?: string; records?: readonly TripListItem[]; store?: FixtureTripStore } = {},
): TripRepository {
  const viewerId = options.viewerId ?? fixtureViewerId;
  const store = options.store ?? createFixtureTripStore(options.records);
  const receipts = new Map<
    string,
    { fingerprint: string; result: Awaited<ReturnType<TripRepository['updateTrip']>> }
  >();

  function detail(item: TripListItem): TripDetailViewModel {
    return {
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
      description: store.readDescription(item.id),
      publicDescription: null,
      archivedAt: item.lifecycle === 'ARCHIVED' ? '2026-09-24T00:00:00+07:00' : null,
      planEditPolicy: 'OWNER_ONLY',
    };
  }
  return {
    async createTrip({ signal }) {
      signal.throwIfAborted();
      return {
        status: 'unavailable',
        correlationId: 'fixture-trip-create',
        retryable: false,
      };
    },
    async updateTrip({ tripId, intent, signal }) {
      signal.throwIfAborted();
      const item = readableFixtureTrips(viewerId, store.readTrips()).find((item) => item.id === tripId);
      if (!item)
        return { status: 'not-found', correlationId: 'fixture-trip-update', retryable: false };
      if (
        item.currentMembership.role !== 'OWNER' ||
        !item.permissions.canUpdate ||
        item.lifecycle === 'ARCHIVED'
      ) {
        return { status: 'forbidden', correlationId: 'fixture-trip-update', retryable: false };
      }
      const fingerprint = JSON.stringify({ tripId, ...intent });
      const receipt = receipts.get(intent.idempotencyKey);
      if (receipt) {
        return receipt.fingerprint === fingerprint
          ? structuredClone(receipt.result)
          : { status: 'conflict', correlationId: 'fixture-trip-update', retryable: false };
      }
      if (
        intent.expectedPlanVersion !== item.planVersion ||
        intent.expectedExportRevision !== item.exportRevision
      ) {
        return { status: 'conflict', correlationId: 'fixture-trip-update', retryable: false };
      }
      const hasName = intent.name !== undefined;
      const hasDescription = intent.description !== undefined;
      const name = intent.name?.trim();
      if (!hasName && !hasDescription) {
        return {
          status: 'validation-error',
          fieldErrors: { name: 'Không có thay đổi để lưu.' },
          correlationId: 'fixture-trip-update',
        };
      }
      if (hasName && (!name || name.length > 200)) {
        return {
          status: 'validation-error',
          fieldErrors: { name: 'Tên chuyến đi phải có từ 1 đến 200 ký tự.' },
          correlationId: 'fixture-trip-update',
        };
      }
      const nextDescription = hasDescription
        ? (intent.description ?? null)
        : store.readDescription(tripId);
      const changed =
        (hasName && name !== item.name) ||
        (hasDescription && nextDescription !== store.readDescription(tripId));
      const next: TripListItem = {
        ...item,
        ...(hasName ? { name: name! } : {}),
        exportRevision: item.exportRevision + (changed ? 1 : 0),
      };
      store.saveTrip(next, nextDescription);
      const result = {
        status: 'updated' as const,
        trip: detail(next),
        correlationId: 'fixture-trip-update',
      };
      receipts.set(intent.idempotencyKey, { fingerprint, result: structuredClone(result) });
      return structuredClone(result);
    },
    async getTrip({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      const item = readableFixtureTrips(viewerId, store.readTrips()).find((t) => t.id === tripId);
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
      return { status: 'ready', data: structuredClone(detail(item)) };
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
      const items = readableFixtureTrips(viewerId, store.readTrips());
      if (items.length === 0) return { status: 'empty' };
      return { status: 'ready', data: structuredClone({ items, nextCursor: null }) };
    },
  };
}
