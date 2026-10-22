# Gateway Integration Matrix

This matrix is the Web integration gate. The browser talks only to `/api/v1` through the
Gateway; service ports and fixture mutations are never production dependencies.

| Capability | Runtime route | Web status | Concurrency/security |
| --- | --- | --- | --- |
| Register | `POST /auth/register` | runtime | `202`; no automatic login |
| Login | `POST /auth/login` | runtime | Web refresh cookie; access token memory-only |
| Refresh | `GET /auth/csrf`, `POST /auth/refresh` | runtime | cookie + Origin + CSRF; single-flight per tab |
| Email verification | `POST /auth/email-verifications`, `/confirm` | runtime | resend is authenticated; token is read once from `/verify-email?token=...`, then scrubbed |
| Password recovery | `POST /auth/password-reset-requests`, `/password-resets` | runtime | generic `202` response; token is read once from `/reset-password?token=...`, then scrubbed |
| Self profile | `GET/PATCH /me` | runtime | `expected_version` on PATCH |
| Avatar | `POST /me/avatar`, `GET /me/avatar` | runtime | multipart upload; private binary download |
| Password change | `POST /me/password-change` | runtime | on `200`, clear memory access token and require login again |
| Sessions | `GET /me/sessions`, `DELETE /me/sessions/:id` | runtime | `204` revoke; current-session logout needs session-id contract |
| Trips | `GET/POST /trips`, `GET/PATCH /trips/:id` | runtime | create uses `client_request_id`; PATCH uses revisions + idempotency |
| Plan policy | `PUT /trips/:id/plan-policy` | partial | no read projection for selected editor IDs |
| Members | `GET /trips/:id/members` | runtime | IDs/roles/timestamps only; lifecycle writes disabled |
| Invitations | `GET/POST /trips/:id/invitations`, token preview/accept/decline, revoke/resend | runtime | mutation idempotency; one-time link is memory-only |
| Plan/Activity | `GET /trips/:id/plan`, activity POST/PATCH/DELETE/order PUT | runtime | expected plan version + idempotency on writes |
| Finance/Fund | none in Gateway | blocker | fixture/unavailable only |

The Web client preserves Gateway error codes, correlation IDs, retryability and revision details.
It retries only safe reads after one refresh attempt; mutations are never retried automatically.

Identity tokens are never written to `localStorage`, `sessionStorage`, query caches, logs or
analytics. Recovery/verification routes use the existing Auth layout and remove `token` from the
address bar with navigation replacement before submission; the document also sends
`Referrer-Policy: no-referrer`. Backend email links currently open `/api/v1/auth/local/verify` or
`/api/v1/auth/local/reset`, so those links still need a Backend contract/configuration change to
land directly on the Web routes. Logout remains visibly blocked because the current Web contract
requires a `session_id` that is not exposed for the HttpOnly refresh cookie; the Web does not fake
logout or revoke every session.
