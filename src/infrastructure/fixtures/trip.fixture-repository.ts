import type {
  ReadResult,
  TripListViewModel,
  TripListItem,
} from '../../features/trips/model/trip-list';
import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import type { TripDetailViewModel } from '../../features/trips/model/trip-detail';
import { fixtureViewerId, readableFixtureTrips, previewTripId } from './trip-catalog';
import overviewMobile from '../../shared/assets/figma/8efc6.svg';
import overviewCover from '../../shared/assets/figma/1dc61.png';
import { createFixtureTripStore, type FixtureTripStore } from './trip-store';
import { validTripBudget, validTripTimezone } from '../../features/trips/model/trip-metadata';

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
      publicDescription: store.readPublicDescription(item.id),
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
      const item = readableFixtureTrips(viewerId, store.readTrips()).find(
        (item) => item.id === tripId,
      );
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
      const hasPublicDescription = intent.publicDescription !== undefined;
      const hasSchedule =
        intent.startAt !== undefined || intent.endAt !== undefined || intent.timezone !== undefined;
      const hasBudget = intent.budgetAmount !== undefined;
      const name = intent.name?.trim();
      if (!hasName && !hasDescription && !hasPublicDescription && !hasSchedule && !hasBudget) {
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
      const startAt = intent.startAt ?? item.startAt;
      const endAt = intent.endAt ?? item.endAt;
      const timezone = intent.timezone ?? item.timezone;
      if (
        !Number.isFinite(Date.parse(startAt)) ||
        !Number.isFinite(Date.parse(endAt)) ||
        Date.parse(endAt) <= Date.parse(startAt)
      )
        return {
          status: 'validation-error',
          fieldErrors: { endAt: 'Khoảng ngày chuyến đi chưa hợp lệ.' },
          correlationId: 'fixture-trip-update',
        };
      if (!validTripTimezone(timezone))
        return {
          status: 'validation-error',
          fieldErrors: { timezone: 'Múi giờ chưa hợp lệ.' },
          correlationId: 'fixture-trip-update',
        };
      if (intent.budgetAmount != null && !validTripBudget(intent.budgetAmount))
        return {
          status: 'validation-error',
          fieldErrors: { budgetAmount: 'Ngân sách chưa hợp lệ.' },
          correlationId: 'fixture-trip-update',
        };
      const nextDescription = hasDescription
        ? (intent.description ?? null)
        : store.readDescription(tripId);
      const nextPublicDescription = hasPublicDescription
        ? (intent.publicDescription ?? null)
        : store.readPublicDescription(tripId);
      const changed =
        (hasName && name !== item.name) ||
        (hasDescription && nextDescription !== store.readDescription(tripId)) ||
        (hasPublicDescription && nextPublicDescription !== store.readPublicDescription(tripId)) ||
        (hasBudget && intent.budgetAmount !== (item.budgetAmount ?? null));
      const scheduleChanged =
        Date.parse(startAt) !== Date.parse(item.startAt) ||
        Date.parse(endAt) !== Date.parse(item.endAt) ||
        timezone !== item.timezone;
      const next: TripListItem = {
        ...item,
        ...(hasName ? { name: name! } : {}),
        startAt,
        endAt,
        timezone,
        ...(hasBudget ? { budgetAmount: intent.budgetAmount } : {}),
        planVersion: item.planVersion + (scheduleChanged ? 1 : 0),
        exportRevision: item.exportRevision + (changed || scheduleChanged ? 1 : 0),
      };
      store.saveTrip(next, nextDescription, nextPublicDescription);
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
