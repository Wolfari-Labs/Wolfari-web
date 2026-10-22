# Issue #4 Profile and Sessions Evidence

Date: 2026-10-22

The Web implementation on `feat/4-profile-sessions` covers the self profile,
avatar transfer, password change, session listing/revocation, and the related
Identity session lifecycle. The UI keeps the existing Profile screen contract
and remains responsive at 1440, 768, 402, and 320 pixels.

## Verification

| Check | Result |
| --- | --- |
| `corepack pnpm lint` | pass |
| `corepack pnpm typecheck` | pass |
| `corepack pnpm test` | 308 tests passed |
| `corepack pnpm build` | pass |
| `corepack pnpm build:preview` | pass |
| `corepack pnpm test:e2e` | 163 tests passed |
| `corepack pnpm test:e2e:gateway` | 19 tests passed |

The Gateway suite starts Vite on port `5174` with `VITE_DATA_MODE=gateway` in the
server process. Playwright intercepts every `/api/**` request, checks the Web
client headers and Bearer usage, and fulfills only routes declared in the
fixture. It exercises the real Gateway repository, HTTP client, session manager,
React Query session pagination, and route guard. No request reaches Backend.

The browser flow covers login, profile PATCH with `expected_version`, multipart
avatar upload followed by attachment, same-endpoint avatar refresh, paginated
session revoke with `204`, conflict draft retention, later-page failure and
retry, password change failure/success, account cache isolation, bootstrap guard,
expired session, verification, recovery/reset, 400/429/503 handling, truthful
registration pending, password visibility keyboard controls, and responsive
overflow checks.

## Screenshots

- [Desktop 1440px](evidence/issue-4/profile-1440.png)
- [Mobile 402px](evidence/issue-4/profile-402.png)

## Dependencies and limits

Issue #3 is the Identity/Gateway dependency. Backend email links still target
the existing `/api/v1/auth/local/*` paths and require a Backend link contract or
deployment configuration to land directly on the Web action routes. Logout stays
disabled because the current browser contract does not expose the refresh
cookie's current `session_id`; the Web does not guess one. Notification/device
projections are unavailable. A live Backend, database seed, cookie deployment,
and Mailpit flow are outside this repository and were not claimed as tested.
