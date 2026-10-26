# Invitations Gateway Integration — Issue #7

Branch `feat/7-invitations` được đồng bộ bằng merge `origin/develop` sau khi PR #17
(`feat/6-members-plan-policy`) đã vào `develop`. Phạm vi chỉ sửa Wolfari Web và giữ nguyên Backend.

## API và quyền

| Flow              | Contract Web                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| List              | Owner active; `GET /api/v1/trips/:tripId/invitations`, `limit=20`, opaque cursor, optional status; dedupe across pages |
| Create EMAIL/LINK | Owner + update permission + unarchived; revision + stable idempotency key; EMAIL normalized, LINK has no email         |
| Resend/revoke     | EMAIL/PENDING resend, PENDING revoke; exact row version + stable idempotency key; revoke has confirmation              |
| Preview           | Authenticated recipient; POST token only, no idempotency key, non-consuming                                            |
| Accept/decline    | Authenticated recipient; stable idempotency key; terminal mutation receipt, no follow-up preview                       |

Backend evidence remains the existing Gateway invitation proxy and Trip invitation service.
`TRIP_INVITATION_LINK_BASE_URL` must be the Web origin because Backend emits
`/invitations/local#token=...`. The Web implements that path as an alias for `/invitations`.

## Security and recovery

- Token/link secrets live only in module/component memory. Fragment capture occurs before router
  render, validates exactly one `inv1_` token, keeps `history.state`, and removes the hash.
- The recipient token handoff may survive a SPA route unmount while an unresolved mutation intent
  is waiting for an explicit retry; it is cleared at terminal accept/decline, token replacement,
  logout/account switch, reload, or explicit discard. The Owner LINK secret has the shorter
  component/tab lifetime and is removed when its tab is left.
- No token appears in return URLs, Query keys/data, local/session storage, logs, or fixtures shipped
  in a production build. Session/account/token changes abort old work.
- Unknown write results keep one immutable intent and block a conflicting action. Retry uses the
  same token/payload/version/revision/key. Definitive conflict clears that intent after authoritative
  projections are invalidated.
- LINK replay without `one_time_link` is explicitly unrecoverable. EMAIL completion only confirms
  that a request was accepted. `404/409` response copy does not reveal whether an invite exists.

## UI coverage

- Members → Lời mời provides EMAIL/LINK creation, status filter, cursor pagination, resend, revoke,
  one-time copy/close, responsive two-column-to-document layout, and Owner/read/update gating.
- Deep-link response handles bootstrap, anonymous login/register return, verified-account guidance,
  accept navigation to the receipt's Trip, decline confirmation, account switching, and lost-token copy.
- Existing fixture preview stays unchanged; Gateway runtime chooses the new management surface.

## Verification

The dedicated adapter and component suites cover DTO validation, endpoint/body/header contracts,
all principal HTTP error classes, StrictMode capture, login return, new-token replacement, stale
result cancellation, double-click locking, unknown retry identity, Owner/Member gates, pagination,
LINK secrecy, accept and decline terminal behavior. Playwright Gateway tests exercise Owner
management plus anonymous accept and mobile decline against intercepted HTTP; this is mocked HTTP
contract evidence, not a claim that a live deployed Gateway was smoke-tested.

### Final verification results

- `corepack pnpm test`: 410 tests passed across 33 files.
- Dedicated invitation adapter/component tests: 63 passed.
- `corepack pnpm typecheck` and `corepack pnpm lint`: passed.
- `corepack pnpm build` and `corepack pnpm build:preview`: passed.
- `corepack pnpm exec playwright test --config playwright.gateway.config.ts --workers=1`:
  30 passed (mocked HTTP, including invitation management, login/accept, mobile decline and keyboard).
- `corepack pnpm exec playwright test --workers=1`: 163 fixture regression tests passed.
- `git diff --check`: passed.

Run the Gateway and fixture Playwright suites sequentially in this checkout. Running both Vite
servers concurrently caused a Windows `EPERM` rename collision in `node_modules/.vite` and
inconsistent dependency modules; both suites passed on separate sequential reruns.
Live-backend smoke testing and deployment link-origin configuration remain unverified here.
