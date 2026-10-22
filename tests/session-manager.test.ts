import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/infrastructure/http/api-error';
import { createAccessTokenStore } from '../src/infrastructure/session/access-token-store';
import { createSessionManager } from '../src/infrastructure/session/session-manager';

describe('Web session manager', () => {
  it('coalesces bootstrap refresh, keeps tokens in memory and sends CSRF with the cookie flow', async () => {
    const store = createAccessTokenStore();
    const read = vi.fn().mockResolvedValue({ data: { csrf_token: 'csrf-token-value' }, correlationId: 'csrf' });
    const write = vi.fn().mockResolvedValue({ data: { access_token: 'access-token' }, correlationId: 'refresh' });
    const manager = createSessionManager({ read, write }, store);

    const [first, second] = await Promise.all([manager.bootstrap(), manager.bootstrap()]);

    expect(first).toBe('authenticated');
    expect(second).toBe('authenticated');
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('/api/v1/auth/csrf', expect.objectContaining({ includeCredentials: true }));
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('/api/v1/auth/refresh', expect.objectContaining({
      body: {},
      csrfToken: 'csrf-token-value',
      includeCredentials: true,
    }));
    expect(manager.getAccessToken()).toBe('access-token');
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('bootstraps anonymously on 401 and clears a previous in-memory token', async () => {
    const store = createAccessTokenStore();
    store.set('stale-token');
    const read = vi.fn().mockRejectedValue(new ApiError('missing', 'http', 401, 'UNAUTHENTICATED', 'anonymous', false));
    const manager = createSessionManager({ read, write: vi.fn() }, store);

    await expect(manager.bootstrap()).resolves.toBe('anonymous');
    expect(manager.status()).toBe('anonymous');
    expect(store.get()).toBeNull();
  });

  it('logs in without altering password and registration leaves no authenticated local state', async () => {
    const store = createAccessTokenStore();
    const write = vi.fn()
      .mockResolvedValueOnce({ data: { access_token: 'login-token', profile: {} }, correlationId: 'login' })
      .mockResolvedValueOnce({ data: { message_code: 'REQUEST_ACCEPTED' }, correlationId: 'register' });
    const manager = createSessionManager({ read: vi.fn(), write }, store);

    await manager.login('trimmed@example.com', ' password with spaces ');
    expect(write.mock.calls[0]).toEqual(['/api/v1/auth/login', expect.objectContaining({
      body: { email: 'trimmed@example.com', password: ' password with spaces ' },
      includeCredentials: true,
    })]);
    expect(manager.status()).toBe('authenticated');
    await manager.register('new@example.com', 'a'.repeat(15), 'New User');
    expect(manager.status()).toBe('anonymous');
    expect(store.get()).toBeNull();
    expect(manager.getCsrfToken()).toBeNull();
  });
});
