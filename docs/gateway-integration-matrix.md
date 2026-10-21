# Gateway Integration Matrix

The browser talks only to `/api/v1` through the Gateway. Service ports and fixture
mutations are never production dependencies. This matrix deliberately separates
Gateway route readiness from Web integration so a backend route is not reported as
already wired into the browser runtime.

| Capability    | Gateway route                                                                  | Gateway readiness | Web integration slice                              | Concurrency/security                                                |
| ------------- | ------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Register      | `POST /auth/register`                                                          | runtime           | `feat/3`                                           | `202`; no automatic login                                           |
| Login         | `POST /auth/login`                                                             | runtime           | `feat/3`                                           | refresh cookie; access token memory-only                            |
| Refresh       | `GET /auth/csrf`, `POST /auth/refresh`                                         | runtime           | foundation in `feat/2`, runtime wiring in `feat/3` | cookie + Origin + CSRF; single-flight per tab                       |
| Self profile  | `GET/PATCH /me`                                                                | runtime           | `feat/4`                                           | `expected_version` on PATCH                                         |
| Avatar        | `POST /me/avatar`, `GET /me/avatar`                                            | runtime           | `feat/4`                                           | multipart upload; private binary download                           |
| Sessions      | `GET /me/sessions`, `DELETE /me/sessions/:id`                                  | runtime           | `feat/4`                                           | `204` revoke; current-session logout needs session-id contract      |
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
