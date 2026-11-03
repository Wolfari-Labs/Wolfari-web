import type { SessionManager } from './session-manager';

/** Only a non-secret boundary generation is shared. Tokens remain inside each manager. */
export function coordinateBrowserSession(manager: SessionManager): SessionManager {
  if (!navigator.locks || typeof BroadcastChannel === 'undefined')
    throw new Error('Demo 1 cần Chromium/Edge hỗ trợ Web Locks trên HTTPS hoặc localhost.');
  const key = 'wolfari:session-boundary:v1';
  const channel = new BroadcastChannel(key);
  const epoch = () => localStorage.getItem(key) ?? '';
  // Fail closed if session boundary persistence is denied.
  const initial = epoch();
  let observed = initial;
  let refreshing: ReturnType<SessionManager['bootstrap']> | null = null;
  const sync = () => {
    const next = epoch();
    if (next !== observed) {
      observed = next;
      manager.clear();
    }
  };
  const boundary = (kind: 'changed' | 'logout') => {
    observed = crypto.randomUUID();
    localStorage.setItem(key, observed);
    channel.postMessage({ kind, epoch: observed });
  };
  window.addEventListener('storage', (event) => {
    if (event.key === key) sync();
  });
  window.addEventListener('focus', sync);
  channel.onmessage = (event) => {
    if (event.data?.kind !== 'changed' && event.data?.kind !== 'logout') return;
    sync();
  };
  const locked = async <T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    const started = epoch();
    return navigator.locks.request(
      'wolfari:cookie-session:v1',
      { ...(signal ? { signal } : {}) },
      async () => {
        sync();
        signal?.throwIfAborted();
        if (started !== epoch())
          throw new DOMException('Phiên đã thay đổi ở tab khác.', 'AbortError');
        return work();
      },
    );
  };
  return {
    ...manager,
    bootstrap: (signal) => {
      if (!refreshing)
        refreshing = locked(() => manager.bootstrap(signal), signal).finally(() => {
          refreshing = null;
        });
      return refreshing;
    },
    login: (email, password, signal) =>
      locked(async () => {
        boundary('changed');
        manager.clear();
        return manager.login(email, password, signal);
      }, signal),
    register: (email, password, fullName, signal) =>
      locked(async () => {
        boundary('changed');
        manager.clear();
        return manager.register(email, password, fullName, signal);
      }, signal),
    logout: (signal) =>
      locked(async () => {
        // Refresh inside the same lock: another tab may have rotated the session ID.
        await manager.bootstrap(signal);
        await manager.logout(signal);
        boundary('logout');
      }, signal),
    clear: () => {
      manager.clear();
      boundary('logout');
    },
  };
}
