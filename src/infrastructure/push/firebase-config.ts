export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY ?? '') as string,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '') as string,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '') as string,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID ?? '') as string,
};
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
export const pushConfigured =
  Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.trim().length > 0) &&
  !!vapidKey?.trim();
