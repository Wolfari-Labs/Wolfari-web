import type {
  CreateTripResult,
  TripRepository,
  PersonalReminder,
  PlanEditPolicy,
  UpdatePlanPolicyResult,
  UpdateTripResult,
  UpdateTripField,
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
function strictRecord(value: unknown, message: string): Record<string, unknown> {
  const result = record(value);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError(message, 'invalid-response', 200, null, null, false);
  return result;
}
function requiredUuid(value: unknown, correlationId: string | null): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
    throw new ApiError(
      'Invalid Trip response',
      'invalid-response',
      200,
      null,
      correlationId,
      false,
    );
  return value;
}
function decodeReminder(
  value: unknown,
  tripId: string,
  correlationId: string | null,
): PersonalReminder {
  const row = strictRecord(value, 'Invalid reminder response');
  const instant = (candidate: unknown) =>
    typeof candidate === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(candidate) &&
    Number.isFinite(Date.parse(candidate));
  if (
    row.trip_id !== tripId ||
    (row.source_type !== 'ACTIVITY' && row.source_type !== 'PACKING') ||
    !['PENDING', 'PROCESSING', 'SENT', 'CANCELLED', 'FAILED'].includes(String(row.status)) ||
    !instant(row.remind_at) ||
    !instant(row.created_at) ||
    !(row.source_at === null || instant(row.source_at))
  )
    throw new ApiError(
      'Invalid reminder response',
      'invalid-response',
      200,
      null,
      correlationId,
      false,
    );
  return {
    id: requiredUuid(row.id, correlationId),
    trip_id: tripId,
    source_type: row.source_type,
    source_id: requiredUuid(row.source_id, correlationId),
    remind_at: row.remind_at as string,
    source_at: row.source_at as string | null,
    status: row.status as PersonalReminder['status'],
    created_at: row.created_at as string,
  };
}
function privateBlob(
  result: { data: unknown; contentType?: string | null; status?: number },
  type: string,
) {
  if (
    !(result.data instanceof ArrayBuffer) ||
    !result.data.byteLength ||
    result.contentType?.split(';')[0]?.trim().toLowerCase() !== type
  )
    throw new ApiError(
      'Invalid private file response',
      'invalid-response',
      result.status ?? 200,
      null,
      null,
      false,
    );
  return new Blob([result.data], { type });
}
function lifecycle(value: unknown): TripLifecycle {
  return value === 'ONGOING' || value === 'COMPLETED' || value === 'ARCHIVED' ? value : 'UPCOMING';
}
function mapTrip(raw: unknown, correlationId: string | null = null): TripDetailViewModel {
  const t = record(raw);
  const membership = record(t.current_membership);
  const permissions = record(t.permissions);
  const uuid = (value: unknown) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const instant = (value: unknown) =>
    typeof value === 'string' &&
    /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
  const revision = (value: unknown) =>
    Number.isInteger(value) && Number(value) > 0 && Number(value) <= 2147483647;
  let timezoneValid = false;
  try {
    if (typeof t.timezone === 'string' && t.timezone) {
      new Intl.DateTimeFormat('en', { timeZone: t.timezone });
      timezoneValid = true;
    }
  } catch {
    /* invalid timezone */
  }
  if (
    !uuid(t.id) ||
    !uuid(membership.id) ||
    !uuid(membership.user_id) ||
    membership.trip_id !== t.id ||
    typeof t.name !== 'string' ||
    !t.name.trim() ||
    !instant(t.start_at) ||
    !instant(t.end_at) ||
    Date.parse(String(t.end_at)) <= Date.parse(String(t.start_at)) ||
    !timezoneValid ||
    !['UPCOMING', 'ONGOING', 'COMPLETED', 'ARCHIVED'].includes(String(t.lifecycle)) ||
    ![t.plan_version, t.membership_revision, t.export_revision].every(revision) ||
    !['OWNER', 'MEMBER'].includes(String(membership.role)) ||
    !instant(membership.joined_at) ||
    (membership.left_at !== null && !instant(membership.left_at)) ||
    typeof permissions.can_read !== 'boolean' ||
    typeof permissions.can_update !== 'boolean' ||
    (permissions.can_invite !== undefined && typeof permissions.can_invite !== 'boolean') ||
    (t.budget_amount !== undefined &&
      t.budget_amount !== null &&
      (typeof t.budget_amount !== 'string' || !/^[1-9][0-9]{0,11}$/.test(t.budget_amount))) ||
    typeof t.cover_image_available !== 'boolean' ||
    ![t.description, t.public_description].every(
      (value) => value === null || typeof value === 'string',
    ) ||
    (t.archived_at !== null && !instant(t.archived_at))
  ) {
    throw new ApiError(
      'Invalid Trip response',
      'invalid-response',
      200,
      null,
      correlationId,
      false,
    );
  }
  if (
    t.plan_edit_policy !== 'OWNER_ONLY' &&
    t.plan_edit_policy !== 'SELECTED_MEMBERS' &&
    t.plan_edit_policy !== 'ALL_MEMBERS'
  ) {
    throw new ApiError(
      'Invalid Trip response',
      'invalid-response',
      200,
      null,
      correlationId,
      false,
    );
  }
  const planEditPolicy: PlanEditPolicy = t.plan_edit_policy;
  return {
    id: String(t.id),
    name: String(t.name),
    startAt: String(t.start_at),
    endAt: String(t.end_at),
    timezone: String(t.timezone),
    budgetAmount: text(t.budget_amount),
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
      ...(typeof permissions.can_invite === 'boolean' ? { canInvite: permissions.can_invite } : {}),
    },
    presentation: {
      memberCount: null,
      coverAvailable: t.cover_image_available,
      cover: null,
    },
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
      ...(typeof rawFields.budget_amount === 'string'
        ? { budgetAmount: rawFields.budget_amount }
        : {}),
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
    const fieldErrors: Partial<Record<UpdateTripField, string>> = {};
    if (typeof rawFields.name === 'string') fieldErrors.name = rawFields.name;
    if (typeof rawFields.description === 'string') fieldErrors.description = rawFields.description;
    if (typeof rawFields.public_description === 'string') {
      fieldErrors.publicDescription = rawFields.public_description;
    }
    if (typeof rawFields.start_at === 'string') fieldErrors.startAt = rawFields.start_at;
    if (typeof rawFields.end_at === 'string') fieldErrors.endAt = rawFields.end_at;
    if (typeof rawFields.timezone === 'string') fieldErrors.timezone = rawFields.timezone;
    if (typeof rawFields.budget_amount === 'string')
      fieldErrors.budgetAmount = rawFields.budget_amount;
    if (!Object.keys(fieldErrors).length) {
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
    return {
      status: 'conflict',
      correlationId: api.correlationId,
      retryable: false,
      ...(record(api.details).reason === 'TRIP_RANGE_CONFLICT'
        ? { reason: 'TRIP_RANGE_CONFLICT' as const }
        : {}),
    };
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
  if (
    api?.kind === 'network' ||
    api?.kind === 'timeout' ||
    api?.kind === 'invalid-response' ||
    (api?.status !== null && api?.status !== undefined && api.status >= 500)
  ) {
    return { status: 'unknown', error: domain };
  }
  return { status: 'error', error: domain };
}

function planPolicy(
  value: unknown,
  correlationId: string | null,
): {
  policy: PlanEditPolicy;
  editorMemberIds: readonly string[];
  membershipRevision: number;
} {
  const data = record(value);
  if (
    (data.policy !== 'ALL_MEMBERS' &&
      data.policy !== 'OWNER_ONLY' &&
      data.policy !== 'SELECTED_MEMBERS') ||
    !Array.isArray(data.editor_member_ids) ||
    !data.editor_member_ids.every((id) => typeof id === 'string' && id.trim() !== '') ||
    !Number.isSafeInteger(data.membership_revision) ||
    Number(data.membership_revision) < 1
  ) {
    throw new ApiError(
      'Invalid plan policy response',
      'invalid-response',
      200,
      null,
      correlationId,
      false,
    );
  }
  const editorMemberIds = data.editor_member_ids as string[];
  if (new Set(editorMemberIds).size !== editorMemberIds.length) {
    throw new ApiError(
      'Invalid plan policy response',
      'invalid-response',
      200,
      null,
      correlationId,
      false,
    );
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
    ...(client
      ? {
          getPlanPolicy: async ({ tripId, signal }: { tripId: string; signal: AbortSignal }) => {
            try {
              const result = await client.read(
                `/api/v1/trips/${encodeURIComponent(tripId)}/plan-policy`,
                { signal, includeCredentials: true },
              );
              return {
                status: 'ready' as const,
                data: planPolicy(result.data, result.correlationId),
              };
            } catch (error) {
              if (signal.aborted) throw signal.reason;
              return { status: 'error' as const, error: domainError(error) };
            }
          },
        }
      : {}),
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
              ...(intent.budgetAmount === undefined ? {} : { budget_amount: intent.budgetAmount }),
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
      if (intent.startAt !== undefined) body.start_at = intent.startAt;
      if (intent.endAt !== undefined) body.end_at = intent.endAt;
      if (intent.timezone !== undefined) body.timezone = intent.timezone;
      if (intent.budgetAmount !== undefined) body.budget_amount = intent.budgetAmount;
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
            const trip = mapTrip(result.data, result.correlationId);
            if (trip.id !== tripId)
              throw new ApiError(
                'Trip scope mismatch',
                'invalid-response',
                200,
                null,
                result.correlationId,
                false,
              );
            return { status: 'ready' as const, data: trip };
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
            if (
              !data ||
              !Array.isArray(data.items) ||
              !(
                data.next_cursor === null ||
                (typeof data.next_cursor === 'string' && data.next_cursor.length > 0)
              )
            )
              throw new ApiError(
                'Invalid Trip page',
                'invalid-response',
                200,
                null,
                result.correlationId,
                false,
              );
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
  if (client) {
    repository.uploadCover = async ({ tripId, file, signal }) => {
      const form = new FormData();
      form.append('file', file, file.name);
      const result = await client.write(`/api/v1/trips/${encodeURIComponent(tripId)}/cover`, {
        method: 'POST',
        body: form,
        signal,
        includeCredentials: true,
      });
      const trip = mapTrip(result.data, result.correlationId);
      if (trip.id !== tripId || !trip.presentation.coverAvailable)
        throw new ApiError(
          'Invalid cover upload response',
          'invalid-response',
          result.status ?? 200,
          null,
          result.correlationId,
          false,
        );
      return trip;
    };
    repository.removeCover = async ({ tripId, signal }) => {
      const result = await client.write(`/api/v1/trips/${encodeURIComponent(tripId)}/cover`, {
        method: 'DELETE',
        signal,
        includeCredentials: true,
      });
      const trip = mapTrip(result.data, result.correlationId);
      if (trip.id !== tripId || trip.presentation.coverAvailable)
        throw new ApiError(
          'Invalid cover removal response',
          'invalid-response',
          result.status ?? 200,
          null,
          result.correlationId,
          false,
        );
      return trip;
    };
    repository.getCover = async ({ tripId, signal }) => {
      const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/cover`, {
        responseType: 'bytes',
        signal,
        includeCredentials: true,
      });
      return privateBlob(result, 'image/jpeg');
    };
    repository.manageTrip = async ({
      tripId,
      action,
      reason,
      newOwnerMemberId,
      expectedPlanVersion,
      expectedMembershipRevision,
      expectedExportRevision,
      idempotencyKey,
      signal,
    }) => {
      const route =
        action === 'ARCHIVE'
          ? 'archive'
          : action === 'REOPEN'
            ? 'reopen'
            : action === 'TRANSFER'
              ? 'ownership'
              : '';
      const result = await client.write(
        action === 'DELETE'
          ? `/api/v1/trips/${encodeURIComponent(tripId)}`
          : `/api/v1/trips/${encodeURIComponent(tripId)}/${route}`,
        {
          method: action === 'DELETE' ? 'DELETE' : 'POST',
          body: {
            reason,
            expected_plan_version: expectedPlanVersion,
            expected_membership_revision: expectedMembershipRevision,
            expected_export_revision: expectedExportRevision,
            ...(action === 'TRANSFER' ? { new_owner_member_id: newOwnerMemberId } : {}),
          },
          idempotencyKey,
          signal,
          includeCredentials: true,
        },
      );
      const data = strictRecord(result.data, 'Invalid lifecycle response');
      const nextPlanVersion = data.plan_version;
      const nextMembershipRevision = data.membership_revision;
      const nextExportRevision = data.export_revision;
      if (
        data.id !== tripId ||
        data.action !== action ||
        nextPlanVersion !== expectedPlanVersion + 1 ||
        nextMembershipRevision !== expectedMembershipRevision + 1 ||
        nextExportRevision !== expectedExportRevision + 1 ||
        [nextPlanVersion, nextMembershipRevision, nextExportRevision].some(
          (revision) => !Number.isSafeInteger(revision) || Number(revision) > 2147483647,
        ) ||
        (action === 'TRANSFER' &&
          (typeof data.new_owner_user_id !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              data.new_owner_user_id,
            ))) ||
        (action === 'DELETE' && data.deleted !== true)
      )
        throw new ApiError(
          'Invalid lifecycle response',
          'invalid-response',
          result.status ?? 200,
          null,
          result.correlationId,
          false,
        );
      return { action, planVersion: Number(nextPlanVersion) };
    };
    repository.listReminders = async ({ tripId, signal }) => {
      const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/reminders`, {
        signal,
        includeCredentials: true,
      });
      if (!Array.isArray(result.data))
        throw new ApiError(
          'Invalid reminder list',
          'invalid-response',
          result.status ?? 200,
          null,
          result.correlationId,
          false,
        );
      return result.data.map((item) => decodeReminder(item, tripId, result.correlationId));
    };
    repository.createReminder = async ({
      tripId,
      sourceType,
      sourceId,
      remindAt,
      idempotencyKey,
      signal,
    }) => {
      const result = await client.write(`/api/v1/trips/${encodeURIComponent(tripId)}/reminders`, {
        method: 'POST',
        body: { source_type: sourceType, source_id: sourceId, remind_at: remindAt },
        idempotencyKey,
        signal,
        includeCredentials: true,
      });
      return decodeReminder(result.data, tripId, result.correlationId);
    };
    repository.cancelReminder = async ({ tripId, reminderId, signal }) => {
      const result = await client.write(
        `/api/v1/trips/${encodeURIComponent(tripId)}/reminders/${encodeURIComponent(reminderId)}`,
        { method: 'DELETE', signal, includeCredentials: true },
      );
      return decodeReminder(result.data, tripId, result.correlationId);
    };
    repository.planPdf = async ({ tripId, signal }) => {
      const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/plan.pdf`, {
        responseType: 'bytes',
        signal,
        includeCredentials: true,
      });
      const blob = privateBlob(result, 'application/pdf');
      const prefix = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
      if (prefix !== '%PDF-')
        throw new ApiError(
          'Invalid PDF response',
          'invalid-response',
          result.status ?? 200,
          null,
          result.correlationId,
          false,
        );
      return blob;
    };
  }
  if (!client) delete repository.updatePlanPolicy;
  return repository;
}
