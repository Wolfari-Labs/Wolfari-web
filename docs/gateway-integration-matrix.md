# Gateway Integration Matrix

The browser talks only to `/api/v1` through the Gateway. Service ports and fixture
mutations are never production dependencies. This matrix deliberately separates
Gateway route readiness from Web integration so a backend route is not reported as
already wired into the browser runtime.

| Capability         | Gateway route                                                                  | Gateway readiness | Web integration slice                  | Concurrency/security                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------ | ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Register           | `POST /auth/register`                                                          | runtime           | `feat/3` runtime                       | `202`; no automatic login                                                                                                                                               |
| Login              | `POST /auth/login`                                                             | runtime           | `feat/3` runtime                       | refresh cookie; access token memory-only                                                                                                                                |
| Refresh            | `GET /auth/csrf`, `POST /auth/refresh`                                         | runtime           | `feat/2` foundation; `feat/3` runtime  | cookie + Origin + CSRF; single-flight per tab                                                                                                                           |
| Email verification | `POST /auth/email-verifications`, `POST /auth/email-verifications/confirm`     | runtime           | `feat/4` runtime                       | authenticated resend; one-time URL token is scrubbed; successful confirmation shows registration success and redirects to login                                         |
| Password recovery  | `POST /auth/password-reset-requests`, `POST /auth/password-resets`             | runtime           | `feat/4` runtime                       | generic `202`; one-time URL token is scrubbed                                                                                                                           |
| Self profile       | `GET/PATCH /me`                                                                | runtime           | `feat/4` runtime                       | `expected_version` on PATCH                                                                                                                                             |
| Avatar             | `POST /me/avatar`, `GET /me/avatar`                                            | runtime           | `feat/4` runtime                       | multipart upload; private binary download                                                                                                                               |
| Password change    | `POST /me/password-change`                                                     | runtime           | `feat/4` runtime                       | clears the memory token and requires login again                                                                                                                        |
| Sessions           | `GET /me/sessions`, `DELETE /me/sessions/:id`                                  | runtime           | `feat/4` runtime                       | `204` revoke; current-session logout needs session-id contract                                                                                                          |
| Trips              | `GET/POST /trips`, `GET/PATCH /trips/:id`                                      | runtime           | `feat/5`                               | create uses `client_request_id`; PATCH uses revisions + idempotency                                                                                                     |
| Plan policy        | `PUT /trips/:id/plan-policy`                                                   | partial           | `feat/6` basic policy writer           | Owner + active + `can_update` + unarchived; empty editor IDs for basic policies; revision + idempotency; Trip GET confirms state; Selected editor IDs remain unreadable |
| Members            | `GET /trips/:id/members`                                                       | runtime           | `feat/6` paginated read                | `limit=100`, opaque cursor, `include_left`, dedupe/retain/retry; IDs/roles/timestamps only; lifecycle writes disabled                                                   |
| Invitations        | `GET/POST /trips/:id/invitations`, token preview/accept/decline, revoke/resend | runtime           | `feat/7` management + response runtime | cursor/version/revision + stable mutation intent; one-time token/link is memory-only                                                                                    |
| Plan/Activity      | `GET /trips/:id/plan`, activity POST/PATCH/DELETE/order PUT                    | runtime           | `feat/8`                               | expected plan version + idempotency on writes                                                                                                                           |
| Finance/Fund       | none in Gateway                                                                | blocker           | unavailable                            | fixture/unavailable only                                                                                                                                                |

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
- `TRIP_INVITATION_LINK_BASE_URL` belongs to the Backend deployment and must point to
  the public Web origin. Backend emits `<base>/invitations/local#token=...`; the SPA
  supports that compatibility route and canonical `/invitations`. If the value still
  points at the Gateway origin, the Gateway local helper opens instead of this Web flow.

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

## Invitations acceptance boundary (Issue #7)

- Active Owners list/filter/page invitations and create EMAIL or LINK invitations from
  Members. Create carries `expected_membership_revision`; resend/revoke carry the row's
  `expected_version`; every write has a stable idempotency key and duplicate actions are locked.
- EMAIL success means the delivery request was accepted, not that mail arrived. LINK creation
  exposes `one_time_link` only in component memory. Closing or leaving the flow discards it; a
  replay receipt without the link explicitly says it cannot be recovered and never creates a
  replacement automatically.
- `/invitations` and `/invitations/local` consume exactly one valid fragment token before React
  renders, preserve router history state, and immediately scrub the fragment. The token stays in
  a module-memory handoff—not URL navigation, Web Storage, logs, analytics, or React Query keys/data.
- A recipient token can remain in that memory handoff across an SPA unmount only while its
  unresolved accept/decline intent is retryable; terminal success, account switch/logout, token
  replacement, reload, or explicit discard clears it. Owner one-time LINK values are shorter-lived
  and are removed when the Invitations tab is left.
- Anonymous viewers return through login/register with only `/invitations` in `returnTo`.
  Preview starts after session bootstrap. Account/session/token changes cancel the old request and
  discard stale results. Reload intentionally loses the token and asks the user to reopen the link.
- Preview sends no idempotency key. Accept/decline keep the same key and token when retrying an
  unknown transport outcome, block the opposite action, and treat their mutation receipt as final.
  Successful accept navigates using `membership.trip_id`; neither success re-previews a consumed token.
- `404` and state conflicts use neutral copy because Web cannot safely distinguish wrong account,
  expired, revoked, or already-used tokens. Invalid DTO fields are contract errors rather than
  coerced IDs, versions, timestamps, roles, or `PENDING` status.

## Profile/Sessions acceptance boundary (Issue #4)

- Self/session projections are validated before creating view models. Missing fields,
  non-integer versions and unparseable timestamps become contract errors with the
  response correlation ID; they are not coerced into display data.
- PATCH always carries the confirmed `expected_version`. `fullName` is optional in
  the Web intent so avatar-only attachment cannot resend a stale name. A confirmed
  response replaces the profile and invalidates shell data; conflict retains the
  draft, refetches the version, and requires an explicit resubmission. Writes are
  serialized and never automatically retried.
- Avatar accepts nonempty PNG/JPEG up to 10 MB. Multipart upload and attachment are
  separate operations; an attachment failure is not reported as a changed avatar.
  Downloads use the authenticated HTTP client and Blob URLs, keyed by profile
  version, with cancellation and URL revocation on replacement/unmount.
- Sessions use cursor-based infinite queries, deduplicate IDs across pages, retain
  loaded items after later-page errors, and reset to page one after a successful
  `204` revoke. Device/IP/current-session metadata is not invented.
- Password change validates current password, 15–128 Unicode code points for the
  new password, and confirmation, without trimming passwords. Successful change
  or reset clears the local session/private cache and redirects to login; failed
  writes do not claim success or clear a session solely because of a mutation `401`.
- Private children cannot mount while bootstrap is unknown/anonymous. Session
  changes cancel/remove query data before another account signs in. An obsolete
  refresh/login result cannot restore a cleared or replaced access token.
- Verification/reset tokens stay in component memory, are removed from the URL
  before submission and discarded after success/unmount. Pending actions are
  cancellable and duplicate submissions are locked; redirect timers are cleaned up.

`corepack pnpm test:e2e:gateway` uses the real Web adapters/session manager with
Playwright-intercepted HTTP on port **5174**, with `VITE_DATA_MODE=gateway` supplied
through the server process. Every API request is fulfilled or rejected by the test
harness, never forwarded to Backend. CI runs this separately from fixture E2E.
This proves the mocked browser contract, **not a live Backend/email/storage integration**.
See [Issue #4 evidence](profile-sessions-evidence-2026-10-22.md).

## Feature #6 Members / Plan policy boundary

- Members reads validate the complete page projection and requested Trip scope, preserve the
  opaque Gateway cursor, correlation ID, error and cancellation behavior, and use
  `include_left` only for the opt-in departed-members view. The browser harness mocks every
  request; it does not contact a live Gateway or Backend.
- The policy writer supports only `OWNER_ONLY` and `ALL_MEMBERS` with an empty editor ID list.
  A `SELECTED_MEMBERS` value remains visible but read-only until a server projection exposes its
  selected membership IDs. Fixture mode has no writer and must not produce a successful mutation.
- A policy intent carries `expected_membership_revision` and a fixed idempotency key. Conflict
  requires a fresh explicit submission; ambiguous post-send outcomes remain unknown and only
  retry on explicit user action with the same intent. The refreshed Trip GET, not the PUT body,
  is the saved-state authority. Plan, Trip detail, Members, shell and Trip-list caches are
  refreshed because this policy changes membership revision rather than plan version.
- Leave/remove/transfer, invitation mutations and Plan/Activity operations remain outside `feat/6`.
