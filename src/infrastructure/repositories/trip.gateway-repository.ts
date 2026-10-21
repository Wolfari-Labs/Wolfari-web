import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import type { UpdateTripResult } from '../../features/trips/repositories/trip.repository';
import type { TripDetailViewModel } from '../../features/trips/model/trip-detail';
import type { TripLifecycle, TripListViewModel } from '../../features/trips/model/trip-list';
import type { DomainError } from '../../shared/types/result';
import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';

function domainError(error: unknown): DomainError {
  const api = error instanceof ApiError ? error : null;
  const code = api?.code;
  return {
    code:
      code === 'PERMISSION_DENIED' || code === 'RESOURCE_NOT_FOUND' || code === 'VERSION_CONFLICT'
        ? code
        : ('SERVICE_UNAVAILABLE' as const),
    correlationId: api?.correlationId ?? null,
    retryable: api?.retryable ?? true,
  };
}
function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
function lifecycle(value: unknown): TripLifecycle {
  return value === 'ONGOING' || value === 'COMPLETED' || value === 'ARCHIVED' ? value : 'UPCOMING';
}
function mapTrip(raw: unknown): TripDetailViewModel {
  const t = record(raw);
  const membership = record(t.current_membership);
  const permissions = record(t.permissions);
  const planEditPolicy =
    t.plan_edit_policy === 'OWNER_ONLY' || t.plan_edit_policy === 'SELECTED_MEMBERS'
      ? t.plan_edit_policy
      : 'ALL_MEMBERS';
  return {
    id: String(t.id),
    name: String(t.name),
    startAt: String(t.start_at),
    endAt: String(t.end_at),
    timezone: String(t.timezone),
    lifecycle: lifecycle(t.lifecycle),
    planVersion: Number(t.plan_version),
    membershipRevision: Number(t.membership_revision),
    exportRevision: Number(t.export_revision),
    currentMembership: {
      id: String(membership.id),
      tripId: String(membership.trip_id),
      userId: String(membership.user_id),
      role: membership.role === 'OWNER' ? 'OWNER' : 'MEMBER',
      joinedAt: String(membership.joined_at),
      leftAt: text(membership.left_at),
    },
    permissions: {
      canRead: Boolean(permissions.can_read),
      canUpdate: Boolean(permissions.can_update),
    },
    presentation: { memberCount: null, cover: null },
    description: text(t.description),
    publicDescription: text(t.public_description),
    archivedAt: text(t.archived_at),
    planEditPolicy,
  };
}

function updateError(error: unknown): UpdateTripResult {
  const api = error instanceof ApiError ? error : null;
  if (api?.status === 400) {
    const details = record(api.details);
    const rawFields = record(details.field_errors);
    const fieldErrors: { name?: string; description?: string } = {};
    if (typeof rawFields.name === 'string') fieldErrors.name = rawFields.name;
    if (typeof rawFields.description === 'string') fieldErrors.description = rawFields.description;
    if (!fieldErrors.name && !fieldErrors.description) fieldErrors.name = 'Thông tin chưa hợp lệ.';
    return { status: 'validation-error', fieldErrors, correlationId: api.correlationId };
  }
  if (api?.status === 403 || api?.code === 'PERMISSION_DENIED') {
    return { status: 'forbidden', correlationId: api.correlationId, retryable: false };
  }
  if (api?.status === 404 || api?.code === 'RESOURCE_NOT_FOUND') {
    return { status: 'not-found', correlationId: api.correlationId, retryable: false };
  }
  if (api?.status === 409 || api?.code === 'VERSION_CONFLICT') {
    return { status: 'conflict', correlationId: api.correlationId, retryable: false };
  }
  if (api?.status === 503) {
    return { status: 'unavailable', correlationId: api.correlationId, retryable: true };
  }
  return {
    status: 'unknown',
    correlationId: api?.correlationId ?? null,
    retryable: api?.retryable ?? true,
  };
}

// Integration supplies a verified session-bound projection reader; no HTTP route is assumed here.
export type GatewayTripListReader = TripRepository['listTrips'];

export function createGatewayTripRepository(
  reader?: GatewayTripListReader,
  detailReader?: TripRepository['getTrip'],
  client?: GatewayHttpClient,
): TripRepository {
  return {
    createTrip: async ({ signal }) => {
      signal.throwIfAborted();
      return {
        status: 'unavailable' as const,
        correlationId: null,
        retryable: false,
      };
    },
    updateTrip: async ({ tripId, intent, signal }) => {
      signal.throwIfAborted();
      if (!client) {
        return { status: 'unavailable', correlationId: null, retryable: false };
      }
      const body: Record<string, unknown> = {
        expected_plan_version: intent.expectedPlanVersion,
        expected_export_revision: intent.expectedExportRevision,
      };
      if (intent.name !== undefined) body.name = intent.name;
      if (intent.description !== undefined) body.description = intent.description;
      try {
        const result = await client.write(`/api/v1/trips/${encodeURIComponent(tripId)}`, {
          method: 'PATCH',
          body,
          idempotencyKey: intent.idempotencyKey,
          signal,
          includeCredentials: true,
        });
        return {
          status: 'updated',
          trip: mapTrip(result.data),
          correlationId: result.correlationId,
        };
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        return updateError(error);
      }
    },
    getTrip:
      detailReader ??
      (async ({ tripId, signal }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}`, {
              signal,
              includeCredentials: true,
            });
            return { status: 'ready' as const, data: mapTrip(result.data) };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            return { status: 'error' as const, error: domainError(error) };
          }
        }
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      }),
    listTrips:
      reader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const result = await client.read('/api/v1/trips?limit=100', {
              signal,
              includeCredentials: true,
            });
            const data = result.data as { items?: unknown[]; next_cursor?: string | null };
            const projection: TripListViewModel = {
              items: Array.isArray(data.items) ? data.items.map(mapTrip) : [],
              nextCursor: data.next_cursor ?? null,
            };
            return { status: 'ready' as const, data: projection };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            return { status: 'error' as const, error: domainError(error) };
          }
        }
        return {
          status: 'error',
          error: {
            code: 'SERVICE_UNAVAILABLE',
            correlationId: null,
            retryable: false,
          },
        };
      }),
  };
}
