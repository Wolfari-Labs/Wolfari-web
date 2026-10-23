import type { IdentityRepository } from '../../features/auth/model/identity';
import type { GatewayHttpClient } from '../http/http-client';
import type { SessionManager } from '../session/session-manager';
import { toDomainError } from '../http/domain-error';
import { ApiError } from '../http/api-error';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function invalid(correlationId: string | null): never {
  throw new ApiError(
    'Invalid Identity response',
    'invalid-response',
    null,
    null,
    correlationId,
    false,
  );
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function date(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function profile(value: unknown, correlationId: string | null) {
  const data = record(value);
  const avatar = data.avatar;
  if (
    !text(data.id) ||
    !text(data.full_name) ||
    !text(data.email) ||
    !Number.isInteger(data.version) ||
    Number(data.version) < 1 ||
    !['USER', 'ADMIN'].includes(String(data.system_role)) ||
    !['ACTIVE', 'LOCKED', 'ANONYMIZED'].includes(String(data.status)) ||
    (avatar !== null && !text(avatar)) ||
    (data.email_verified_at !== null && !date(data.email_verified_at))
  )
    invalid(correlationId);
  return {
    id: String(data.id),
    fullName: String(data.full_name),
    email: String(data.email),
    avatar: typeof avatar === 'string' ? { src: avatar, alt: String(data.full_name) } : null,
    version: Number(data.version),
    systemRole: data.system_role === 'ADMIN' ? ('ADMIN' as const) : ('USER' as const),
    status:
      data.status === 'LOCKED'
        ? ('LOCKED' as const)
        : data.status === 'ANONYMIZED'
          ? ('ANONYMIZED' as const)
          : ('ACTIVE' as const),
    emailVerifiedAt: typeof data.email_verified_at === 'string' ? data.email_verified_at : null,
  };
}

export function createGatewayIdentityRepository(
  readers?: IdentityRepository,
  client?: GatewayHttpClient,
  session?: SessionManager,
): IdentityRepository {
  const unavailable = async ({ signal }: Parameters<IdentityRepository['readSelf']>[0]) => {
    signal.throwIfAborted();
    return {
      status: 'error' as const,
      error: { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: false },
    };
  };
  if (readers) return readers;
  const readSelf: IdentityRepository['readSelf'] = async ({ signal }) => {
    signal.throwIfAborted();
    if (!client) return unavailable({ signal, scenario: 'unavailable' });
    try {
      const result = await client.read('/api/v1/me', { signal });
      return { status: 'ready', data: profile(result.data, result.correlationId) };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  const listSessions: IdentityRepository['listSessions'] = async ({ signal, cursor, limit }) => {
    signal.throwIfAborted();
    if (!client) return unavailable({ signal, scenario: 'unavailable' });
    try {
      const query = new URLSearchParams({
        limit: String(Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit!))) : 20),
      });
      if (cursor) query.set('cursor', cursor);
      const result = await client.read(`/api/v1/me/sessions?${query.toString()}`, { signal });
      const data = record(result.data);
      if (!Array.isArray(data.items) || (data.next_cursor !== null && !text(data.next_cursor)))
        invalid(result.correlationId);
      const items = data.items;
      return {
        status: 'ready',
        data: {
          items: items.map((raw) => {
            const item = record(raw);
            if (
              !text(item.id) ||
              !date(item.created_at) ||
              !date(item.expires_at) ||
              (item.last_used_at !== null && !date(item.last_used_at)) ||
              (item.revoked_at !== null && !date(item.revoked_at))
            )
              invalid(result.correlationId);
            return {
              id: String(item.id),
              createdAt: String(item.created_at),
              lastUsedAt: typeof item.last_used_at === 'string' ? item.last_used_at : null,
              expiresAt: String(item.expires_at),
              revokedAt: typeof item.revoked_at === 'string' ? item.revoked_at : null,
            };
          }),
          nextCursor: typeof data.next_cursor === 'string' ? data.next_cursor : null,
        },
      };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  const repository: IdentityRepository = { readSelf, listSessions };
  repository.login = async ({ intent, signal }) => {
    if (!client || !session)
      return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const response = await session.login(intent.email, intent.password, signal);
      const data = record(response.data);
      try {
        return {
          status: 'authenticated',
          profile: profile(data.profile ?? data, response.correlationId),
          correlationId: response.correlationId,
        };
      } catch (error) {
        session.clear();
        throw error;
      }
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.register = async ({ intent, signal }) => {
    if (!client || !session)
      return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const response = await session.register(
        intent.email,
        intent.password,
        intent.fullName,
        signal,
      );
      return { status: 'accepted', correlationId: response.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.updateProfile = async ({ intent, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write('/api/v1/me', {
        method: 'PATCH',
        body: {
          ...(intent.fullName === undefined ? {} : { full_name: intent.fullName }),
          expected_version: intent.expectedVersion,
          ...(intent.avatarObjectKey === undefined
            ? {}
            : { avatar_object_key: intent.avatarObjectKey }),
        },
        signal,
      });
      return {
        status: 'updated',
        profile: profile(result.data, result.correlationId),
        correlationId: result.correlationId,
      };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.revokeSession = async ({ sessionId, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write(`/api/v1/me/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        signal,
        responseType: 'empty',
      });
      return { status: 'revoked', correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.getAvatar = async ({ signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.read('/api/v1/me/avatar', {
        signal,
        responseType: 'bytes',
      });
      if (
        !(result.data instanceof ArrayBuffer) ||
        result.data.byteLength === 0 ||
        !result.contentType?.startsWith('image/')
      )
        invalid(result.correlationId);
      return {
        status: 'ready',
        bytes: result.data as ArrayBuffer,
        contentType: result.contentType ?? null,
        correlationId: result.correlationId,
      };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.uploadAvatar = async ({ file, filename, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const form = new FormData();
      form.append('file', file, filename);
      const result = await client.write('/api/v1/me/avatar', {
        method: 'POST',
        body: form,
        signal,
      });
      const data = record(result.data);
      if (!text(data.object_key)) invalid(result.correlationId);
      return {
        status: 'uploaded',
        objectKey: String(data.object_key),
        correlationId: result.correlationId,
      };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.changePassword = async ({ currentPassword, newPassword, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write('/api/v1/me/password-change', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
        signal,
      });
      return { status: 'changed', correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.resendEmailVerification = async ({ signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write('/api/v1/auth/email-verifications', {
        method: 'POST',
        body: {},
        signal,
      });
      return { status: 'accepted', correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.confirmEmailVerification = async ({ token: value, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write('/api/v1/auth/email-verifications/confirm', {
        method: 'POST',
        body: { token: value },
        signal,
      });
      return { status: 'accepted', correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.requestPasswordReset = async ({ email, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write('/api/v1/auth/password-reset-requests', {
        method: 'POST',
        body: { email },
        signal,
      });
      return { status: 'accepted', correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  repository.resetPassword = async ({ token: value, newPassword, signal }) => {
    if (!client) return { status: 'error', error: toDomainError(new Error('Gateway unavailable')) };
    try {
      const result = await client.write('/api/v1/auth/password-resets', {
        method: 'POST',
        body: { token: value, new_password: newPassword },
        signal,
      });
      return { status: 'accepted', correlationId: result.correlationId };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      return { status: 'error', error: toDomainError(error) };
    }
  };
  return repository;
}
