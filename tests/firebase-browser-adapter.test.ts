import { afterEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  getToken: vi.fn(),
  deleteToken: vi.fn(),
  getMessaging: vi.fn().mockReturnValue({}),
  isSupported: vi.fn().mockResolvedValue(true),
}));
vi.mock('firebase/messaging', () => sdk);
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: vi.fn().mockReturnValue({}) }));
vi.mock('../src/infrastructure/push/firebase-config', () => ({
  firebaseConfig: {},
  vapidKey: 'public-test-vapid',
  pushConfigured: true,
}));
vi.mock('../src/infrastructure/push/firebase-messaging-sw?worker&url', () => ({
  default: '/firebase-messaging-sw.js',
}));
import { createFirebasePushAdapter } from '../src/infrastructure/push/firebase-browser-adapter';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('passes the real registration and VAPID to SDK and uses stable reload-compatible scope', async () => {
  vi.stubGlobal('Notification', { permission: 'granted' });
  const registration = { active: { scriptURL: location.origin + '/firebase-messaging-sw.js' } };
  const register = vi.fn().mockResolvedValue(registration);
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  sdk.getToken.mockResolvedValue('sdk-token');
  expect(await createFirebasePushAdapter().token()).toBe('sdk-token');
  expect(register).toHaveBeenCalledWith('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  });
  expect(sdk.getToken).toHaveBeenCalledWith(expect.anything(), {
    vapidKey: 'public-test-vapid',
    serviceWorkerRegistration: registration,
  });
});
it('revokes browser subscription even if SDK remote revocation fails, and does not claim success', async () => {
  const unsubscribe = vi.fn().mockResolvedValue(true),
    unregister = vi.fn().mockResolvedValue(true);
  const registration = {
    active: { scriptURL: location.origin + '/firebase-messaging-sw.js' },
    pushManager: { getSubscription: vi.fn().mockResolvedValue({ unsubscribe }) },
    unregister,
  };
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) },
  });
  sdk.deleteToken.mockRejectedValue(new Error('offline'));
  await expect(createFirebasePushAdapter().revoke()).rejects.toThrow('offline');
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(unregister).not.toHaveBeenCalled();
});
it('does not unregister an unrelated worker', async () => {
  const unregister = vi.fn();
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: vi
        .fn()
        .mockResolvedValue({ active: { scriptURL: location.origin + '/other.js' }, unregister }),
    },
  });
  await expect(createFirebasePushAdapter().revoke()).rejects.toThrow('Unexpected push worker');
  expect(unregister).not.toHaveBeenCalled();
  expect(sdk.deleteToken).not.toHaveBeenCalled();
});
