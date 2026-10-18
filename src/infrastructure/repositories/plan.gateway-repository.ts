import type { PlanRepository } from '../../features/plan/model/plan';
import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';

function domainError(error: unknown) {
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

function mapPlan(raw: unknown) {
  const data = raw as Record<string, any>;
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const locations = Array.isArray(data.selected_locations) ? data.selected_locations : [];
  const dressCodes = Array.isArray(data.dress_codes) ? data.dress_codes : [];
  const packingItems = Array.isArray(data.packing_items) ? data.packing_items : [];
  return {
    tripId: String(data.trip_id), planVersion: number(data.plan_version), exportRevision: number(data.export_revision),
    activities: activities.map((a: any) => ({
      id: String(a.id), tripId: String(a.trip_id), title: String(a.title), description: text(a.description), publicDescription: text(a.public_description),
      activityType: String(a.activity_type), selectedLocationId: text(a.selected_location_id), startsAt: text(a.starts_at), endsAt: text(a.ends_at), position: number(a.position),
      status: a.status === 'COMPLETED' ? 'COMPLETED' : 'TODO', source: a.source === 'PROVIDER' || a.source === 'DSS' ? a.source : 'MANUAL',
      planVersion: number(a.plan_version), createdByUserId: String(a.created_by_user_id), completedByUserId: text(a.completed_by_user_id), completedAt: text(a.completed_at), presentation: { cover: null },
    })),
    selectedLocations: locations.map((l: any) => ({
      id: String(l.id), tripId: String(l.trip_id), name: String(l.name), address: text(l.address), latitude: text(l.latitude), longitude: text(l.longitude), provider: text(l.provider), providerPlaceId: text(l.provider_place_id),
      source: l.source === 'PROVIDER' || l.source === 'DSS' ? l.source : 'MANUAL', openingHours: l.opening_hours ?? null, fetchedAt: text(l.fetched_at), metadata: l.metadata && typeof l.metadata === 'object' ? l.metadata : {}, planVersion: number(l.plan_version),
    })),
    dressCodes: dressCodes.map((d: any) => ({ id: String(d.id), tripId: String(d.trip_id), scopeType: d.scope_type, planDate: text(d.plan_date), activityId: text(d.activity_id), label: String(d.label), description: text(d.description), publicDescription: text(d.public_description), source: d.source, planVersion: number(d.plan_version) })),
    packingItems: packingItems.map((p: any) => ({ id: String(p.id), tripId: String(p.trip_id), name: String(p.name), quantity: String(p.quantity), unit: text(p.unit), note: text(p.note), category: text(p.category), assignedMemberId: text(p.assigned_member_id), dueAt: text(p.due_at), status: p.status === 'COMPLETED' ? 'COMPLETED' : 'TODO', source: p.source, completedByUserId: text(p.completed_by_user_id), completedAt: text(p.completed_at), planVersion: number(p.plan_version) })),
    permissions: { canRead: Boolean(data.permissions?.can_read), canEdit: Boolean(data.permissions?.can_edit), canComplete: Boolean(data.permissions?.can_complete) },
  } as const;
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
            return { status: 'ready' as const, data: mapPlan(result.data) as any };
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
  };
}
