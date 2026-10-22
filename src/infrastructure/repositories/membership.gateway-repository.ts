import type { MembershipRepository } from '../../features/members/model/members';
import type { GatewayHttpClient } from '../http/http-client';
import { toDomainError } from '../http/domain-error';
import { ApiError } from '../http/api-error';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('Invalid member projection');
  return value;
}

function timestamp(value: unknown): string {
  const result = requiredString(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(result) ||
    !Number.isFinite(Date.parse(result))
  ) {
    throw new Error('Invalid member projection');
  }
  return result;
}

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
          let correlationId: string | null = null;
          try {
            const params = new URLSearchParams({
              limit: String(limit),
              include_left: String(includeLeft),
            });
            if (cursor !== undefined) params.set('cursor', cursor);
            const result = await client.read(
              `/api/v1/trips/${encodeURIComponent(tripId)}/members?${params.toString()}`,
              {
              signal,
              includeCredentials: true,
              },
            );
            correlationId = result.correlationId;
            const data = record(result.data);
            if (!data || !Array.isArray(data.items) || !Object.hasOwn(data, 'next_cursor')) {
              throw new ApiError(
                'Invalid member projection',
                'invalid-response',
                200,
                null,
                result.correlationId,
                false,
              );
            }
            const items = data.items.map((raw) => {
              const item = record(raw);
              if (!item || (item.role !== 'OWNER' && item.role !== 'MEMBER')) {
                throw new Error('Invalid member projection');
              }
              const memberTripId = requiredString(item.trip_id);
              const leftAt = item.left_at;
              if (
                memberTripId !== tripId ||
                !Object.hasOwn(item, 'left_at') ||
                (leftAt !== null && (typeof leftAt !== 'string' || !Number.isFinite(Date.parse(leftAt))))
              ) {
                throw new Error('Invalid member projection');
              }
              return {
                id: requiredString(item.id),
                tripId: memberTripId,
                userId: requiredString(item.user_id),
                role: item.role as 'OWNER' | 'MEMBER',
                joinedAt: timestamp(item.joined_at),
                leftAt: leftAt === null ? null : timestamp(leftAt),
                presentation: { displayName: null, avatar: null },
              };
            });
            if (
              data.next_cursor !== null &&
              (typeof data.next_cursor !== 'string' || data.next_cursor.trim() === '')
            ) {
              throw new ApiError(
                'Invalid member cursor',
                'invalid-response',
                200,
                null,
                result.correlationId,
                false,
              );
            }
            return {
              status: 'ready' as const,
              data: {
                items,
                nextCursor: data.next_cursor,
              },
            };
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            const cause =
              error instanceof Error && error.message === 'Invalid member projection'
                ? new ApiError(
                    'Invalid member projection',
                    'invalid-response',
                    200,
                    null,
                    correlationId,
                    false,
                  )
                : error;
            return { status: 'error' as const, error: toDomainError(cause) };
          }
        }
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      }),
  };
}
