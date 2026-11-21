import type { SessionManager } from './session-manager';
import type { BrowserPush } from '../../features/notifications/browser-push';
/** Cleanup runs before credentials change; bounded so an offline provider cannot trap logout. */
export function withPushCleanup(manager: SessionManager, push: BrowserPush): SessionManager {
  const cleanup = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        push.disconnect().catch(() => undefined),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 8000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      push.suspend();
    }
  };
  return {
    ...manager,
    logout: async (signal) => {
      await cleanup();
      return manager.logout(signal);
    },
    login: async (email, password, signal) => {
      await cleanup();
      return manager.login(email, password, signal);
    },
    register: async (email, password, name, signal) => {
      await cleanup();
      return manager.register(email, password, name, signal);
    },
    clear: () => {
      push.suspend();
      manager.clear();
    },
  };
}
