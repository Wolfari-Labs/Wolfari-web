# Price Watch layout maintenance — 07/11/2026

Status: READY_FOR_REVIEW. User-requested Web-only maintenance; historical CP10
acceptance and its exceptions remain unchanged. No commit or push.

## Implementation

- Compact vertical gaps (12px) and content-height cards; chart radius 6px.
- Create action sits right of the heading. The permanent form column is removed.
- Shared centered PriceWatchOverlay uses existing Drawer, Finance-style header,
  Back action, heading focus, Escape/focus return and narrow-screen scrolling.
- Runtime create/edit retain forms, permissions, commands, idempotency, versions
  and recovery. Recovery controls remain accessible inside overlay.
- Preview keeps fixture-only chart/data and truthful non-submitting form.

## Verification

- Typecheck, lint, production build and preview build: PASS.
- Price Watch form/repository unit tests: 5/5 PASS.
- Gateway HTTP-mock: 2/2 PASS (create/lost response/same-key retry/edit/pause/resume/stop,
  loaded observation retention after cursor error). Includes modal AXE, focus return,
  desktop geometry and 320px overflow checks.
- Preview fixture: 9/9 PASS; widths 1440, 1366, 1024, 820, 768, 402 and 320px,
  plus existing scenarios. Checks modal, chart radius, focus and no API calls.
- Screenshots reviewed: Preview desktop page, desktop overlay and 320px overlay.
  Narrow overlay reflows to one column and scrolls within the modal.
- Both builds retain the existing PostCSS missing `from` warning.
- Initial attempts had shell grep parsing, ambiguous heading selector and a
  loading/geometry race; commands/selectors/waits corrected before passing reruns.
- Live Backend/provider, full regression suite, manual screen reader and native
  200% zoom: NOT_RUN for this maintenance. HTTP mocks are not live integration.

Local screenshots: `test-results/finance-fixture/price-watch-preview-Price-Watch-preview-1440x800/`
and corresponding `320x600` directory; Gateway artifacts in `test-results/gateway/`.

Stop for user review; no additional checkpoint or Finance work.
