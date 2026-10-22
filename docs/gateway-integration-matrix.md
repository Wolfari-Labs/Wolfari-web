# Gateway Integration Matrix

The browser talks only to `/api/v1` through the Gateway. Service ports and fixture
mutations are never production dependencies. This matrix deliberately separates
Gateway route readiness from Web integration so a backend route is not reported as
already wired into the browser runtime.

| Capability    | Gateway route                                                                  | Gateway readiness | Web integration slice                              | Concurrency/security                                                |
| ------------- | ------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Register      | `POST /auth/register`                                                          | runtime           | `feat/3` runtime                                   | `202`; no automatic login                                           |
| Login         | `POST /auth/login`                                                             | runtime           | `feat/3` runtime                                   | refresh cookie; access token memory-only                            |
| Refresh       | `GET /auth/csrf`, `POST /auth/refresh`                                         | runtime           | `feat/2` foundation; `feat/3` runtime              | cookie + Origin + CSRF; single-flight per tab                       |
| Email verification | `POST /auth/email-verifications`, `POST /auth/email-verifications/confirm` | runtime        | `feat/4` runtime                                   | authenticated resend; one-time URL token is scrubbed                |
| Password recovery | `POST /auth/password-reset-requests`, `POST /auth/password-resets`         | runtime           | `feat/4` runtime                                   | generic `202`; one-time URL token is scrubbed                       |
| Self profile  | `GET/PATCH /me`                                                                | runtime           | `feat/4` runtime                                   | `expected_version` on PATCH                                         |
| Avatar        | `POST /me/avatar`, `GET /me/avatar`                                            | runtime           | `feat/4` runtime                                   | multipart upload; private binary download                           |
| Password change | `POST /me/password-change`                                                  | runtime           | `feat/4` runtime                                   | clears the memory token and requires login again                    |
| Sessions      | `GET /me/sessions`, `DELETE /me/sessions/:id`                                  | runtime           | `feat/4` runtime                                   | `204` revoke; current-session logout needs session-id contract      |
| Trips         | `GET/POST /trips`, `GET/PATCH /trips/:id`                                      | runtime           | `feat/5`                                           | create uses `client_request_id`; PATCH uses revisions + idempotency |
| Plan policy   | `PUT /trips/:id/plan-policy`                                                   | partial           | `feat/6`                                           | no read projection for selected editor IDs                          |
| Members       | `GET /trips/:id/members`                                                       | runtime           | `feat/6`                                           | IDs/roles/timestamps only; lifecycle writes disabled                |
| Invitations   | `GET/POST /trips/:id/invitations`, token preview/accept/decline, revoke/resend | runtime           | `feat/7`                                           | mutation idempotency; one-time link is memory-only                  |
| Plan/Activity | `GET /trips/:id/plan`, activity POST/PATCH/DELETE/order PUT                    | runtime           | `feat/8`                                           | expected plan version + idempotency on writes                       |
| Finance/Fund  | none in Gateway                                                                | blocker           | unavailable                                        | fixture/unavailable only                                            |

## Feature #2 boundary

Feature #2 provides the shared HTTP transport, normalized domain errors, the
memory-only token store, and the session manager. It intentionally does not select
feature repositories or mount authenticated UI. Those runtime adapters are delivered
by the numbered slices in the table, beginning with `feat/3`.

The transport supports GET/POST/PUT/PATCH/DELETE, JSON, `FormData`, binary responses,
and `204` responses. It preserves Gateway error codes, correlation IDs, retryability,
details, and revision evidence. It retries only safe reads after one successful refresh
attempt; mutations are never retried automatically.

## Configuration contract

- Local Vite development proxies `/api/v1` to `VITE_GATEWAY_PROXY_TARGET`, defaulting
  to `http://127.0.0.1:3000`.
- The backend `WEB_ORIGIN` must exactly match the browser origin, normally
  `http://127.0.0.1:5173` for local development.
- Production must expose the SPA and `/api/v1` through the same HTTPS origin. No
  secret or internal service address belongs in a `VITE_*` variable.

## Identity security boundary

Identity tokens are never written to `localStorage`, `sessionStorage`, query caches, logs, or
analytics. Recovery and verification routes use the existing Auth layout and remove `token` from
the address bar with navigation replacement before submission; the document also sends
`Referrer-Policy: no-referrer`.

Backend email links currently open `/api/v1/auth/local/verify` or
`/api/v1/auth/local/reset`, so those links still need a Backend contract or configuration change
to land directly on the Web routes. Logout remains visibly blocked because the current Web
contract requires a `session_id` that is not exposed for the HttpOnly refresh cookie; the Web
does not fake logout or revoke every session.
