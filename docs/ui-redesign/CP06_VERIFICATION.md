# CP-06 verification — Collaborative Plan Web

Verification date: 01/11/2026. Branch `draft/demo-ui-ux`, HEAD remains `4a4ff2687aac675c6614d92025534bf11afac3e0`; no commit or push was made. Results below distinguish source review, fixture/HTTP mocks, and checks not run against a live Backend.

## Source and scope

- Official Figma MCP rechecked Plan main `20:236`; saved source frames `439:2028` (pool), `439:2497` (day-map) and official editor evidence `26:425` were used. The pool and map are alternate right panels. No Figma write or whole-file resurvey.
- D18 approved the centered editor with all current fields. D33 approved PLN01–05, PLN07 and Plan-only DLT09 exactly as [CP06_DESIGN_DECISIONS](CP06_DESIGN_DECISIONS.md). PLN06 color/token changes remain pending.
- Gateway implementation keeps the existing repository, serializer, command hook, actor/Trip recovery, expected plan version and idempotency keys. No `src/infrastructure`, Backend, dependency, package or lockfile change.

## Automated gates

| Gate | Result |
|---|---|
| `corepack pnpm typecheck` | PASS after W04 integration. |
| Targeted ESLint / Prettier / `git diff --check` | PASS; Git only reports normal LF→CRLF warnings. |
| Focused Vitest Plan contracts and components | **83/83 PASS** across Gateway panel, timeline read-only, metrics, day-map, gateway repository, command intent and command suites. |
| `corepack pnpm build` | PASS; Vite production build 2907 modules. |
| Gateway Plan HTTP-mock E2E | **17/17 PASS**: CRUD/full reorder/version/idempotency, keyboard/touch drag, conflict/permission, centered editor, read-only day filters, Plan composition, pool/map alternation and selected-location create at 1440/820/402/320/1366×520. |
| Composition axe sampling | Existing CP05 Gateway shell findings were retained: `color-contrast` on the known cyan Overview breadcrumb and `label-content-name-mismatch` on profile label/name. CP06 does not claim shell-wide axe zero; PLN06 remains pending. No new Plan-specific axe failure was used as a gate. |
| Source/runtime evidence | `.local/cp06-composition-final/` contains plan/map/pool screenshots for all five Web viewports; `.local/cp06-gateway-final/` contains the 17-test run. Official/runtime provenance is summarized in [CP06_DESIGN_DECISIONS](CP06_DESIGN_DECISIONS.md). |

## Limits and NOT_RUN

- Live Backend, production data, manual screen reader, physical devices, Web Vitals/performance profiling and native Chromium 200% zoom for the Gateway Plan route are **NOT_RUN**. The editor test uses CSS `zoom:2`, which is not native browser zoom. Existing CP04/CP05 native zoom evidence covers other routes and is not relabeled as Plan evidence.
- Figma editor context `26:425` timed out in the scoped MCP retry; official saved screenshot/XML and prior inventory support the approved geometry. This is recorded, not hidden.
- Existing CP05 shell axe findings and pending PLN06 color review remain exceptions. No Backend compatibility claim is made beyond repository/HTTP-mock contract tests.

## Contract audit

The tested writes preserve complete activity ID permutations, expected plan versions, immutable idempotency keys, date-only and overnight serialization, selected-location IDs, conflict/unknown recovery and permission gating. Read-only navigation tests confirm ALL/day/POOL buttons stay available while drop/write controls remain disabled.
