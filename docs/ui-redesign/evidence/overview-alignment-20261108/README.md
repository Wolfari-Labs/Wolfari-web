# Overview corners and columns — 08/11/2026

Explicit user-requested maintenance, not a new checkpoint or release.

- Scope:6px corners for overview cards/postcard/activity rows/map label/description
  popup; existing5–6px inner controls retained. Shared TripHero and shell unchanged.
- Keep KPI ratios277:277:286:305 and13px gaps, reuse for lower desktop grid with
  itinerary spanning two columns. Map/Fare now match Fund/Packing edges and widths.
  Existing narrow reflow remains; desktop alignment applies above1100px.
- Typecheck, full ESLint, scoped Prettier, production build and diff-check PASS.
  Scoped unit tests16/16 PASS. Existing PostCSS missing-from warning remains.
- Preview development suite27 PASS/1 known source-color AXE contrast FAIL, not
  suppressed. All15 viewport cases pass (320–2560px, including short heights);
  expanded/collapsed sidebar checks verify paired edges within1px and6px radii.
- Gateway development HTTP-mock suite11/11 PASS; no live Backend verification.
- Reviewed [Preview1440](preview-1440.png): aligned columns,6px corners, unchanged
  artwork/content/progress spacing. [Gateway1440](gateway-1440.png) and
  [collapsed sidebar](overview-collapsed.png) retained for review.
- Reports: [Preview](preview-results.json), [Gateway](gateway-results.json).
  Full global suites, built-server E2E and manual screen reader NOT_RUN.
  Earlier reports remain historical. No Backend/dependency/Figma writes or commits.
