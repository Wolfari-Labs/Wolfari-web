import type { PlanRepository, PlanViewModel } from '../../features/plan/model/plan';
import type { DomainError } from '../../shared/types/result';
import type { GatewayHttpClient } from '../http/http-client';
import { toDomainError } from '../http/domain-error';

function domainError(error: unknown): DomainError {
  return toDomainError(error);
}

function text(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function number(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function source(value: unknown): 'MANUAL' | 'PROVIDER' | 'DSS' {
  return value === 'PROVIDER' || value === 'DSS' ? value : 'MANUAL';
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function mapActivity(raw: unknown): PlanViewModel['activities'][number] {
  const activity = record(raw);
  return {
    id: String(activity.id), tripId: String(activity.trip_id), title: String(activity.title), description: text(activity.description), publicDescription: text(activity.public_description),
    activityType: String(activity.activity_type), selectedLocationId: text(activity.selected_location_id), startsAt: text(activity.starts_at), endsAt: text(activity.ends_at), position: number(activity.position),
    status: activity.status === 'COMPLETED' ? 'COMPLETED' as const : 'TODO' as const,
    source: source(activity.source),
    planVersion: number(activity.plan_version), createdByUserId: String(activity.created_by_user_id), completedByUserId: text(activity.completed_by_user_id), completedAt: text(activity.completed_at), presentation: { cover: null },
  };
}

function mapPlanVersion(raw: unknown): { planVersion: number; exportRevision: number } {
  const data = record(raw);
  return { planVersion: number(data.plan_version), exportRevision: number(data.export_revision) };
}

function mapPlan(raw: unknown): PlanViewModel {
  const data = record(raw);
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const locations = Array.isArray(data.selected_locations) ? data.selected_locations : [];
  const dressCodes = Array.isArray(data.dress_codes) ? data.dress_codes : [];
  const packingItems = Array.isArray(data.packing_items) ? data.packing_items : [];
  const permissions = record(data.permissions);
  return {
    tripId: String(data.trip_id), planVersion: number(data.plan_version), exportRevision: number(data.export_revision),
    activities: activities.map((value) => {
      return mapActivity(value);
    }),
    selectedLocations: locations.map((value) => {
      const location = record(value);
      return {
        id: String(location.id), tripId: String(location.trip_id), name: String(location.name), address: text(location.address), latitude: text(location.latitude), longitude: text(location.longitude), provider: text(location.provider), providerPlaceId: text(location.provider_place_id),
        source: source(location.source),
        openingHours: location.opening_hours ?? null, fetchedAt: text(location.fetched_at), metadata: record(location.metadata), planVersion: number(location.plan_version),
      };
    }),
    dressCodes: dressCodes.map((value) => {
      const dressCode = record(value);
      const scopeType = dressCode.scope_type === 'DAY' || dressCode.scope_type === 'ACTIVITY'
        ? dressCode.scope_type
        : 'TRIP';
      return {
        id: String(dressCode.id), tripId: String(dressCode.trip_id), scopeType,
        planDate: text(dressCode.plan_date), activityId: text(dressCode.activity_id), label: String(dressCode.label),
        description: text(dressCode.description), publicDescription: text(dressCode.public_description),
        source: source(dressCode.source), planVersion: number(dressCode.plan_version),
      };
    }),
    packingItems: packingItems.map((value) => {
      const packingItem = record(value);
      return {
        id: String(packingItem.id), tripId: String(packingItem.trip_id), name: String(packingItem.name),
        quantity: String(packingItem.quantity), unit: text(packingItem.unit), note: text(packingItem.note),
        category: text(packingItem.category), assignedMemberId: text(packingItem.assigned_member_id), dueAt: text(packingItem.due_at),
        status: packingItem.status === 'COMPLETED' ? 'COMPLETED' as const : 'TODO' as const,
        source: source(packingItem.source), completedByUserId: text(packingItem.completed_by_user_id),
        completedAt: text(packingItem.completed_at), planVersion: number(packingItem.plan_version),
      };
    }),
    permissions: { canRead: Boolean(permissions.can_read), canEdit: Boolean(permissions.can_edit), canComplete: Boolean(permissions.can_complete) },
  };
}
export function createGatewayPlanRepository(reader?: PlanRepository['getPlan'], client?: GatewayHttpClient): PlanRepository {
  const repository: PlanRepository = {
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
  if (!client) return repository;

  const command = async <T>(
    path: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: unknown,
    idempotencyKey: string,
    signal: AbortSignal,
    map: (value: unknown) => T,
  ) => {
    signal.throwIfAborted();
    try {
      const result = await client.write(path, {
        method,
        body,
        idempotencyKey,
        signal,
        includeCredentials: true,
      });
      return { status: 'success' as const, data: map(result.data), correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error' as const, error: domainError(error) };
    }
  };

  repository.createActivity = ({ tripId, expectedPlanVersion, idempotencyKey, activity, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities`,
      'POST',
      { expected_plan_version: expectedPlanVersion, title: activity.title, activity_type: activity.activityType, description: activity.description, public_description: activity.publicDescription, selected_location_id: activity.selectedLocationId, starts_at: activity.startsAt, ends_at: activity.endsAt, position: activity.position },
      idempotencyKey,
      signal,
      mapActivity,
    );
  repository.updateActivity = ({ tripId, activityId, expectedPlanVersion, idempotencyKey, fields, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      'PATCH',
      { expected_plan_version: expectedPlanVersion, ...fields },
      idempotencyKey,
      signal,
      mapActivity,
    );
  repository.setActivityCompletion = ({ tripId, activityId, expectedPlanVersion, idempotencyKey, status, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/completion`,
      'PATCH',
      { expected_plan_version: expectedPlanVersion, status },
      idempotencyKey,
      signal,
      mapActivity,
    );
  repository.deleteActivity = ({ tripId, activityId, expectedPlanVersion, idempotencyKey, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      'DELETE',
      { expected_plan_version: expectedPlanVersion, confirmed: true },
      idempotencyKey,
      signal,
      mapPlanVersion,
    );
  repository.reorderActivities = ({ tripId, expectedPlanVersion, idempotencyKey, activityIds, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/order`,
      'PUT',
      { expected_plan_version: expectedPlanVersion, activity_ids: activityIds },
      idempotencyKey,
      signal,
      mapPlanVersion,
    );
  return repository;
}
