# PR #30 CI repair — 22 November 2026

PR: https://github.com/Wolfari-Labs/Wolfari-web/pull/30

Base inspected: `50f6a745e317a483fbd34e0586b8d4e157f5926b` on
`feat/web-poi-integration`. Repairs are isolated in the `Wolfari-web-pr30`
worktree; existing changes in the original Web and Mobile worktrees are preserved.

## Remote synchronization

- Fetched all three repositories without deleting local branches or changes.
- Web `develop`: `62ea04c`, matches `origin/develop`.
- Backend `feat/poi-overture`: fast-forwarded `ef266df` to `266eb92`, matches origin.
- Mobile `main`: `eb3c7a7`, matches `origin/main`; existing `package-lock.json` edit retained.
- Historical branches, including the Web branch with one local-only commit,
  were not reset, merged or pushed.

## Failures and corrections

Run https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/44980926435
failed in three jobs:

1. `checks` and `built-browser (fixture)` each passed 250/251 browser tests;
   both failed the Linux `home-guest-1440.png` comparison with 102,322 differing
   pixels. Lint/typecheck and all 887 unit tests passed in that remote run.
   The same screenshot mismatch also occurred in run `44914678138`.
   The PR's existing UI work updated the Windows baseline in `5afb307`, but not
   Linux; `docs/ui-redesign/STATE.md` explicitly recorded that missing refresh.
   Reviewed the CI actual/diff images against the committed Windows baseline
   and current source. Updated only the Linux baseline using the actual PNG
   from artifact `browser-built-fixture-1` (artifact ID `14736804944`).
   SHA-256: `25c2b82f66a27356211deb7555921c434435388689dafc5458f4890dd4c9b142`.
   No screenshot thresholds, assertions or Home implementation were changed.
2. `built-browser (gateway)` passed 207 tests, skipped 5, and failed the Price
   Watch history accessibility scan (`scrollable-region-focusable`, serious).
   The Drawer content wrapper scrolls independently but was not explicitly
   keyboard-focusable after pagination controls disappeared. Made that wrapper
   a named region with `tabIndex={0}`. Added unit coverage for keyboard entry and
   preservation of explicit initial focus, plus browser assertions for Tab,
   ArrowDown scrolling, existing axe checks, Escape and focus return.

## Verification

The two new unit tests failed before the source fix because no named region
existed. The original Price Watch browser test passed on Windows before the
fix; this does not invalidate the recorded Linux failure.

Post-fix local Windows results:

- `corepack pnpm lint`: PASS.
- `corepack pnpm typecheck`: PASS.
- Focused Drawer/shared-UI/shell unit tests: 20/20 PASS.
- `corepack pnpm test --maxWorkers=1`: 79 files, 889/889 PASS.
- Gateway production bundle and fixture Preview bundle: PASS.
- Built Gateway HTTP-mock tests: 3/3 PASS (Price Watch history and Create
  success dialog at 1440px/402px). Includes axe, explicit initial focus,
  keyboard scrolling, Escape, focus return and unchanged API assertions.
- Built fixture tests: 9/9 PASS (eight Auth/public responsive layouts including
  the existing Windows Home screenshot, plus Drawer focus trap/Escape/backdrop
  and background scroll lock). Linux snapshot requires the next remote run.
- Scoped Prettier and `git diff --check`: PASS.

The first new keyboard-scroll assertion assumed the 402x874 viewport would
overflow on Windows, but it did not. Kept the original 402x874 axe scan and
added a separate 402x480 short-viewport check that proves actual overflow,
Tab reachability, ArrowDown scrolling and zero axe violations. Rerun: 3/3 PASS.

An initial local full-unit attempt and a rebuild failed from host memory
exhaustion, not test assertions. Subsequent checks are run serially.
Docker's Linux engine returned HTTP 500 after the image-pull attempt, so no
fresh Linux browser run is claimed. Copying the reviewed CI screenshot is
baseline maintenance, not a new successful Linux run.

The local fixture run uses ignored `.local/pr30.fixture.config.ts` on port
5187 because a user process owns port 5173. The first temporary config merged
both web servers instead of overriding the original; that test-owned run was
stopped and the local-only config corrected. No user process was stopped.

No workflow checks were disabled, no dependencies changed, no deployment or
live Backend tests performed. Full browser suites were not rerun locally.
The user explicitly authorized commit/push and repeated repair/verification
until the PR checks pass. A fresh GitHub Actions run is pending this repair
commit; existing checkpoint acceptance records are not reclassified.

## Remote round 1 and follow-up

Repair commit `c71dfb4` was pushed with explicit user authorization.
PR run https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/44995612895
passed all three jobs: 889 unit tests, 251 fixture tests in both dev/built modes,
208 Gateway tests with 5 existing skips in both modes. Both original CI defects
are verified fixed on Linux.

Push run https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/44995610353
passed both built jobs but its dev Gateway suite failed 1/213 tests (207 passed,
5 skipped): `gateway-plan-dnd.spec.ts:47` lost handle focus after the third
pointer reorder. Downloaded the failure trace; server and rendered order were
correct, but the handle remained inactive. The original test passed 10/10 local
repetitions, confirming that a single passing rerun is insufficient evidence.

Source review identified a focus/snapshot race: the save promise and enabled
handles can settle before React commits the refreshed plan. The hook consumed
its pending focus request against the old row; a later DOM reorder can lose
that focus. Added a deterministic regression that separates promise settlement
from snapshot commit (FAIL before the fix). A successful arrangement now keeps
the focus request until a newer authoritative plan version is rendered; failed,
canceled and no-op moves still restore against the existing snapshot. No API,
idempotency, ordering or timestamp-reset semantics changed.

Post-follow-up local Windows verification:

- Focused unit tests: 62/62 PASS; full unit suite: 79 files, 891/891 PASS.
- Lint/typecheck, scoped Prettier and `git diff --check`: PASS.
- Dev Gateway HTTP-mock drag-and-drop suite: 9/9 PASS.
- Gateway production and fixture Preview bundles: PASS; the previously failing pointer-sort case
  passed 10/10 repetitions against that built bundle with one worker.

Remote verification is pending the follow-up push. No assertion removal or
timeout increase; the full browser suites are left to the fresh Linux CI runs.
