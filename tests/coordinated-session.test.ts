import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coordinateBrowserSession } from '../src/infrastructure/session/coordinated-session';
import { createSessionManager } from '../src/infrastructure/session/session-manager';
import { createAccessTokenStore } from '../src/infrastructure/session/access-token-store';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';

let tail = Promise.resolve();
const channels: FakeChannel[] = [];
class FakeChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() {
    channels.push(this);
  }
  postMessage(data: unknown) {
    for (const other of channels) if (other !== this) other.onmessage?.({ data });
  }
}
beforeEach(() => {
  localStorage.clear();
  channels.length = 0;
  tail = Promise.resolve();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  vi.stubGlobal('navigator', {
    locks: {
      request: (_name: string, _options: unknown, work: () => Promise<unknown>) => {
        const next = tail.then(work);
        tail = next.then(
          () => undefined,
          () => undefined,
        );
        return next;
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
function setup() {
  let active = 0,
    maximum = 0;
  const client: GatewayHttpClient = {
    read: async () => ({ data: { csrf_token: 'test-only-csrf-long' }, correlationId: null }),
    write: vi.fn(async (path) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return {
        data: path.endsWith('/logout')
          ? null
          : { access_token: 'test-only-access', session_id: 'test-session' },
        correlationId: null,
      };
    }),
  };
  const a = coordinateBrowserSession(createSessionManager(client, createAccessTokenStore()));
  const b = coordinateBrowserSession(createSessionManager(client, createAccessTokenStore()));
  return { a, b, client, maximum: () => maximum };
}
describe('cross-tab session coordination (unit simulated Web Locks)', () => {
  it('serializes refreshes without persisting or broadcasting tokens', async () => {
    const { a, b, maximum } = setup();
    await Promise.all([a.bootstrap(), b.bootstrap()]);
    expect(a.status()).toBe('authenticated');
    expect(b.status()).toBe('authenticated');
    expect(maximum()).toBe(1);
    expect(JSON.stringify(localStorage)).not.toContain('test-only-access');
  });
  it('propagates a successful logout and clears the other tab', async () => {
    const { a, b } = setup();
    await Promise.all([a.bootstrap(), b.bootstrap()]);
    await a.logout();
    expect(a.status()).toBe('anonymous');
    expect(b.status()).toBe('anonymous');
    expect(b.getAccessToken()).toBeNull();
  });
  it('blocks a queued refresh captured before an account boundary', async () => {
    const { a, b } = setup();
    const login = a.login('test@example.test', 'test-password');
    const stale = b.bootstrap();
    await login;
    await expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    expect(b.getAccessToken()).toBeNull();
  });
  it('fails closed when Web Locks is unsupported', () => {
    vi.stubGlobal('navigator', {});
    expect(() => setup()).toThrow('Demo 1 cần');
  });
});
