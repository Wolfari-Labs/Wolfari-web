# Gateway Integration Matrix

This matrix is the Web integration gate. The browser talks only to `/api/v1` through the
Gateway; service ports and fixture mutations are never production dependencies.

| Capability | Runtime route | Web status | Concurrency/security |
| --- | --- | --- | --- |
| Register | `POST /auth/register` | runtime | `202`; no automatic login |
| Login | `POST /auth/login` | runtime | Web refresh cookie; access token memory-only |
| Refresh | `GET /auth/csrf`, `POST /auth/refresh` | runtime | cookie + Origin + CSRF; single-flight per tab |
| Self profile | `GET/PATCH /me` | runtime | `expected_version` on PATCH |
| Avatar | `POST /me/avatar`, `GET /me/avatar` | runtime | multipart upload; private binary download |
| Sessions | `GET /me/sessions`, `DELETE /me/sessions/:id` | runtime | `204` revoke; current-session logout needs session-id contract |
| Trips | `GET/POST /trips`, `GET/PATCH /trips/:id` | runtime | create uses `client_request_id`; PATCH uses revisions + idempotency |
| Plan policy | `PUT /trips/:id/plan-policy` | partial | no read projection for selected editor IDs |
| Members | `GET /trips/:id/members` | runtime | IDs/roles/timestamps only; lifecycle writes disabled |
| Invitations | `GET/POST /trips/:id/invitations`, token preview/accept/decline, revoke/resend | runtime | mutation idempotency; one-time link is memory-only |
| Plan/Activity | `GET /trips/:id/plan`, activity POST/PATCH/DELETE/order PUT | runtime | expected plan version + idempotency on writes |
| Finance/Fund | none in Gateway | blocker | fixture/unavailable only |

The Web client preserves Gateway error codes, correlation IDs, retryability and revision details.
It retries only safe reads after one refresh attempt; mutations are never retried automatically.
