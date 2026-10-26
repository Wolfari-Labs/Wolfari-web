import type {
  InvitationRepository,
  InvitationViewModel,
  InvitationPreview,
  InvitationAcceptResult,
  InvitationCreateResult,
  MembershipViewModel,
} from '../../features/members/model/members';
import type { GatewayHttpClient } from '../http/http-client';
import { toDomainError } from '../http/domain-error';
import { ApiError } from '../http/api-error';
function invalid(): never {
  throw new ApiError('Invalid invitation response', 'invalid-response', 200, null, null, false);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : invalid();
}
function uuid(value: unknown): string {
  const result = string(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)
    ? result.toLowerCase()
    : invalid();
}
function email(value: unknown): string {
  const result = string(value).trim().toLowerCase();
  return result.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : invalid();
}
function integer(value: unknown): number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 2147483647
    ? value
    : invalid();
}
function timestamp(value: unknown): string {
  const text = string(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(text) &&
    Number.isFinite(Date.parse(text))
    ? text
    : invalid();
}
function status(value: unknown): InvitationViewModel['status'] {
  switch (value) {
    case 'PENDING':
    case 'ACCEPTED':
    case 'DECLINED':
    case 'REVOKED':
    case 'EXPIRED':
      return value;
    default:
      return invalid();
  }
}
function mapInvitation(raw: unknown): InvitationViewModel {
  const item = record(raw);
  const invitationType =
    item.invitation_type === 'LINK' || item.invitation_type === 'EMAIL'
      ? item.invitation_type
      : invalid();
  const invitationEmail = item.email === null ? null : email(item.email);
  if (
    (invitationType === 'EMAIL' && invitationEmail === null) ||
    (invitationType === 'LINK' && invitationEmail !== null)
  )
    invalid();
  const invitationStatus = status(item.status);
  const resolvedAt = item.resolved_at === null ? null : timestamp(item.resolved_at);
  if (
    (invitationStatus === 'PENDING' && resolvedAt !== null) ||
    (invitationStatus !== 'PENDING' && resolvedAt === null)
  )
    invalid();
  return {
    id: uuid(item.id),
    tripId: uuid(item.trip_id),
    invitationType,
    email: invitationEmail,
    status: invitationStatus,
    version: integer(item.version),
    expiresAt: timestamp(item.expires_at),
    resolvedAt,
  };
}
function mapPreview(raw: unknown): InvitationPreview {
  const item = record(raw);
  return {
    id: uuid(item.id),
    tripName: string(item.trip_name),
    inviterDisplayName:
      typeof item.inviter_display_name === 'string' ? item.inviter_display_name : invalid(),
    status: status(item.status),
    expiresAt: timestamp(item.expires_at),
  };
}
function mapMembership(raw: unknown): MembershipViewModel {
  const item = record(raw);
  return {
    id: uuid(item.id),
    tripId: uuid(item.trip_id),
    userId: uuid(item.user_id),
    role: item.role === 'OWNER' || item.role === 'MEMBER' ? item.role : invalid(),
    joinedAt: timestamp(item.joined_at),
    leftAt: item.left_at === null ? null : timestamp(item.left_at),
    presentation: { displayName: null, avatar: null },
  };
}
export function createGatewayInvitationRepository(
  reader?: InvitationRepository['listInvitations'],
  client?: GatewayHttpClient,
): InvitationRepository {
  const repository: InvitationRepository = {
    listInvitations:
      reader ??
      (async ({ tripId, signal, cursor, limit = 100, status }) => {
        signal.throwIfAborted();
        if (client) {
          let correlationId: string | null = null;
          try {
            const params = new URLSearchParams({ limit: String(limit) });
            if (cursor) params.set('cursor', cursor);
            if (status) params.set('status', status);
            const result = await client.read(
              `/api/v1/trips/${encodeURIComponent(tripId)}/invitations?${params.toString()}`,
              {
                signal,
                includeCredentials: true,
              },
            );
            correlationId = result.correlationId;
            const data = record(result.data);
            const items = Array.isArray(data.items) ? data.items.map(mapInvitation) : invalid();
            if (items.some((item) => item.tripId !== tripId.toLowerCase())) invalid();
            return {
              status: 'ready' as const,
              data: {
                items,
                nextCursor: data.next_cursor === null ? null : uuid(data.next_cursor),
              },
            };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            const domainError = toDomainError(error);
            return {
              status: 'error' as const,
              error: {
                ...domainError,
                correlationId: domainError.correlationId ?? correlationId,
              },
            };
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
    method: 'POST',
    body: unknown,
    signal: AbortSignal,
    idempotencyKey: string | undefined,
    map: (value: unknown) => T,
  ) => {
    signal.throwIfAborted();
    let correlationId: string | null = null;
    try {
      const result = await client.write(path, {
        method,
        body,
        signal,
        includeCredentials: true,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      });
      correlationId = result.correlationId;
      return {
        status: 'success' as const,
        data: map(result.data),
        correlationId: result.correlationId,
      };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      const domainError = toDomainError(error);
      return {
        status: 'error' as const,
        error: {
          ...domainError,
          correlationId: domainError.correlationId ?? correlationId,
        },
      };
    }
  };
  repository.createInvitation = ({ tripId, intent, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/invitations`,
      'POST',
      {
        invitation_type: intent.invitationType,
        ...(intent.invitationType === 'EMAIL' ? { email: intent.email } : {}),
        ...(intent.expiresAt ? { expires_at: intent.expiresAt } : {}),
        expected_membership_revision: intent.expectedMembershipRevision,
      },
      signal,
      intent.idempotencyKey,
      (value) => {
        const data = record(value),
          invitation = mapInvitation(data.invitation);
        if (
          invitation.tripId !== tripId.toLowerCase() ||
          invitation.invitationType !== intent.invitationType
        )
          invalid();
        const oneTimeLink = data.one_time_link === undefined ? null : string(data.one_time_link);
        if (oneTimeLink !== null) {
          let url: URL;
          try {
            url = new URL(oneTimeLink);
          } catch {
            return invalid();
          }
          const linkTokens = new URLSearchParams(url.hash.slice(1)).getAll('token');
          const linkEntries = [...new URLSearchParams(url.hash.slice(1)).entries()];
          if (
            !['https:', 'http:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.search ||
            (typeof window !== 'undefined' && url.origin !== window.location.origin) ||
            !/^\/invitations(?:\/local)?\/?$/.test(url.pathname) ||
            linkTokens.length !== 1 ||
            linkEntries.length !== 1 ||
            linkEntries[0]![0] !== 'token' ||
            !/^inv1_[A-Za-z0-9_-]{43}$/.test(linkTokens[0]!)
          )
            invalid();
        }
        if (
          invitation.status !== 'PENDING' ||
          invitation.version !== 1 ||
          (intent.invitationType === 'EMAIL' &&
            invitation.email !== intent.email.trim().toLowerCase())
        )
          invalid();
        return { invitation, oneTimeLink } satisfies InvitationCreateResult;
      },
    );
  const manage =
    (action: 'revoke' | 'resend') =>
    ({
      tripId,
      invitationId,
      intent,
      signal,
    }: {
      tripId: string;
      invitationId: string;
      intent: { expectedVersion: number; idempotencyKey: string };
      signal: AbortSignal;
    }) =>
      command(
        `/api/v1/trips/${encodeURIComponent(tripId)}/invitations/${encodeURIComponent(invitationId)}/${action}`,
        'POST',
        { expected_version: intent.expectedVersion },
        signal,
        intent.idempotencyKey,
        (value) => {
          const item = mapInvitation(record(value).invitation);
          if (
            item.tripId !== tripId.toLowerCase() ||
            item.id !== invitationId.toLowerCase() ||
            item.version !== intent.expectedVersion + 1 ||
            (action === 'revoke'
              ? item.status !== 'REVOKED'
              : item.status !== 'PENDING' || item.invitationType !== 'EMAIL')
          )
            invalid();
          return item;
        },
      );
  repository.revokeInvitation = manage('revoke');
  repository.resendInvitation = manage('resend');
  repository.previewInvitation = ({ token, signal }) =>
    command('/api/v1/invitations/preview', 'POST', { token }, signal, undefined, (value) => {
      const preview = mapPreview(value);
      if (preview.status !== 'PENDING') invalid();
      return preview;
    });
  repository.acceptInvitation = ({ token, idempotencyKey, signal }) =>
    command('/api/v1/invitations/accept', 'POST', { token }, signal, idempotencyKey, (value) => {
      const data = record(value),
        revisions = record(data.revisions);
      const membership = mapMembership(data.membership);
      if (membership.role !== 'MEMBER' || membership.leftAt !== null) invalid();
      return {
        membership,
        revisions: {
          planVersion: integer(revisions.plan_version),
          membershipRevision: integer(revisions.membership_revision),
          exportRevision: integer(revisions.export_revision),
        },
      } satisfies InvitationAcceptResult;
    });
  repository.declineInvitation = ({ token, idempotencyKey, signal }) =>
    command('/api/v1/invitations/decline', 'POST', { token }, signal, idempotencyKey, (value) => {
      const preview = mapPreview(value);
      if (preview.status !== 'DECLINED') invalid();
      return preview;
    });
  return repository;
}
