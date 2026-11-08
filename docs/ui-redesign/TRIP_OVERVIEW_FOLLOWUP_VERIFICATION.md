# Trip overview follow-up — 08/11/2026

Status: IMPLEMENTED / READY_FOR_REVIEW_WITH_CONTRAST_LIMITATION.
Requested maintenance only; no new checkpoint or release. This supersedes the
07/11 overview report only for navigation, summaries, progress and overview colors.

## Requested changes

- Function cards use native route links across their surface: daily itinerary,
  fund, packing, itinerary, map and fare tracking. Keyboard Enter, middle-click
  and visible focus work. Activity rows also link to Plan. Day selection, retries
  and the scrollable itinerary remain independent controls. Weather remains a
  truthful unavailable summary: no weather route exists to navigate to.
- Fund shows only current ledger balance, its ratio to the budget and a progress
  bar. Ratio arithmetic uses BigInt; int64 amounts are not converted to Number.
  Over-budget text retains the real ratio while the fill caps at 100%. Missing
  fund/budget and zero budget show an unmeasured track, not fabricated progress.
  The percentage is **balance / budget**, not expenditure or contribution completion.
- Packing always renders a track for a successful read, including zero items.
  Loading, errors, denied access and stale plan versions remain distinct.
- Fare empty copy is exactly **Chưa có dữ liệu**. Runtime summary reads the
  existing repository with the same infinite-query key as the feature page.
  Nonempty data shows a compact watch count, a `+` when more pages exist and the
  MOCK_FLIGHT source label, never a fabricated/live fare. Read failures retain retry.
- Map has only **Xem bản đồ địa điểm**, stretched across the card; the redundant
  detail link and explanation were removed. Source map artwork remains labelled
  **Minh họa**, not claimed to be the real trip route.
- Restored exact Figma colors for KPI headings/values/secondary text, selected
  day cyan, itinerary times/durations and detail links. Progress tracks are
  #e7ebee, fill #3acd62, height12px. Colors are scoped to the overview variant.
  Header/sidebar/shared Plan banner are unchanged by this follow-up.

## Design evidence

Used the Figma design-to-code skill and fresh high-fidelity context for
[KPI1192:7175](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=1192-7175)
and [itinerary1192:7206](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=1192-7206).
Reused the existing local original assets and Nunito fonts; no asset substitution,
new image generation, dependency change or Figma write. Source sample numbers
are used only in explicitly labelled HTTP mock tests, not runtime defaults.
Inspected populated Gateway screenshots at1440×960 and1440×700; retained source
card layers and confirmed both progress bars fit without internal card overflow.
Existing image tests check local URLs, successful loads and nonzero rendered sizes.

## Final verification

- Typecheck, full ESLint, production build and Preview build: PASS.
- Scoped unit/component: **90/90 PASS** across trip-overview, overview-fund-summary,
  plan-preview, plan-metrics, preparation and shell-navigation; maxWorkers2.
- Gateway HTTP mocks: **10/10 PASS**, including empty/populated fund, short-height
  progress geometry, zero packing, independent errors/retries, fare empty/nonempty
  pagination semantics and guarded trip reads. No trip writes.
- Preview E2E: **27 PASS / 1 FAIL**, both dev and final built Preview. All27 layout,
  navigation, keyboard/middle-click, day-selection, image and banner cases pass.
  The one failure is the unchanged zero-AXE-violations assertion for source colors.
  No AXE rule was disabled, skipped or converted into an expected pass.
- Fifteen viewport sizes remain bounded with no document/main horizontal or
  vertical overflow. Narrow/short layouts use internal scrolling. Nine feature
  banners still match Plan exactly. Long itinerary scrolling remains available.
- Scoped formatting and `git diff --check`: PASS.

### Contrast limitation, not accessibility approval

Exact Figma cyan/white selected-day text measures2.78:1; cyan detail links on white
measure2.83:1 versus4.5:1 required by the automated check. Light secondary text
and times also have low contrast (the initial scan reported these; overlay links
can limit which text nodes subsequent automated scans measure). Final built scan
still reports `color-contrast`, with three offending nodes. The user's color
fidelity request is not a claim that WCAG passes. The former07/11 zero-violations
result remains historical only and must not be cited as current accessibility proof.

## Commands and artifacts

Used `node node_modules/typescript/bin/tsc --noEmit`,
`node node_modules/eslint/bin/eslint.js .`, scoped Vitest with `--maxWorkers 2`,
`node node_modules/vite/bin/vite.js build` and `build --mode preview`, and the
Playwright CLI with the overview specs. Final built Preview ran on temporary5184;
Gateway mocked server used5174. Reports/screenshots are in
[evidence/overview-20261108](evidence/overview-20261108/).
Temporary verification servers5183/5184 were stopped after the final checks.

Intermediate failures are not hidden: the first parallel unit run timed out3
tests under load (87/90), then both focused90-test reruns passed without timeout
changes. The first navigation test combined12 navigations into one30s case; split
into six independently verified route cases. Middle-click is verified through the
browser-context new-page event. Initial Gateway test mocks had registration-order
and missing-envelope-meta errors; fixed the test fixtures, not runtime validation,
then the full10-test run passed. Existing PostCSS missing-`from` build warning persists.

Live Backend/provider integration, full global suites, manual screen reader and
native browser200% zoom: NOT_RUN. No Backend, dependency, commit/push or deployment
changes. Prior worktree changes and unrelated Word document remain untouched.
