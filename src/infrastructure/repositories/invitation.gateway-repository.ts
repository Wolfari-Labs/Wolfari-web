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
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
const statuses = new Set(['ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED']);
function mapInvitation(raw: unknown): InvitationViewModel {
  const item = record(raw);
  return {
    id: String(item.id), tripId: String(item.trip_id),
    invitationType: item.invitation_type === 'LINK' ? 'LINK' : 'EMAIL',
    email: typeof item.email === 'string' ? item.email : null,
    status: statuses.has(String(item.status)) ? item.status as InvitationViewModel['status'] : 'PENDING',
    version: Number(item.version), expiresAt: String(item.expires_at),
    resolvedAt: typeof item.resolved_at === 'string' ? item.resolved_at : null,
  };
}
function mapPreview(raw: unknown): InvitationPreview {
  const item = record(raw);
  return {
    id: String(item.id), tripName: String(item.trip_name), inviterDisplayName: String(item.inviter_display_name),
    status: statuses.has(String(item.status)) ? item.status as InvitationPreview['status'] : 'PENDING',
    expiresAt: String(item.expires_at),
  };
}
function mapMembership(raw: unknown): MembershipViewModel {
  const item = record(raw);
  return {
    id: String(item.id), tripId: String(item.trip_id), userId: String(item.user_id),
    role: item.role === 'OWNER' ? 'OWNER' : 'MEMBER', joinedAt: String(item.joined_at),
    leftAt: typeof item.left_at === 'string' ? item.left_at : null,
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
          try {
            const params = new URLSearchParams({ limit: String(limit) });
            if (cursor) params.set('cursor', cursor);
            if (status) params.set('status', status);
            const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/invitations?${params.toString()}`, {
              signal,
              includeCredentials: true,
            });
            const data = record(result.data);
            const items = Array.isArray(data.items) ? data.items : [];
            return {
              status: 'ready' as const,
              data: {
                items: items.map(mapInvitation),
                nextCursor: typeof data.next_cursor === 'string' ? data.next_cursor : null,
              },
            };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            return { status: 'error' as const, error: toDomainError(error) };
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
    try {
      const result = await client.write(path, {
        method, body, signal, includeCredentials: true,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      });
      return { status: 'success' as const, data: map(result.data), correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error' as const, error: toDomainError(error) };
    }
  };
  repository.createInvitation = ({ tripId, intent, signal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/invitations`, 'POST',
      { invitation_type: intent.invitationType, ...(intent.invitationType === 'EMAIL' ? { email: intent.email } : {}), ...(intent.expiresAt ? { expires_at: intent.expiresAt } : {}), expected_membership_revision: intent.expectedMembershipRevision },
      signal, intent.idempotencyKey,
      (value) => { const data = record(value); return { invitation: mapInvitation(data.invitation), oneTimeLink: typeof data.one_time_link === 'string' ? data.one_time_link : null } as InvitationCreateResult; },
    );
  const manage = (action: 'revoke' | 'resend') => ({ tripId, invitationId, intent, signal }: { tripId: string; invitationId: string; intent: { expectedVersion: number; idempotencyKey: string }; signal: AbortSignal }) =>
    command(
      `/api/v1/trips/${encodeURIComponent(tripId)}/invitations/${encodeURIComponent(invitationId)}/${action}`, 'POST',
      { expected_version: intent.expectedVersion }, signal, intent.idempotencyKey,
      (value) => mapInvitation(record(value).invitation),
    );
  repository.revokeInvitation = manage('revoke');
  repository.resendInvitation = manage('resend');
  repository.previewInvitation = ({ token, signal }) =>
    command('/api/v1/invitations/preview', 'POST', { token }, signal, undefined, mapPreview);
  repository.acceptInvitation = ({ token, idempotencyKey, signal }) =>
    command('/api/v1/invitations/accept', 'POST', { token }, signal, idempotencyKey, (value) => {
      const data = record(value), revisions = record(data.revisions);
      return {
        membership: mapMembership(data.membership),
        revisions: { planVersion: Number(revisions.plan_version), membershipRevision: Number(revisions.membership_revision), exportRevision: Number(revisions.export_revision) },
      } satisfies InvitationAcceptResult;
    });
  repository.declineInvitation = ({ token, idempotencyKey, signal }) =>
    command('/api/v1/invitations/decline', 'POST', { token }, signal, idempotencyKey, mapPreview);
  return repository;
}
