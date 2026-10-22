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
  readonly login: (email: string, password: string, signal?: AbortSignal) => Promise<{ data: unknown; correlationId: string | null }>;
  readonly register: (email: string, password: string, fullName: string, signal?: AbortSignal) => Promise<{ correlationId: string | null }>;
  readonly clear: () => void;
}

export function createSessionManager(client: GatewayHttpClient, token: AccessTokenStore): SessionManager {
  let csrfToken: string | null = null;
  let current: SessionStatus = 'unknown';
  let refreshFlight: Promise<SessionStatus> | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const setStatus = (next: SessionStatus) => {
    if (current === next) return;
    current = next;
    emit();
  };

  async function csrf(signal?: AbortSignal): Promise<string> {
    const response = await client.read('/api/v1/auth/csrf', {
      ...(signal ? { signal } : {}),
      includeCredentials: true,
      responseType: 'json',
    });
    const value = response.data as { csrf_token?: unknown };
    if (typeof value.csrf_token !== 'string' || value.csrf_token.length < 10)
      throw new ApiError('Invalid CSRF response', 'invalid-response', response.status ?? null, null, response.correlationId, false);
    csrfToken = value.csrf_token;
    return csrfToken;
  }

  async function refresh(signal?: AbortSignal): Promise<SessionStatus> {
    if (!refreshFlight) {
      refreshFlight = (async () => {
        try {
          const csrfValue = await csrf(signal);
          const response = await client.write('/api/v1/auth/refresh', {
            method: 'POST',
            body: {},
            ...(signal ? { signal } : {}),
            includeCredentials: true,
            csrfToken: csrfValue,
          });
          const data = response.data as { access_token?: unknown };
          if (typeof data.access_token !== 'string') throw new ApiError('Invalid session response', 'invalid-response', response.status ?? null, null, response.correlationId, false);
          token.set(data.access_token);
          setStatus('authenticated');
          return 'authenticated';
        } catch (error) {
          token.clear();
          csrfToken = null;
          if (error instanceof ApiError && error.status === 401) {
            setStatus('anonymous');
            return 'anonymous';
          }
          setStatus('anonymous');
          throw error;
        } finally {
          refreshFlight = null;
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
    login: async (email, password, signal) => {
      const response = await client.write('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        ...(signal ? { signal } : {}),
        includeCredentials: true,
      });
      const data = response.data as { access_token?: unknown };
      if (typeof data.access_token !== 'string') throw new ApiError('Invalid session response', 'invalid-response', response.status ?? null, null, response.correlationId, false);
      token.set(data.access_token);
      setStatus('authenticated');
      return { data: response.data, correlationId: response.correlationId };
    },
    register: async (email, password, fullName, signal) => {
      const response = await client.write('/api/v1/auth/register', {
        method: 'POST',
        body: { email, password, full_name: fullName },
        ...(signal ? { signal } : {}),
        includeCredentials: true,
      });
      token.clear();
      csrfToken = null;
      setStatus('anonymous');
      return { correlationId: response.correlationId };
    },
    clear: () => {
      token.clear();
      csrfToken = null;
      setStatus('anonymous');
    },
  };
}

