# CP-08 Web composition evidence

Captured 01/11/2026 on branch `draft/demo-ui-ux`, HEAD `6908b0b1b3debb5171dffdf358aa2029dc858172`, with existing CP-08 worktree changes. The after run used:

```powershell
corepack pnpm exec playwright test --config playwright.gateway.config.ts --output .local/cp08-composition-final tests/e2e-gateway/cp08-composition.spec.ts
```

Result: **24/24 PASS** (1.8 minutes), covering Members, Owner invitations, PlanEditPolicy and recipient invitation at 1440×960, 820×900, 768×1024, 402×874, 320×600 and 1366×520. `CP08_PHASE=before` supplied four earlier 1440×960 baseline captures from `.local/cp08-before` (4/4 PASS); the `before-*.png` files are those original browser captures. The 12 `*-full.png` files are selected after captures at 1440, 402 and 320. They show the running Web frontend in **Gateway mode with Playwright HTTP mocks**, not live Backend data or Figma exports. The recipient token is synthetic and is scrubbed from the URL before capture.

The composition suite asserts route visibility, no document horizontal overflow, primary/secondary panel stacking below 1100px, and no non-GET Trip API calls. It emulates reduced motion at five widths and normal motion at 402px; it does not measure animation timing. Eight `*-axe-route.json` files are scoped WCAG 2 A/AA and 2.1 AA scans for the four views at 1440 and 402; each contains **zero violations**. These scans do not establish full-page or manual screen-reader accessibility. Keyboard/focus and native zoom have separate evidence below. Mutation/recovery, Preview, live Backend, physical device, performance and CI require their own evidence or explicit `NOT_RUN` disposition.

## Native Chrome 200% zoom

The scoped [test](../../../../tests/e2e-gateway/cp08-native-zoom.spec.ts) used Chrome `tabs.setZoom(2)` with the repository's local test extension, retaining Gateway HTTP mocks. Its single scenario printed `ok` after checking Members, Owner invitations, PlanEditPolicy and recipient invitation at native 200% zoom: each view had no document horizontal overflow; keyboard focus/activation worked for the loaded-members checkbox, tab buttons, policy radio card and recipient accept button; the synthetic recipient token was scrubbed before capture; no membership or recipient mutation call was made. The copied [proof JSON](native-zoom.json) records `factor:2`, inner width `1418→709`, DPR `1→2` and CSS zoom `1`. The four `native-zoom-*.png` files are direct browser surface captures. Source and copied artifact hashes were compared and matched.

**Runner limit:** Playwright printed the scenario `ok` in 16.2 seconds but hung after the test, before its summary/clean exit. A bounded wait ended in Ctrl-C and process exit 1. This is one completed scenario with browser evidence, **not** a clean 1/1 suite PASS. A separate reporter-line attempt was interrupted for port coordination and provides no QA result. Native zoom evidence does not establish live Backend, screen-reader, physical-device, performance or CI behavior.

Historical failure: an earlier `.local/cp08-composition` run at 13:18 had two recipient axe failures (1440 and 402) for `link-in-text-block`: the Profile link was not distinguishable from surrounding text without color. Those `error-context.md` records remain in the ignored local output. The dedicated final run above passed both recipient cases and all 24 cases. Do not count the older run as PASS.

The [SHA-256 manifest](manifest.sha256) lists all 29 copied PNG/JSON artifacts, including five native zoom files. It excludes this README and itself. Source/output copies were matched by view and viewport; no generated screenshot was recreated or edited for this dossier.
