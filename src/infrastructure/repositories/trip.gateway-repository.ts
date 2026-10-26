import type {
  CreateTripResult,
  TripRepository,
  PlanEditPolicy,
  UpdatePlanPolicyResult,
  UpdateTripResult,
} from '../../features/trips/repositories/trip.repository';
import type { TripDetailViewModel } from '../../features/trips/model/trip-detail';
import type { TripLifecycle, TripListViewModel } from '../../features/trips/model/trip-list';
import type { DomainError } from '../../shared/types/result';
import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';
import { toDomainError } from '../http/domain-error';

function domainError(error: unknown): DomainError {
  return toDomainError(error);
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
function mapTrip(raw: unknown, correlationId: string | null = null): TripDetailViewModel {
  const t = record(raw);
  const membership = record(t.current_membership);
  const permissions = record(t.permissions);
  if (
    t.plan_edit_policy !== 'OWNER_ONLY' &&
    t.plan_edit_policy !== 'SELECTED_MEMBERS' &&
    t.plan_edit_policy !== 'ALL_MEMBERS'
  ) {
    throw new ApiError('Invalid Trip response', 'invalid-response', 200, null, correlationId, false);
  }
  const planEditPolicy: PlanEditPolicy = t.plan_edit_policy;
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

function createError(error: unknown): CreateTripResult {
  const api = error instanceof ApiError ? error : null;
  if (api?.status === 400 || api?.code === 'VALIDATION_FAILED') {
    const rawFields = record(record(api.details).field_errors);
    const fieldErrors: Extract<CreateTripResult, { status: 'validation-error' }>['fieldErrors'] = {
      ...(typeof rawFields.name === 'string' ? { name: rawFields.name } : {}),
      ...(typeof rawFields.description === 'string' ? { description: rawFields.description } : {}),
      ...(typeof rawFields.start_at === 'string' ? { startAt: rawFields.start_at } : {}),
      ...(typeof rawFields.end_at === 'string' ? { endAt: rawFields.end_at } : {}),
      ...(typeof rawFields.timezone === 'string' ? { timezone: rawFields.timezone } : {}),
    };
    return { status: 'validation-error', fieldErrors, correlationId: api?.correlationId ?? null };
  }
  if (api?.status === 403 || api?.code === 'PERMISSION_DENIED') {
    return { status: 'forbidden', correlationId: api.correlationId, retryable: false };
  }
  if (
    api?.status === 409 ||
    api?.code === 'VERSION_CONFLICT' ||
    api?.code === 'STATE_CONFLICT' ||
    api?.code === 'IDEMPOTENCY_CONFLICT'
  ) {
    return { status: 'conflict', correlationId: api.correlationId, retryable: false };
  }
  if (api?.status === 503) {
    return { status: 'unavailable', correlationId: api.correlationId, retryable: true };
  }
  if (api?.kind === 'network' || api?.kind === 'timeout') {
    return { status: 'unknown', correlationId: api.correlationId, retryable: true };
  }
  return {
    status: 'error',
    correlationId: api?.correlationId ?? null,
    retryable: api?.retryable ?? true,
  };
}

function updateError(error: unknown): UpdateTripResult {
  const api = error instanceof ApiError ? error : null;
  if (api?.status === 400) {
    const details = record(api.details);
    const rawFields = record(details.field_errors);
    const fieldErrors: { name?: string; description?: string; publicDescription?: string } = {};
    if (typeof rawFields.name === 'string') fieldErrors.name = rawFields.name;
    if (typeof rawFields.description === 'string') fieldErrors.description = rawFields.description;
    if (typeof rawFields.public_description === 'string') {
      fieldErrors.publicDescription = rawFields.public_description;
    }
    if (!fieldErrors.name && !fieldErrors.description && !fieldErrors.publicDescription) {
      fieldErrors.name = 'Thông tin chưa hợp lệ.';
    }
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
  if (api?.code === 'STATE_CONFLICT' || api?.code === 'IDEMPOTENCY_CONFLICT') {
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

function planPolicyError(error: unknown): UpdatePlanPolicyResult {
  const api = error instanceof ApiError ? error : null;
  const domain = domainError(error);
  if (api?.kind === 'network' || api?.kind === 'timeout' || api?.kind === 'invalid-response' || (api?.status !== null && api?.status !== undefined && api.status >= 500)) {
    return { status: 'unknown', error: domain };
  }
  return { status: 'error', error: domain };
}

function planPolicy(value: unknown, correlationId: string | null): {
  policy: PlanEditPolicy;
  editorMemberIds: readonly string[];
  membershipRevision: number;
} {
  const data = record(value);
  if (
    (data.policy !== 'ALL_MEMBERS' && data.policy !== 'OWNER_ONLY' && data.policy !== 'SELECTED_MEMBERS') ||
    !Array.isArray(data.editor_member_ids) ||
    !data.editor_member_ids.every((id) => typeof id === 'string' && id.trim() !== '') ||
    !Number.isSafeInteger(data.membership_revision) ||
    Number(data.membership_revision) < 1
  ) {
    throw new ApiError('Invalid plan policy response', 'invalid-response', 200, null, correlationId, false);
  }
  const editorMemberIds = data.editor_member_ids as string[];
  if (new Set(editorMemberIds).size !== editorMemberIds.length) {
    throw new ApiError('Invalid plan policy response', 'invalid-response', 200, null, correlationId, false);
  }
  return {
    policy: data.policy,
    editorMemberIds,
    membershipRevision: Number(data.membership_revision),
  };
}

// Integration supplies a verified session-bound projection reader; no HTTP route is assumed here.
export type GatewayTripListReader = TripRepository['listTrips'];

export function createGatewayTripRepository(
  reader?: GatewayTripListReader,
  detailReader?: TripRepository['getTrip'],
  client?: GatewayHttpClient,
): TripRepository {
  const repository: TripRepository = {
    createTrip: async ({ intent, signal }) => {
      signal.throwIfAborted();
      if (client) {
        try {
          const result = await client.write('/api/v1/trips', {
            method: 'POST',
            body: {
              name: intent.name,
              ...(intent.description === undefined ? {} : { description: intent.description }),
              start_at: intent.startAt,
              end_at: intent.endAt,
              timezone: intent.timezone,
              client_request_id: intent.clientRequestId,
            },
            idempotencyKey: intent.clientRequestId,
            signal,
            includeCredentials: true,
          });
          const trip = mapTrip(result.data, result.correlationId);
          return { status: 'created', tripId: trip.id, correlationId: result.correlationId };
        } catch (error) {
          if (signal.aborted) throw signal.reason;
          return createError(error);
        }
      }
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
      if (intent.publicDescription !== undefined)
        body.public_description = intent.publicDescription;
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
          trip: mapTrip(result.data, result.correlationId),
          correlationId: result.correlationId,
        };
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        return updateError(error);
      }
    },
    updatePlanPolicy: async ({
      tripId,
      policy,
      editorMemberIds,
      expectedMembershipRevision,
      idempotencyKey,
      signal,
    }) => {
      signal.throwIfAborted();
      if (!client)
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      try {
        const result = await client.write(
          `/api/v1/trips/${encodeURIComponent(tripId)}/plan-policy`,
          {
            method: 'PUT',
            body: {
              policy,
              editor_member_ids: policy === 'SELECTED_MEMBERS' ? editorMemberIds : [],
              expected_membership_revision: expectedMembershipRevision,
            },
            idempotencyKey,
            signal,
            includeCredentials: true,
          },
        );
        return {
          status: 'updated',
            data: planPolicy(result.data, result.correlationId),
          correlationId: result.correlationId,
        };
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        return planPolicyError(error);
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
            return { status: 'ready' as const, data: mapTrip(result.data, result.correlationId) };
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
      (async ({ signal, cursor, limit = 20 }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const params = new URLSearchParams({ limit: String(limit) });
            if (cursor !== undefined) params.set('cursor', cursor);
            const result = await client.read(`/api/v1/trips?${params.toString()}`, {
              signal,
              includeCredentials: true,
            });
            const data = result.data as { items?: unknown[]; next_cursor?: string | null };
            const projection: TripListViewModel = {
            items: Array.isArray(data.items)
              ? data.items.map((item) => mapTrip(item, result.correlationId))
              : [],
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
  if (!client) delete repository.updatePlanPolicy;
  return repository;
}
