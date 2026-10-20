import type { PlanRepository, PlanViewModel } from '../../features/plan/model/plan';
import type { DomainError } from '../../shared/types/result';
import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';

function domainError(error: unknown): DomainError {
  const api = error instanceof ApiError ? error : null;
  const code = api?.code;
  return {
    code: code === 'PERMISSION_DENIED' || code === 'RESOURCE_NOT_FOUND' || code === 'VERSION_CONFLICT'
      ? code
      : 'SERVICE_UNAVAILABLE' as const,
    correlationId: api?.correlationId ?? null,
    retryable: api?.retryable ?? true,
  };
}

function text(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function number(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function mapPlan(raw: unknown): PlanViewModel {
  const data = record(raw);
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const locations = Array.isArray(data.selected_locations) ? data.selected_locations : [];
  const permissions = record(data.permissions);
  return {
    tripId: String(data.trip_id), planVersion: number(data.plan_version), exportRevision: number(data.export_revision),
    activities: activities.map((value) => {
      const activity = record(value);
      return {
        id: String(activity.id), tripId: String(activity.trip_id), title: String(activity.title), description: text(activity.description), publicDescription: text(activity.public_description),
        activityType: String(activity.activity_type), selectedLocationId: text(activity.selected_location_id), startsAt: text(activity.starts_at), endsAt: text(activity.ends_at), position: number(activity.position),
        status: activity.status === 'COMPLETED' ? 'COMPLETED' as const : 'TODO' as const,
        source: activity.source === 'PROVIDER' || activity.source === 'DSS' ? activity.source : 'MANUAL',
        planVersion: number(activity.plan_version), createdByUserId: String(activity.created_by_user_id), completedByUserId: text(activity.completed_by_user_id), completedAt: text(activity.completed_at), presentation: { cover: null },
      };
    }),
    selectedLocations: locations.map((value) => {
      const location = record(value);
      return {
        id: String(location.id), tripId: String(location.trip_id), name: String(location.name), address: text(location.address), latitude: text(location.latitude), longitude: text(location.longitude), provider: text(location.provider), providerPlaceId: text(location.provider_place_id),
        source: location.source === 'PROVIDER' || location.source === 'DSS' ? location.source : 'MANUAL',
        openingHours: location.opening_hours ?? null, fetchedAt: text(location.fetched_at), metadata: record(location.metadata), planVersion: number(location.plan_version),
      };
    }),
    permissions: { canRead: Boolean(permissions.can_read), canEdit: Boolean(permissions.can_edit), canComplete: Boolean(permissions.can_complete) },
  };
}
export function createGatewayPlanRepository(reader?: PlanRepository['getPlan'], client?: GatewayHttpClient): PlanRepository {
  return {
    getPlan:
      reader ??
      (async ({ tripId, signal }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/plan`, { signal, includeCredentials: true });
            return { status: 'ready' as const, data: mapPlan(result.data) };
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
  };
}
