# PR25 CI repair — 08/11/2026

## Diagnosis

Both failed `checks` jobs on a18c066 have the same unit failure, not two separate
bugs: the Ngũ Hành Sơn query matches both the select button and its delete action.
The completed [push run](https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/42427744205)
and [PR run](https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/42427771662)
both report unit715/716, built fixture226/245 and built Gateway162/168.

## Repairs

- Unit query distinguishes the place toggle from the delete action. Browser
  queries explicitly target the existing data-place-main control (Playwright's
  pressed:false also matches buttons without aria-pressed).
- Shell tests target the banner landmark, not every nested HTML header.
- Width checks wait for the sidebar to reach72px before reading geometry.
- Map keyboard test waits until the add operation releases its write lock before
  pressing Tab; disabled buttons correctly remain outside the tab order.
- Map color assertion follows the current white/light-blue scheduled filter,
  preserving explicit color assertions rather than removing them.
- Storage-failure regressions use the current separate delete button instead of
  the removed checkbox, preserving the actual write and persistence assertions.
- Restore Gateway Map's existing PreparationActions/PreparationStatus, removed
  during the map redesign: add in the list panel, edit/delete in selected details.
  Reuse original permissions, capabilities, revision, limit, journal and recovery
  behavior; no new endpoints or replacement write implementation.

## Verification

- Full unit54 files /716 tests PASS after query correction, before restoring the
  Gateway action callsites. No timeout changes. Initial local concurrent unit
  run had10 failures under load; isolated rerun passed with unchanged timeouts.
- Production and Preview builds, typecheck, full ESLint and diff-check PASS.
  Existing PostCSS missing-from warning remains.
- Final built fixture focused23/23 PASS: nine shell viewport cases, two Map
  filter/keyboard cases, eight width cases, two workspace projections and two
  storage-failure modes. Initial focused run19/23 exposed Playwright's broader
  pressed:false matching; corrected locators, final whole23 rerun PASS.
- Final built Gateway HTTP-mock focused29/29 PASS: preparation SRS12 ten cases,
  width eight cases, and eleven projection/read/error/permission cases. Includes
  all three previously failing location-write cases and read-only behavior.
- Full local browser runs were stopped after CI's completed full reports became
  available; partial local results are not full-suite passes. Full final suites
  and live Backend NOT_RUN. Existing user server5173 was not stopped or reused.
- Reports: [fixture23](evidence/pr25-ci-repair/fixture-focused.json),
  [Gateway29](evidence/pr25-ci-repair/gateway-focused.json).

## Remaining CI failures: color contrast

Six test cases in the original full CI runs remain outside these repairs:

- Fixture: cp05-review at1440/402 and trip-overview scoped AXE (three cases).
- Gateway: cp07-composition Map at1440/402 and ui-acceptance1440 (three cases).

These report real color-contrast violations in Overview/Map, not selector errors.
Examples: white on #00a9cc (2.78:1), #00a5dc on white (2.83:1), white on #008cac
(3.92:1), #0a89f3 on #eaf5ff (3.22:1), #9b6a00 on #fff7de (4.40:1).
User previously required the exact Figma colors. No palette change, AXE disable,
allowlist, skipped test or blanket timeout increase is made to hide these failures.
Palette correction requires a separate user decision; PR is not all-green.
