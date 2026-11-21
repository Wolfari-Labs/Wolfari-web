# Browser push registration — TEST setup

Scope: real FCM token registration/removal only. Backend notification delivery is
separate. No Firebase project was supplied: live token and delivery acceptance are
**BLOCKED / NOT_RUN**, not a successful end-to-end integration.

1. Create a dedicated TEST Firebase project and register a Web app. Enable the FCM
   Registration API if required by your project. In Project settings → Cloud
   Messaging → Web Push certificates, generate a Web Push key pair.
2. Copy the public Web app config and public VAPID key to `.env.local` using the
   names in `.env.example`. Never copy service-account JSON, private VAPID keys,
   backend MoMo secrets or access tokens into a `VITE_*` variable.
3. Install with `corepack pnpm install --frozen-lockfile`, build and serve over
   HTTPS (localhost is allowed). The Firebase worker is bundled by Vite; serve
   its generated asset as JavaScript, without redirecting it to index.html.
   Keep the Web app and worker on the same origin. Do not substitute a CDN worker.
4. Sign in to the TEST backend. Open Profile → Thông báo → “Thông báo trên trình
   duyệt này”. Click “Bật thông báo trình duyệt”; grant permission. Confirm a WEB
   device is stored. Do not copy tokens into reports/screenshots/logs.
5. Reload Profile and confirm registration refreshes without prompting. Open a
   second tab; test logout/account switch, then ensure the old account no longer
   receives push. Try denial, revoked permission, offline API, and disabled storage.
6. Click “Tắt đăng ký trình duyệt”; verify DELETE succeeds and the browser push
   subscription/token is revoked. Repeat with the API offline: UI must show that
   full removal is unconfirmed, not a false success. Retry after reconnecting.

The SDK is lazy-loaded. Only non-secret device ID/owner/registration intent is
stored by application code; FCM manages its own token storage. Registration is
refreshed on opening/focusing the Profile panel; backend owns deduplication by
token. General `push_enabled` preferences do not themselves register a browser.
Logout cleanup is bounded to 8 seconds; when cleanup cannot be confirmed on a
shared machine, revoke site notification permission in browser settings too.

References: [FCM Web setup](https://firebase.google.com/docs/cloud-messaging/web/get-started),
[getToken options](https://firebase.google.com/docs/reference/js/messaging.gettokenoptions),
[Messaging API](https://firebase.google.com/docs/reference/js/messaging).
