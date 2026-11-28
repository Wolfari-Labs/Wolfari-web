import type {
  InvitationRepository,
  InvitationViewModel,
  InvitationPreview,
  InvitationAcceptResult,
  InvitationCreateResult,
  InvitationTarget,
  MembershipViewModel,
} from '../../features/members/model/members';
import { invitationTokenPattern, normalizeJoinCode } from '../../features/members/model/members';
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
/** Optional v2 counter: absent (older server) is null; present must be an integer in range. */
function counter(value: unknown, min: number): number | null {
  if (value === undefined) return null;
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= 50
    ? value
    : invalid();
}
function nullableTimestamp(value: unknown): string | null {
  return value === undefined || value === null ? null : timestamp(value);
}
const joinCodeText = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
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
  const maxUses = counter(item.max_uses, 1),
    useCount = counter(item.use_count, 0);
  const codeHint =
    item.code_hint === undefined || item.code_hint === null
      ? null
      : typeof item.code_hint === 'string' && /^[0-9A-HJKMNP-TV-Z]{4}$/.test(item.code_hint)
        ? item.code_hint
        : invalid();
  if (
    (invitationType === 'EMAIL' && ((maxUses !== null && maxUses !== 1) || codeHint !== null)) ||
    (maxUses !== null && useCount !== null && useCount > maxUses)
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
    maxUses,
    useCount,
    codeHint,
  };
}
function mapPreview(raw: unknown): InvitationPreview {
  const item = record(raw);
  const invitationType =
    item.invitation_type === undefined || item.invitation_type === null
      ? null
      : item.invitation_type === 'EMAIL' || item.invitation_type === 'LINK'
        ? item.invitation_type
        : invalid();
  const tripStartAt = nullableTimestamp(item.trip_start_at),
    tripEndAt = nullableTimestamp(item.trip_end_at);
  if (tripStartAt && tripEndAt && Date.parse(tripEndAt) < Date.parse(tripStartAt)) invalid();
  return {
    id: uuid(item.id),
    tripName: string(item.trip_name),
    inviterDisplayName:
      typeof item.inviter_display_name === 'string' ? item.inviter_display_name : invalid(),
    status: status(item.status),
    expiresAt: timestamp(item.expires_at),
    invitationType,
    tripStartAt,
    tripEndAt,
  };
}
/**
 * Exactly one selector per request. A link secret is either the `inv1_` token or a join code
 * (normalized like the Backend); an EMAIL invitation listed for this account is answered by ID.
 */
function selector({ token, invitationId }: InvitationTarget) {
  if (invitationId !== undefined)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationId)
      ? { invitation_id: invitationId.toLowerCase() }
      : null;
  if (token === undefined) return null;
  if (invitationTokenPattern.test(token)) return { token };
  const code = normalizeJoinCode(token);
  return code ? { code } : null;
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
    if (body === null)
      return {
        status: 'error' as const,
        error: { code: 'VALIDATION_FAILED' as const, correlationId: null, retryable: false },
      };
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
        ...(intent.invitationType === 'LINK' && intent.maxUses !== undefined
          ? { max_uses: intent.maxUses }
          : {}),
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
            invitation.email !== intent.email.trim().toLowerCase()) ||
          (intent.invitationType === 'LINK' &&
            invitation.maxUses != null &&
            invitation.maxUses !== (intent.maxUses ?? 1))
        )
          invalid();
        // LINK v2: the short code and its share page (`/invitations#code=XXXX-XXXX` on this Web).
        const joinCode = data.join_code === undefined ? null : string(data.join_code);
        const shareLink = data.share_link === undefined ? null : string(data.share_link);
        if (joinCode !== null || shareLink !== null) {
          if (
            intent.invitationType !== 'LINK' ||
            joinCode === null ||
            !joinCodeText.test(joinCode) ||
            (invitation.codeHint != null && joinCode.slice(5) !== invitation.codeHint)
          )
            invalid();
          if (shareLink !== null) {
            let url: URL;
            try {
              url = new URL(shareLink);
            } catch {
              return invalid();
            }
            if (
              !['https:', 'http:'].includes(url.protocol) ||
              url.username ||
              url.password ||
              url.search ||
              (typeof window !== 'undefined' && url.origin !== window.location.origin) ||
              url.pathname !== '/invitations' ||
              url.hash !== '#code=' + joinCode
            )
              invalid();
          }
        }
        return { invitation, oneTimeLink, joinCode, shareLink } satisfies InvitationCreateResult;
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
  repository.previewInvitation = ({ signal, ...target }) =>
    command('/api/v1/invitations/preview', 'POST', selector(target), signal, undefined, (value) => {
      const preview = mapPreview(value);
      if (preview.status !== 'PENDING') invalid();
      if (target.invitationId !== undefined && preview.id !== target.invitationId.toLowerCase())
        invalid();
      return preview;
    });
  repository.acceptInvitation = ({ idempotencyKey, signal, ...target }) =>
    command(
      '/api/v1/invitations/accept',
      'POST',
      selector(target),
      signal,
      idempotencyKey,
      (value) => {
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
      },
    );
  repository.declineInvitation = ({ idempotencyKey, signal, ...target }) =>
    command(
      '/api/v1/invitations/decline',
      'POST',
      selector(target),
      signal,
      idempotencyKey,
      (value) => {
        const preview = mapPreview(value);
        if (preview.status !== 'DECLINED') invalid();
        if (target.invitationId !== undefined && preview.id !== target.invitationId.toLowerCase())
          invalid();
        return preview;
      },
    );
  repository.listMyInvitations = async ({ signal }) => {
    signal.throwIfAborted();
    let correlationId: string | null = null;
    try {
      const result = await client.read('/api/v1/me/invitations', {
        signal,
        includeCredentials: true,
      });
      correlationId = result.correlationId;
      const data = record(result.data);
      const items = Array.isArray(data.items) ? data.items.map(mapPreview) : invalid();
      if (
        items.length > 20 ||
        new Set(items.map((item) => item.id)).size !== items.length ||
        items.some((item) => item.status !== 'PENDING' || item.invitationType === 'LINK')
      )
        invalid();
      return { status: 'ready' as const, data: items };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      const domainError = toDomainError(error);
      return {
        status: 'error' as const,
        error: { ...domainError, correlationId: domainError.correlationId ?? correlationId },
      };
    }
  };
  return repository;
}
