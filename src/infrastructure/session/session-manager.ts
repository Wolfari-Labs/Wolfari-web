import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';
import type { createAccessTokenStore } from './access-token-store';
type AccessTokenStore = ReturnType<typeof createAccessTokenStore>;

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated' | 'expired';

export interface SessionManager {
  readonly status: () => SessionStatus;
  readonly getAccessToken: () => string | null;
  readonly getCsrfToken: () => string | null;
  readonly subscribe: (listener: () => void) => () => void;
  readonly bootstrap: (signal?: AbortSignal) => Promise<SessionStatus>;
  readonly logout: (signal?: AbortSignal) => Promise<void>;
  readonly login: (
    email: string,
    password: string,
    signal?: AbortSignal,
  ) => Promise<{ data: unknown; correlationId: string | null }>;
  readonly register: (
    email: string,
    password: string,
    fullName: string,
    signal?: AbortSignal,
  ) => Promise<{ correlationId: string | null }>;
  readonly clear: () => void;
}

export function createSessionManager(
  client: GatewayHttpClient,
  token: AccessTokenStore,
): SessionManager {
  let csrfToken: string | null = null;
  let current: SessionStatus = 'unknown';
  let refreshFlight: Promise<SessionStatus> | null = null;
  let logoutFlight: Promise<void> | null = null;
  let sessionId: string | null = null;
  let generation = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const setStatus = (next: SessionStatus) => {
    if (current === next) return;
    current = next;
    emit();
  };
  const invalidate = (next: SessionStatus = 'anonymous') => {
    generation += 1;
    refreshFlight = null;
    token.clear();
    csrfToken = null;
    sessionId = null;
    current = next;
    // Also notify for same-status account changes so private caches are cleared.
    emit();
    return generation;
  };

  async function csrf(signal?: AbortSignal): Promise<string> {
    const response = await client.read('/api/v1/auth/csrf', {
      ...(signal ? { signal } : {}),
      includeCredentials: true,
      responseType: 'json',
    });
    const value = response.data as { csrf_token?: unknown };
    if (typeof value.csrf_token !== 'string' || value.csrf_token.length < 10)
      throw new ApiError(
        'Invalid CSRF response',
        'invalid-response',
        response.status ?? null,
        null,
        response.correlationId,
        false,
      );
    return value.csrf_token;
  }

  async function refresh(signal?: AbortSignal): Promise<SessionStatus> {
    if (logoutFlight) { await logoutFlight; return current; }
    if (!refreshFlight) {
      const started = generation;
      refreshFlight = (async () => {
        try {
          const csrfValue = await csrf(signal);
          if (started !== generation) return current;
          const response = await client.write('/api/v1/auth/refresh', {
            method: 'POST',
            body: {},
            ...(signal ? { signal } : {}),
            includeCredentials: true,
            csrfToken: csrfValue,
          });
          if (started !== generation) return current;
          signal?.throwIfAborted();
          const data = response.data as { access_token?: unknown; session_id?: unknown };
          if (typeof data.access_token !== 'string' || !data.access_token)
            throw new ApiError(
              'Invalid session response',
              'invalid-response',
              response.status ?? null,
              null,
              response.correlationId,
              false,
            );
          token.set(data.access_token);
          sessionId = typeof data.session_id === 'string' ? data.session_id : null;
          csrfToken = csrfValue;
          setStatus('authenticated');
          return 'authenticated';
        } catch (error) {
          if (started !== generation) return current;
          token.clear();
          csrfToken = null;
          sessionId = null;
          if (error instanceof ApiError && error.status === 401) {
            setStatus('anonymous');
            return 'anonymous';
          }
          setStatus('anonymous');
          throw error;
        } finally {
          if (started === generation) refreshFlight = null;
        }
      })();
    }
    return refreshFlight;
  }

  return {
    status: () => current,
    getAccessToken: token.get,
    getCsrfToken: () => csrfToken,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    bootstrap: (signal) => refresh(signal),
    logout: (signal) => {
      if (logoutFlight) return logoutFlight;
      const started = generation;
      const pendingRefresh = refreshFlight;
      logoutFlight = (async () => {
        await Promise.resolve();
        try {
          if (pendingRefresh) await pendingRefresh;
          if (generation !== started) throw new DOMException('Session superseded', 'AbortError');
          if (!token.get()) { invalidate(); return; }
          if (!sessionId) throw new Error('Current session ID unavailable; sign in again.');
          const csrfValue = await csrf(signal);
          if (generation !== started) throw new DOMException('Session superseded', 'AbortError');
          await client.write('/api/v1/auth/logout', {
            method: 'POST', body: { session_id: sessionId }, includeCredentials: true,
            csrfToken: csrfValue, responseType: 'empty', ...(signal ? { signal } : {}),
          });
          if (generation === started) invalidate();
        } catch (error) {
          if (generation === started && error instanceof ApiError && error.status === 401) { invalidate('expired'); return; }
          throw error;
        } finally { logoutFlight = null; }
      })();
      return logoutFlight;
    },
    login: async (email, password, signal) => {
      if (logoutFlight) await logoutFlight;
      const started = invalidate('unknown');
      try {
        const response = await client.write('/api/v1/auth/login', {
          method: 'POST',
          body: { email, password },
          ...(signal ? { signal } : {}),
          includeCredentials: true,
        });
        if (started !== generation) throw new DOMException('Session superseded', 'AbortError');
        signal?.throwIfAborted();
        const data = response.data as { access_token?: unknown; session_id?: unknown };
        if (typeof data.access_token !== 'string' || !data.access_token)
          throw new ApiError(
            'Invalid session response',
            'invalid-response',
            response.status ?? null,
            null,
            response.correlationId,
            false,
          );
        token.set(data.access_token);
        sessionId = typeof data.session_id === 'string' ? data.session_id : null;
        setStatus('authenticated');
        return { data: response.data, correlationId: response.correlationId };
      } catch (error) {
        if (started === generation) invalidate();
        throw error;
      }
    },
    register: async (email, password, fullName, signal) => {
      if (logoutFlight) await logoutFlight;
      const started = invalidate();
      const response = await client.write('/api/v1/auth/register', {
        method: 'POST',
        body: { email, password, full_name: fullName },
        ...(signal ? { signal } : {}),
        includeCredentials: true,
      });
      if (started !== generation) throw new DOMException('Session superseded', 'AbortError');
      signal?.throwIfAborted();
      return { correlationId: response.correlationId };
    },
    clear: () => {
      invalidate();
    },
  };
}
