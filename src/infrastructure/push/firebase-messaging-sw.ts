/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';
import { firebaseConfig, pushConfigured } from './firebase-config';
// No arbitrary data URLs, cache interception or custom notification rendering.
// Backend delivery is a separate capability; FCM handles notification payloads.
if (pushConfigured) getMessaging(initializeApp(firebaseConfig, 'wolfari-push'));
