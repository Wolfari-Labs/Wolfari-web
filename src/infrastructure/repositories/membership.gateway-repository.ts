import type { MembershipRepository } from '../../features/members/model/members';
import type { GatewayHttpClient } from '../http/http-client';
import { toDomainError } from '../http/domain-error';
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
export function createGatewayMembershipRepository(
  reader?: MembershipRepository['listMembers'],
  client?: GatewayHttpClient,
): MembershipRepository {
  return {
    listMembers:
      reader ??
      (async ({ tripId, signal, cursor, limit = 100, includeLeft = false }) => {
        signal.throwIfAborted();
        if (client) {
          try {
            const params = new URLSearchParams({ limit: String(limit), include_left: String(includeLeft) });
            if (cursor) params.set('cursor', cursor);
            const result = await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}/members?${params.toString()}`, {
              signal,
              includeCredentials: true,
            });
            const data = record(result.data);
            const items = Array.isArray(data.items) ? data.items : [];
            return {
              status: 'ready' as const,
              data: {
                items: items.map((raw) => {
                  const item = record(raw);
                  return {
                    id: String(item.id), tripId: String(item.trip_id), userId: String(item.user_id),
                    role: item.role === 'OWNER' ? 'OWNER' as const : 'MEMBER' as const,
                    joinedAt: String(item.joined_at),
                    leftAt: typeof item.left_at === 'string' ? item.left_at : null,
                    presentation: { displayName: null, avatar: null },
                  };
                }),
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
}
