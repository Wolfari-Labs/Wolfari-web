import { firebaseConfig, vapidKey, pushConfigured } from './firebase-config';
import workerUrl from './firebase-messaging-sw?worker&url';
export interface PushAdapter {
  configured: boolean;
  supported(): Promise<boolean>;
  permission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  token(): Promise<string>;
  revoke(): Promise<void>;
}
export function createFirebasePushAdapter(): PushAdapter {
  const scope = '/firebase-cloud-messaging-push-scope';
  const messaging = async () => {
    const [app, sdk] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
    const instance =
      app.getApps().find((a) => a.name === 'wolfari-push') ??
      app.initializeApp(firebaseConfig, 'wolfari-push');
    return { sdk, instance: sdk.getMessaging(instance) };
  };
  return {
    configured: pushConfigured,
    async supported() {
      if (
        !globalThis.isSecureContext ||
        !('Notification' in globalThis) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in globalThis)
      )
        return false;
      return (await import('firebase/messaging')).isSupported();
    },
    permission: () => ('Notification' in globalThis ? Notification.permission : 'denied'),
    requestPermission: () => Notification.requestPermission(),
    async token() {
      if (!pushConfigured || Notification.permission !== 'granted') throw Error('Push unavailable');
      const registration = await navigator.serviceWorker.register(workerUrl, { scope });
      const { sdk, instance } = await messaging();
      const value = await sdk.getToken(instance, {
        vapidKey: vapidKey!,
        serviceWorkerRegistration: registration,
      });
      if (!value) throw Error('No push token');
      return value;
    },
    async revoke() {
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration(scope);
      if (!registration) return;
      if (
        ![registration.active, registration.waiting, registration.installing].some(
          (w) =>
            w &&
            new URL(w.scriptURL).origin === location.origin &&
            new URL(w.scriptURL).pathname.includes('firebase-messaging-sw'),
        )
      )
        throw Error('Unexpected push worker');
      if (
        registration &&
        [registration.active, registration.waiting, registration.installing].some((w) =>
          w?.scriptURL.includes('firebase-messaging-sw'),
        )
      ) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && !(await subscription.unsubscribe()))
          throw Error('Cannot revoke browser subscription');
      }
      if (pushConfigured) {
        const { sdk, instance } = await messaging();
        if (!(await sdk.deleteToken(instance))) throw Error('FCM token revocation unconfirmed');
      }
      // Keep the inactive worker on SDK failure so a later retry can revoke its cached token.
      await registration.unregister();
    },
  };
}
