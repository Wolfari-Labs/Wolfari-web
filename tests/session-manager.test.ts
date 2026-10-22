import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/infrastructure/http/api-error';
import type { GatewayHttpClient, GatewayRead } from '../src/infrastructure/http/http-client';
import { createAccessTokenStore } from '../src/infrastructure/session/access-token-store';
import { createSessionManager } from '../src/infrastructure/session/session-manager';

function createClient() {
  return {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  } satisfies GatewayHttpClient;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('session manager', () => {
  it('coalesces concurrent refreshes and keeps session credentials in memory', async () => {
    const client = createClient();
    let resolveCsrf: ((value: GatewayRead) => void) | undefined;
    client.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCsrf = resolve;
        }),
    );
    client.write.mockResolvedValueOnce({
      data: { access_token: 'memory-access-token' },
      correlationId: 'refresh-correlation',
      status: 200,
    });
    const tokenStore = createAccessTokenStore();
    const manager = createSessionManager(client, tokenStore);
    const listener = vi.fn();
    manager.subscribe(listener);

    const first = manager.bootstrap();
    const second = manager.bootstrap();

    expect(client.read).toHaveBeenCalledTimes(1);
    resolveCsrf?.({
      data: { csrf_token: 'csrf-token-long-enough' },
      correlationId: 'csrf-correlation',
      status: 200,
    });

    await expect(Promise.all([first, second])).resolves.toEqual(['authenticated', 'authenticated']);
    expect(client.read).toHaveBeenCalledWith('/api/v1/auth/csrf', {
      includeCredentials: true,
      responseType: 'json',
    });
    expect(client.write).toHaveBeenCalledTimes(1);
    expect(client.write).toHaveBeenCalledWith('/api/v1/auth/refresh', {
      method: 'POST',
      body: {},
      includeCredentials: true,
      csrfToken: 'csrf-token-long-enough',
    });
    expect(manager.status()).toBe('authenticated');
    expect(manager.getAccessToken()).toBe('memory-access-token');
    expect(manager.getCsrfToken()).toBe('csrf-token-long-enough');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('treats an unauthorized refresh as anonymous and clears stale credentials', async () => {
    const client = createClient();
    client.read.mockResolvedValueOnce({
      data: { csrf_token: 'csrf-token-long-enough' },
      correlationId: 'csrf-correlation',
      status: 200,
    });
    client.write.mockRejectedValueOnce(
      new ApiError('Session expired', 'http', 401, 'UNAUTHENTICATED', 'refresh-correlation', false),
    );
    const tokenStore = createAccessTokenStore();
    tokenStore.set('stale-access-token');
    const manager = createSessionManager(client, tokenStore);

    await expect(manager.bootstrap()).resolves.toBe('anonymous');
    expect(manager.status()).toBe('anonymous');
    expect(manager.getAccessToken()).toBeNull();
    expect(manager.getCsrfToken()).toBeNull();
  });

  it('does not hide a transient refresh failure and still clears memory state', async () => {
    const client = createClient();
    client.read.mockResolvedValueOnce({
      data: { csrf_token: 'csrf-token-long-enough' },
      correlationId: 'csrf-correlation',
      status: 200,
    });
    const unavailable = new ApiError(
      'Identity unavailable',
      'http',
      503,
      'SERVICE_UNAVAILABLE',
      'refresh-correlation',
      true,
    );
    client.write.mockRejectedValueOnce(unavailable);
    const tokenStore = createAccessTokenStore();
    tokenStore.set('stale-access-token');
    const manager = createSessionManager(client, tokenStore);

    await expect(manager.bootstrap()).rejects.toBe(unavailable);
    expect(manager.status()).toBe('anonymous');
    expect(manager.getAccessToken()).toBeNull();
    expect(manager.getCsrfToken()).toBeNull();
  });

  it('validates login responses and clears credentials explicitly', async () => {
    const client = createClient();
    client.write.mockResolvedValueOnce({
      data: { access_token: 'login-access-token' },
      correlationId: 'login-correlation',
      status: 200,
    });
    const manager = createSessionManager(client, createAccessTokenStore());

    await expect(manager.login('person@example.com', 'password')).resolves.toEqual({
      data: { access_token: 'login-access-token' },
      correlationId: 'login-correlation',
    });
    expect(client.write).toHaveBeenCalledWith('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'person@example.com', password: 'password' },
      includeCredentials: true,
    });
    expect(manager.getAccessToken()).toBe('login-access-token');

    manager.clear();
    expect(manager.status()).toBe('anonymous');
    expect(manager.getAccessToken()).toBeNull();
    expect(manager.getCsrfToken()).toBeNull();
  });

  it('treats an unauthorized CSRF request as anonymous and clears stale credentials', async () => {
    const client = createClient();
    client.read.mockRejectedValueOnce(
      new ApiError('Session missing', 'http', 401, 'UNAUTHENTICATED', 'csrf-correlation', false),
    );
    const tokenStore = createAccessTokenStore();
    tokenStore.set('stale-access-token');
    const manager = createSessionManager(client, tokenStore);

    await expect(manager.bootstrap()).resolves.toBe('anonymous');
    expect(manager.status()).toBe('anonymous');
    expect(manager.getAccessToken()).toBeNull();
    expect(manager.getCsrfToken()).toBeNull();
    expect(client.write).not.toHaveBeenCalled();
  });

  it('preserves password whitespace and registration clears authenticated state', async () => {
    const client = createClient();
    client.write
      .mockResolvedValueOnce({
        data: { access_token: 'login-access-token', profile: {} },
        correlationId: 'login-correlation',
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { message_code: 'REQUEST_ACCEPTED' },
        correlationId: 'register-correlation',
        status: 202,
      });
    const manager = createSessionManager(client, createAccessTokenStore());

    await manager.login('trimmed@example.com', ' password with spaces ');
    expect(client.write).toHaveBeenNthCalledWith(1, '/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'trimmed@example.com', password: ' password with spaces ' },
      includeCredentials: true,
    });
    expect(manager.status()).toBe('authenticated');

    await manager.register('new@example.com', 'a'.repeat(15), 'New User');
    expect(client.write).toHaveBeenNthCalledWith(2, '/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: 'new@example.com',
        password: 'aaaaaaaaaaaaaaa',
        full_name: 'New User',
      },
      includeCredentials: true,
    });
    expect(manager.status()).toBe('anonymous');
    expect(manager.getAccessToken()).toBeNull();
    expect(manager.getCsrfToken()).toBeNull();
  });
});
