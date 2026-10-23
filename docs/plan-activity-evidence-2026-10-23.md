# feat/8 Plan/Activity — 2026-10-23

## Baseline and scope

- PR #18 merged feat/7 into develop at `23a8aaa`.
- Local feat/8 merged that baseline at `687ae88`.
- All implementation changes are in Wolfari-web. Backend was read-only and clean
  before implementation.

## Behavior

- Gateway create/update/delete/completion and complete-list reorder; typed inputs,
  whitelisted wire fields, strict snapshot validation, server location IDs only.
- Local scheduling: date survives null times; suffix reset; same-slot no-op;
  changed-day form matches dragging; cross-tab sync; stale draft retained.
- Pending locks, immutable unknown intent replay, explicit conflict reconciliation,
  permission-aware actions, coordinated Trip/Plan refresh.

## Validation

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: 37 files / 481 tests passed.
- `corepack pnpm build`: passed.
- Plan preview Playwright: 10/10 passed, including 320–1440px layouts and keyboard drag.
- Full Gateway Playwright: 33/33 passed (identity, invitations, members, trips, Plan).
- Plan Gateway Playwright rerun after session recovery integration: 3/3 passed.
- `git diff --check`: passed; Backend `git status --porcelain`: empty.

An earlier full Gateway run had 3 Plan dynamic-import failures while source files
were being changed; a clean full rerun passed 33/33, and the final Plan rerun passed.
Gateway browser tests intercept HTTP; they do not establish live Backend/database
behavior. Live Backend verification was not performed.

## Known boundary

There is no Backend date-only activity field. Local scheduling is not shared or
published. Unknown recovery survives navigation/reload within the same session
using actor/trip-scoped session storage, not session closure/storage deletion or
another device. No Backend contracts or files are changed.

## CI mobile scroll follow-up

The push check on `47c6ba4` failed `workspace boundaries 402×874` while the PR
check on the same commit passed. The failed run's `mobile.png` still showed Trip
Overview after the URL had changed to Plan; the failure snapshot later showed
Plan with focus back on main. The test appended/clicked its scroll probe before
the lazy route committed, so navigation could reset the scroll afterward.

The mobile boundary test now waits for the Plan heading, timeline and assets
before inserting the probe. A gated lazy-module regression reproduces the old
Overview remaining visible after drawer dismissal and checks document scrolling
after Plan becomes ready. Timeouts and application scroll behavior are unchanged.
