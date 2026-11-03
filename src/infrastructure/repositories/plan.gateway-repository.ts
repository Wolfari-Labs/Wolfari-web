import type {
  ActivityUpdateFields,
  PlanRepository,
  PlanViewModel,
} from '../../features/plan/model/plan';
import { ApiError } from '../http/api-error';
import type { DomainError } from '../../shared/types/result';
import type { GatewayHttpClient } from '../http/http-client';
import { toDomainError } from '../http/domain-error';
import { validCalendarDate } from '../../shared/lib/calendar';

function domainError(error: unknown): DomainError {
  return toDomainError(error);
}

function invalid(): never {
  throw new ApiError('Invalid Plan response', 'invalid-response', null, null, null, false);
}
function requiredText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : invalid();
}
function uuid(value: unknown): string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : invalid();
}
const nullableId = (value: unknown) => (value === null ? null : uuid(value));
function instant(value: unknown): string | null {
  if (value === null) return null;
  const s = requiredText(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) &&
    Number.isFinite(Date.parse(s))
    ? s
    : invalid();
}
function text(value: unknown): string | null {
  return value === null ? null : typeof value === 'string' ? value : invalid();
}
function number(value: unknown, minimum = 1): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= 2147483647
    ? value
    : invalid();
}
function status(value: unknown): 'TODO' | 'COMPLETED' {
  return value === 'TODO' || value === 'COMPLETED' ? value : invalid();
}
function bool(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid();
}
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : invalid();
}
function source(value: unknown): 'MANUAL' | 'PROVIDER' | 'DSS' {
  return value === 'PROVIDER' || value === 'DSS' || value === 'MANUAL' ? value : invalid();
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid();
}

function activityFields(fields: ActivityUpdateFields): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  const keys = {
    title: 'title',
    activityType: 'activity_type',
    description: 'description',
    publicDescription: 'public_description',
    selectedLocationId: 'selected_location_id',
    startsAt: 'starts_at',
    endsAt: 'ends_at',
    scheduledDate: 'scheduled_date',
    position: 'position',
  } as const;
  for (const key of Object.keys(keys) as (keyof typeof keys)[]) {
    if (Object.hasOwn(fields, key) && fields[key] !== undefined) mapped[keys[key]] = fields[key];
  }
  return mapped;
}

function mapActivity(raw: unknown): PlanViewModel['activities'][number] {
  const activity = record(raw);
  const scheduledDate =
    activity.scheduled_date === undefined ? null : text(activity.scheduled_date);
  if (
    scheduledDate !== null &&
    (!validCalendarDate(scheduledDate) || activity.starts_at !== null || activity.ends_at !== null)
  )
    invalid();
  if ((activity.starts_at === null) !== (activity.ends_at === null)) invalid();
  if (
    activity.starts_at !== null &&
    !(Date.parse(requiredText(activity.ends_at)) > Date.parse(requiredText(activity.starts_at)))
  )
    invalid();
  return {
    id: uuid(activity.id),
    tripId: uuid(activity.trip_id),
    title: requiredText(activity.title),
    description: text(activity.description),
    publicDescription: text(activity.public_description),
    activityType: requiredText(activity.activity_type),
    selectedLocationId: nullableId(activity.selected_location_id),
    startsAt: instant(activity.starts_at),
    endsAt: instant(activity.ends_at),
    scheduledDate,
    position: number(activity.position, 0),
    status: status(activity.status),
    source: source(activity.source),
    planVersion: number(activity.plan_version),
    createdByUserId: uuid(activity.created_by_user_id),
    completedByUserId: nullableId(activity.completed_by_user_id),
    completedAt: instant(activity.completed_at),
    presentation: { cover: null },
  };
}

function mapPlanVersion(raw: unknown): { planVersion: number; exportRevision: number } {
  const data = record(raw);
  return { planVersion: number(data.plan_version), exportRevision: number(data.export_revision) };
}

function activityReceipt(raw: unknown, tripId: string, activityId?: string) {
  const result = mapActivity(raw);
  if (result.tripId !== tripId || (activityId !== undefined && result.id !== activityId)) invalid();
  return result;
}

function mapPlan(raw: unknown, expectedTripId: string): PlanViewModel {
  const data = record(raw);
  const activities = list(data.activities);
  const locations = list(data.selected_locations);
  const dressCodes = list(data.dress_codes);
  const packingItems = list(data.packing_items);
  const permissions = record(data.permissions);
  if (data.trip_id !== expectedTripId) invalid();
  for (const items of [activities, locations, dressCodes, packingItems]) {
    const ids = new Set<string>();
    for (const item of items) {
      const row = record(item);
      const id = uuid(row.id);
      if (row.trip_id !== expectedTripId || row.plan_version !== data.plan_version || ids.has(id))
        invalid();
      ids.add(id);
    }
  }
  return {
    tripId: uuid(data.trip_id),
    planVersion: number(data.plan_version),
    exportRevision: number(data.export_revision),
    activities: activities.map((value) => {
      return mapActivity(value);
    }),
    selectedLocations: locations.map((value) => {
      const location = record(value);
      return {
        id: uuid(location.id),
        tripId: uuid(location.trip_id),
        name: requiredText(location.name),
        address: text(location.address),
        latitude: text(location.latitude),
        longitude: text(location.longitude),
        provider: text(location.provider),
        providerPlaceId: text(location.provider_place_id),
        source: source(location.source),
        openingHours: location.opening_hours ?? null,
        fetchedAt: instant(location.fetched_at),
        metadata: record(location.metadata),
        planVersion: number(location.plan_version),
      };
    }),
    dressCodes: dressCodes.map((value) => {
      const dressCode = record(value);
      const scopeType =
        dressCode.scope_type === 'DAY' || dressCode.scope_type === 'ACTIVITY'
          ? dressCode.scope_type
          : dressCode.scope_type === 'TRIP'
            ? 'TRIP'
            : invalid();
      return {
        id: uuid(dressCode.id),
        tripId: uuid(dressCode.trip_id),
        scopeType,
        planDate: text(dressCode.plan_date),
        activityId: nullableId(dressCode.activity_id),
        label: requiredText(dressCode.label),
        description: text(dressCode.description),
        publicDescription: text(dressCode.public_description),
        source: source(dressCode.source),
        planVersion: number(dressCode.plan_version),
      };
    }),
    packingItems: packingItems.map((value) => {
      const packingItem = record(value);
      return {
        id: uuid(packingItem.id),
        tripId: uuid(packingItem.trip_id),
        name: requiredText(packingItem.name),
        quantity: requiredText(packingItem.quantity),
        unit: text(packingItem.unit),
        note: text(packingItem.note),
        category: text(packingItem.category),
        assignedMemberId: nullableId(packingItem.assigned_member_id),
        dueAt: instant(packingItem.due_at),
        status: status(packingItem.status),
        source: source(packingItem.source),
        completedByUserId: nullableId(packingItem.completed_by_user_id),
        completedAt: instant(packingItem.completed_at),
        planVersion: number(packingItem.plan_version),
      };
    }),
    permissions: {
      canRead: bool(permissions.can_read),
      canEdit: bool(permissions.can_edit),
      canComplete: bool(permissions.can_complete),
    },
  };
}
export function createGatewayPlanRepository(
  reader?: PlanRepository['getPlan'],
  client?: GatewayHttpClient,
): PlanRepository {
  const repository: PlanRepository = {
    getPlan:
      reader ??
      (async ({ tripId, signal }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/plan`, {
              signal,
              includeCredentials: true,
            });
            return { status: 'ready' as const, data: mapPlan(result.data, tripId) };
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
      return {
        status: 'success' as const,
        data: map(result.data),
        correlationId: result.correlationId,
      };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error' as const, error: domainError(error) };
    }
  };

  repository.createActivity = ({ tripId, expectedPlanVersion, idempotencyKey, activity, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities`,
      'POST',
      { expected_plan_version: expectedPlanVersion, ...activityFields(activity) },
      idempotencyKey,
      signal,
      (raw) => activityReceipt(raw, tripId),
    );
  repository.updateActivity = ({
    tripId,
    activityId,
    expectedPlanVersion,
    idempotencyKey,
    fields,
    signal,
  }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      'PATCH',
      { expected_plan_version: expectedPlanVersion, ...activityFields(fields) },
      idempotencyKey,
      signal,
      (raw) => activityReceipt(raw, tripId, activityId),
    );
  repository.setActivityCompletion = ({
    tripId,
    activityId,
    expectedPlanVersion,
    idempotencyKey,
    status,
    signal,
  }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/completion`,
      'PATCH',
      { expected_plan_version: expectedPlanVersion, status },
      idempotencyKey,
      signal,
      (raw) => activityReceipt(raw, tripId, activityId),
    );
  repository.deleteActivity = ({
    tripId,
    activityId,
    expectedPlanVersion,
    idempotencyKey,
    signal,
  }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      'DELETE',
      { expected_plan_version: expectedPlanVersion, confirmed: true },
      idempotencyKey,
      signal,
      mapPlanVersion,
    );
  repository.reorderActivities = ({
    tripId,
    expectedPlanVersion,
    idempotencyKey,
    activityIds,
    signal,
  }) =>
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
