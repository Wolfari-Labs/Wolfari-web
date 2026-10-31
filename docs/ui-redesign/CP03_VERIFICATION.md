# CP03 verification log

Date30/10/2026. Branch `draft/demo-ui-ux`, base HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`. All commands run from Wolfari-web with Node24.19.0 / `corepack pnpm`10.34.5. Local browser checks use test-owned Vite/Chromium and fixtures or HTTP mocks; no live Backend mutations. CP02 waived review harness is not reopened.

## Before source changes

| Check | Result / evidence |
|---|---|
| Original `corepack pnpm lint` | FAIL6358; archived `.local/cp01-baseline/build-production` compiled JS and `.local/cp02-review-vite` dependency cache were being linted. |
| Lint with only those two generated directories excluded | PASS. Config now names those directories; no blanket ignore of `.local` or docs source/scripts. |
| `corepack pnpm typecheck` | PASS. |
| `corepack pnpm test` | PASS44 files /545 tests, `.local/cp03-baseline/unit.log`. |
| `corepack pnpm build` | PASS, `.local/cp03-baseline/build.log`; `build-sizes.json` contains actual JS/CSS byte and gzip sizes. Not runtime performance. |
| Fixture E2E, workers1 |158 PASS /8 FAIL of166 (11.1min), `.local/cp03-baseline/fixture.log` and `fixture/`. Cloud2560/1101 NaN; Auth820/768 timeout; Packing drawer and Plan1366×600/1366×520/1024×600 failures. All occurred before source edits; detailed diagnosis below/postchange comparisons. No retries/time-limit changes. |
| Gateway HTTP-mock E2E, workers1 |49 PASS /2 FAIL of51 (8.7min), `.local/cp03-baseline/gateway.log` and `gateway/`. Profile fields missing in UI sweeps1440×900 and402×874. No live Backend. |

## Inherited failure diagnosis

CP01 evidence is preserved. Current serial suites diagnose behavior before changes; workers1 applies to each suite, the fixture and mock suites run concurrently on independent servers/cache modes. This does not isolate every machine resource variable.

- B01: source test reads `naturalWidth / naturalHeight` without waiting for image readiness. `document.fonts.ready` only waits for fonts; Home mounts after route lazy import, so eager cloud images may still be decoding. Reproduced before CP03 source changes at2560px with NaN; the assumption is a test readiness race, not demonstrated CSS distortion. Fix by awaiting positive intrinsic dimensions before retaining the exact ratio/coverage assertions. Do not increase timeout or delete assertions.
- B02–B08: prior saved contexts contain loading/unfinished navigation, not proof of clipped/missing design content. Prior fixture suite has no trace to prove original module/network timing. Current reproduction result will be recorded; no claim that lower concurrency alone proves root cause.
- B09–B12: inspected prior Gateway trace events without copying request payloads into docs. Auth csrf401 is the fixture bootstrap path, not evidence of broken credentials. Profile/notification requests aborted on navigation/teardown must not be called Backend failures. Preserve original FAIL and report current reproduction separately.
- Current B10/B12 reproduction: Profile module graph is still loading in dev server when field assertion expires. In1440 trace, `/api/v1/me` succeeds200 at01:30:57 UTC; Profile TSX starts01:30:57.078 (767ms), its dependencies start01:30:59.418, Ui/SuccessToast imports start01:31:01.464 and remain unfinished at teardown. Snapshot shows Suspense loading; not a failed profile serializer or proven CSS issue. Diagnose by built-preview run as well as postchange dev evidence; do not increase5000ms assertions. B09 trip journey/B11 viewport768 now pass unchanged; historical causes are not fully proven by that pass.

## Postchange checks

- Initial unit548/548 PASS, typecheck/build PASS. Lint new-test empty destructuring corrected; rerun PASS.
- Initial focused browser13/19 PASS; five failures were inherited Alert contrast4.37:1, D22 approved text-only correction to danger4.66:1. Mouse→programmatic focus test corrected to actual keyboard Tab/Shift+Tab (focus-visible is modality dependent). Native200% browser zoom PASS with tabs.getZoom=2, doubled DPR/halved CSS viewport and root CSS zoom1; isolated profile now outside watched workspace.
- Second diagnostic grid run retains Alert failures while collecting screenshots; accumulated grid+Auth actions hit30s or route module readiness. Split them into independent named grid/Auth cases, keep all assertions/default timeouts. No application loading changes.
- Production Gateway run50/51 PASS; all six UI/axe sweeps including prior Profile failures pass on built assets. Single invitation failure diagnosed exactly: mock hardcoded one-time link origin5174, while isolated preview runs5194; unchanged production decoder correctly rejects cross-origin link and displays unknown. Test fixture now derives link from intercepted request URL origin; no repository/security weakening. Targeted rerun confirmed same mock failure before correction. Final rerun required.

Gateway final: **51/51 PASS**, production assets5194, `.local/cp03-verification/gateway-final.log`,3.5min. Fixture full run **178/179 PASS** (6min), only lazy-module interception test failed because it matched dev `/src/features/plan/PlanPage.tsx` but built server requests hashed `/assets/PlanPage-*.js`. Test matcher now covers both exact module forms; retains gate/release/old-route/focus/scroll assertions. Focused rerun required, no application route changes or skipped test. Native browser200% zoom behavioral assertions PASS; initial Playwright CSS-clip screenshots were blank/cropped despite DOM geometry PASS, not accepted as visual proof. Raw browser-surface CDP screenshot added; retain initial captures. Manual screen-reader and live Backend remain NOT_RUN.

Build observation (same Node zlib.gzipSync procedure, all emitted JS/CSS assets): prechange481706 bytes gzip, final482921 bytes, delta1215 bytes/+0.252%. Not initial route transfer, LCP/CLS/INP or approved PERF01 SLA. No dependency changes.

Test-harness diagnostics: `defineConfig(base, overrides)` concatenated webServer entries, starting both original dev and built preview server; built tests still used explicit5193/5194 baseURL. An attempted concurrent focused dev run/zoom rerun correctly failed port preflight without running tests. Preview configs now spread base properties and override webServer/use explicitly, avoiding unnecessary original dev server. No unrelated process killed or port reused blindly.

## Final disposition — READY_FOR_REVIEW / STOP

Historical verification disposition at the end of CP-03 implementation. User approval D23 on30/10/2026 subsequently changed checkpoint status to **APPROVED / DONE** and authorized CP-04; it did not change any test result, failure or NOT_RUN item below.

- `corepack pnpm exec playwright test design-system.spec.ts foundations-cp03.spec.ts foundations-zoom.spec.ts --workers=1 --reporter=line --output=.local/cp03-verification/foundations-dev-final-v2`: **24/24 PASS**,54s. This is dev fixture, not live Backend.
- `corepack pnpm exec playwright test app-shell.spec.ts foundations-zoom.spec.ts foundations-cp03.spec.ts --config playwright.cp03-fixture-preview.config.ts --workers=1 --reporter=line --output=.local/cp03-verification/fixture-final-focused`: **40/40 PASS**,1.4min; includes the formerly failing lazy-Plan case with built chunk matcher and all app-shell boundaries. `lazy-plan-dev.log` additionally **1/1 PASS**,8.9s with the same corrected matcher in dev. No full-suite rerun after this test-only fix, so full result stays178/179 plus focused repair evidence.
- Final `lint-final-v3.log` and `typecheck-final-v2.log`: PASS. Production build final `build-v2.log` PASS; preview `build-fixture.log` PASS. Unit548 PASS remains applicable; subsequent application edit was D22 CSS only, tested by axe/browser.
- Raw native zoom screenshot capture inspected: overlay/actions and focused Auth field readable; no page overflow per runtime geometry. `native-zoom.json`: factor2, width1418→709, DPR1→2, CSS zoom1. Mild inherited left focus-ring edge clipping in popup recorded for future polish, not hidden.
- Contrast computed from CSS tokens: ink9.409, muted5.158, field-error5.378, danger5.729, errorAlert/peach4.660, focus5.969,101 sampled gradient colors min4.705. Grid axe reports zero violations at all five sizes after D22; not exhaustive AA certification or all-state gradient proof.
- Reviewed/copied8 representative PNGs plus zoom/contrast JSON; copies SHA256 verified. [Evidence index](evidence/cp03/README.md). All failed/prechange logs remain preserved.
- App/infrastructure/validators/repositories/package/lock diff remains empty; no Backend/Figma writes, no commit/push. [Acceptance](CP03_ACCEPTANCE.md) records remaining NOT_RUN scope. CP03 READY_FOR_REVIEW; STOP before CP04.
- Final documentation audit: inventory/link verifier PASS38 Markdown/299 local links/22 routes; original inventory totals and6 CP01 baseline hashes unchanged. Strict UTF-8/replacement/conflict/trailing-whitespace scan39 files (38 Markdown + AGENTS) PASS. `git diff --check` PASS; branch/HEAD unchanged. Test-owned ports5173/5174/5193/5194 no longer listening after runners exit. No data/evidence deletion.
