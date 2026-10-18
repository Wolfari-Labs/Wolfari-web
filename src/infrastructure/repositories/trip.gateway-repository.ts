import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';

function domainError(error: unknown) {
  const api = error instanceof ApiError ? error : null;
  const code = api?.code;
  return { code: code === 'PERMISSION_DENIED' || code === 'RESOURCE_NOT_FOUND' || code === 'VERSION_CONFLICT' ? code : 'SERVICE_UNAVAILABLE' as const, correlationId: api?.correlationId ?? null, retryable: api?.retryable ?? true };
}
function text(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function mapTrip(raw: unknown) {
  const t = raw as Record<string, any>;
  const membership = t.current_membership ?? {};
  const permissions = t.permissions ?? {};
  return {
    id: String(t.id), name: String(t.name), startAt: String(t.start_at), endAt: String(t.end_at), timezone: String(t.timezone), lifecycle: t.lifecycle, planVersion: Number(t.plan_version), membershipRevision: Number(t.membership_revision), exportRevision: Number(t.export_revision),
    currentMembership: { id: String(membership.id), tripId: String(membership.trip_id), userId: String(membership.user_id), role: membership.role === 'OWNER' ? 'OWNER' : 'MEMBER', joinedAt: String(membership.joined_at), leftAt: text(membership.left_at) },
    permissions: { canRead: Boolean(permissions.can_read), canUpdate: Boolean(permissions.can_update) },
    presentation: { memberCount: null, cover: null }, description: text(t.description), publicDescription: text(t.public_description), archivedAt: text(t.archived_at), planEditPolicy: t.plan_edit_policy,
  } as const;
}

// Integration supplies a verified session-bound projection reader; no HTTP route is assumed here.
export type GatewayTripListReader = TripRepository['listTrips'];

export function createGatewayTripRepository(
  reader?: GatewayTripListReader,
  detailReader?: TripRepository['getTrip'],
  client?: GatewayHttpClient,
): TripRepository {
  return {
    async createTrip({ signal }) {
      signal.throwIfAborted();
      return { status: 'unavailable', correlationId: null, retryable: false };
    },
    getTrip:
      detailReader ??
      (async ({ tripId, signal }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}`, { signal, includeCredentials: true });
            return { status: 'ready' as const, data: mapTrip(result.data) as any };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            return { status: 'error' as const, error: domainError(error) as any };
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
            const result = await client.read('/api/v1/trips?limit=100', { signal, includeCredentials: true });
            const data = result.data as { items?: unknown[]; next_cursor?: string | null };
            return { status: 'ready' as const, data: { items: Array.isArray(data.items) ? data.items.map(mapTrip) as any : [], nextCursor: data.next_cursor ?? null } };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            return { status: 'error' as const, error: domainError(error) as any };
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
