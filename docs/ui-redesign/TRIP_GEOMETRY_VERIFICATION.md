# Trip geometry refinement — 08/11/2026

User-requested maintenance: overview progress spacing, fare empty dash and common
content width for Fund/Price Watch. No new checkpoint or release.

## Implementation and reference

- Re-read Figma [KPI1192:7175](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=1192-7175)
  through the design-to-code skill, including its screenshot. Source cards are
  162px tall; the track starts at131px and is12px tall (19px bottom clearance).
  User explicitly requested20–25px: implementation now anchors both tracks22px
  from the outer card edge, with at least12px between normal copy and the track.
- Reuse OverviewProgress with a separate copy region and nonshrinking track.
  Keep cards162px even on short desktops instead of the old124px compression.
  Narrow/short overview still scrolls internally and never expands the document.
  Two-line headings at1101–1250px get32px amount line-height to retain the gap.
- Preview and Gateway empty fare summaries share the same em dash and concise
  **Chưa có dữ liệu** caption. Short-desktop top padding is removed so the newly
  added value does not push the caption below the card. Errors/retries and actual
  watch counts remain unchanged.
- Existing TripWorkspace geometry is the horizontal source of truth. Add an
  opt-in `fullWidth` class that overrides legacy caps/gutters while preserving
  each feature's vertical layout. Apply to Preview and Gateway Fund/Price Watch:
  full available width,18px left/22px right desktop,14px each side at≤768px.
  Plan's computed geometry is unchanged. Banner artwork, shell and sidebar stay intact.
- No new assets, dependencies, endpoints, financial calculations, mutations or
  permissions changes. Existing source assets remain local and unmodified.

## Verification

- Typecheck, full ESLint, scoped formatting, production/Preview builds and
  `git diff --check`: PASS. Existing PostCSS missing-`from` warning persists.
- Scoped unit30/30 PASS (trip-overview, overview-fund-summary, fund-repository,
  price-watch-form and price-watch-repository).
- Width comparison: Preview8/8 and Gateway HTTP-mock8/8 PASS. Hero edges match
  Plan within1px at1920 expanded/collapsed,1440,1200,820,768,402 and320px. Main and
  document have no horizontal overflow; rendered transaction/workspace bounds
  match the hero where present.
- Built Preview combined regression:53 PASS /1 FAIL across overview28, width8,
  Fund9 and Price Watch9. The only failure is the pre-existing source-color AXE
  contrast assertion, unchanged and not suppressed. This run precedes only the
  final short-height fare-padding correction; final overview rerun is recorded below.
- Gateway combined regression:22 PASS /1 timeout in the long Finance operations
  test under parallel load. Final single-worker rerun preserves its original30s
  timeout and includes the complete overview suite; see final results below.
- Initial new geometry assertions caught10px text-to-track clearance at1200/1101px;
  fixed line-height, then both focused cases passed. All15 overview viewport cases
  passed in the combined built run, with20–25px bottom and≥12px text gap assertions.
- Visual review: populated overview at1440×700; Fund and Price Watch at1920px;
  original card illustrations remain in their slots. Dynamic imagery/data retained.

## Final recovery and review

- Final built Preview overview after the short-height fare-padding fix:27 PASS /
  1 known source-color contrast FAIL. All geometry and empty-state checks pass.
  Report: [preview-final-overview.json](evidence/trip-geometry-20261108/preview-final-overview.json).
- Final single-worker Gateway HTTP-mock overview11 and Finance operations2:
  13/13 PASS, with the original30s timeout unchanged. This recovers the earlier
  parallel-load timeout, not a claim that the combined run had no failures.
  Report: [gateway-final-recovery.json](evidence/trip-geometry-20261108/gateway-final-recovery.json).
- Reviewed final1440×700 populated overview: both progress tracks have clear
  spacing; the fare dash and caption are fully visible. Reviewed1920px Price
  Watch screenshot: banner and workspace share the full-width content edges.
- Test-owned servers on5183/5184 stopped after verifying their process command
  lines. Pre-existing5173 listeners preserved. READY_FOR_REVIEW with the known
  contrast limitation; no release or checkpoint advancement.

## Evidence and limits

Reports and selected screenshots: [evidence/trip-geometry-20261108](evidence/trip-geometry-20261108/).
The overview color-contrast limitation from the preceding maintenance remains;
this task does not change colors or claim WCAG compliance. Live Backend/provider,
full global suites, native zoom and manual screen-reader verification: NOT_RUN.
No commit/push/Figma/Backend writes. Existing changes and the unrelated Word
document are preserved. User's pre-existing server on5173 is not modified.
