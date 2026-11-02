# CP11 — Verification log (02/11/2026)

Status: **BLOCKED_USER / BLOCKED_TOOL — residual visual/manual/live QA after D55**, not acceptance. After final compact-name/denied-Drawer source edits, fresh full unit578/578, built Gateway HTTP-mock126/126 and Preview fixture208/208 PASS/exit0. Current local lab8/8,40 samples PASS/exit0, with bounded comparison to historical post-A01 lab. A01–A05 approved/verified; shell label/name finding fixed in current CP06 default axe scans. Direct full source comparison/manual/live/CI/device remain. Branch `draft/demo-ui-ux`, HEAD `f1b2dcf685ee3d09f91de6d5ac68407f35fc55d6` (changed externally; agent did not commit/push). CP10 approval is D48; failures retained below.

## D55 — Full current-source gates and local lab

- `corepack pnpm exec vitest run`: **48 files/578 tests PASS**, clean exit0, report `.local/cp11-d54-unit.json`. Built Gateway HTTP-mock `CP11_TEST_MODE=gateway` full **126/126 PASS**, clean exit0,4.1min, `.local/cp11-d54-full-gateway.json`. Built Preview fixture `CP11_TEST_MODE=fixture` full **208/208 PASS**, clean exit0,4.6min, `.local/cp11-d54-full-fixture.json`. These runs use final source after D54. [D55 run summary](evidence/cp11/run-summary-d54.json) records separate counts, statuses and SHA-256 hashes; it does not combine runs into a fictitious suite. Prior D53 full results remain historical. Inventory/link verifier after dossier update **PASS76 Markdown/801 local links/22 routes**, six baseline hashes unchanged; `git diff --check` PASS.
- Fresh current-source lab `CP11_RUN_TAG=lab-d54`: **8/8 PASS**, clean exit0,40 samples, `.local/cp11-lab-d54-lab.json`. [Lab comparison](evidence/cp11/runtime-lab-d54.json) pairs current five samples per route/width with historical post-A01 five samples, not a simultaneous production A/B test. [Static payload](evidence/cp11/build-payload-d54.json) measured current Gateway manifest: Home177113B/Auth198313B/Plan311496B/Fund236832B local gzip JS/CSS closures;119 emitted assets5896577B. These are not browser wire bytes, production p75/INP or approved SLA. Details/ranges in [performance](CP11_PERFORMANCE.md).
- Full direct Figma/runtime visual review still BLOCKED_TOOL (CUA browser host unavailable); live Gateway13000/Docker Desktop Linux engine unavailable, so isolated live/demo E2E NOT_RUN. Manual screen reader, CI and physical-device review NOT_RUN. Full automated PASS does not imply release readiness or a checkpoint waiver.

## D54 — Final compact-name and denied-Drawer correction (historical focused handoff)

- In Web769–1100, visible account initials remain part of the profile link accessible name even when the visible account name is hidden. `AccountMenu` and its `AppShell` Suspense fallback now include visually hidden `profileCompactName` alongside purpose text; this corrects the compact-width name issue without a new route, menu action or design direction. Trip Drawer keeps real Trip list/Profile links for an authenticated viewer with `canReadTrip=false`; workspace items remain disabled. The denied-route test now clicks Trip list and checks route, Drawer close and focus on main.
- Fresh production and Preview builds, lint, typecheck and scoped Prettier PASS after these edits. Shell-navigation unit **7/7 PASS**. Built Gateway HTTP-mock CP06 default all-rules axe **5/5 zero violations**, including820×900 and1366×520 (`.local/cp11-compact-gate-gateway.json`). Built Preview fixture workspace boundaries **9/9 PASS** (`.local/cp11-compact-shell-fixture.json`), denied Trip routes **3/3 PASS** (`.local/cp11-compact-denied-nav-fixture.json`), and Drawer composition **1/1 PASS** (`.local/cp11-compact-drawer-fixture.json`). Inventory/link verifier **PASS76 Markdown/778 local links/22 routes** and `git diff --check` PASS at this snapshot. These focused results preceded the D55 full reruns; they must remain separate from D53 pre-fix full results.
- Web820/1366 local test screenshots opened/inspected. CUA `getState` on02/11 reported `browsers: []` and browser access host unavailable, so direct full Figma/runtime visual review remains BLOCKED_TOOL. `test:e2e:live` needs Gateway at `http://127.0.0.1:13000` but no listener was present. Isolated `test:e2e:demo1` requires Docker Desktop Linux engine; `docker info`/`docker ps` exited1 with missing `dockerDesktopLinuxEngine` pipe. These live checks are **NOT_RUN**, not FAIL/PASS; no legacy suite run on personal data. Manual screen reader/CI/physical device remain NOT_RUN. The80-sample lab is pre-D52 history.

## D52/D53 — Bốn work units UX đã duyệt (trước D54)

- A02: shell Menu/profile accessible names corrected. Default all-rules CP06 composition scan five Web viewports now **5/5 zero violations**, full Gateway126/126 PASS. Historical five scans/seven nodes remain in `evidence/cp11/shell-label-findings.json`. Desktop profile natural content name + visually hidden purpose avoids hiding visible avatar initials from the rule; responsive CSS selector still hides account name at intermediate widths.
- A03: Trip Drawer has Trip list/Profile links before workspace items, retaining close/focus behavior. Shell unit7/7 PASS; built Preview Drawer/focus/reflow checks included in208/208. Updated nine-link historical matcher to eleven with explicit route assertions.
- A04: Settings read-only summary instead of four disabled inputs, one capability note, cover preview without disabled action. Settings unit16/16 PASS; Gateway Trip and Preview Settings cases PASS. No update payload or conflict/unknown logic changed.
- A05: Gateway timezone Select presets plus custom IANA. Create unit7/7 PASS, including America/New_York DST transition date conversion and uncertain intent reload/retry; demo E2E selector updated but live demo NOT_RUN. Gateway Create/Trip tests PASS.
- Full lint/typecheck, scoped Prettier and production/Preview builds PASS; full Vitest **48 files/578 tests PASS**. Built Gateway HTTP-mock **126/126 PASS**, tag `remediation-full`, `.local/cp11-remediation-full-gateway.json`; after the responsive CSS selector correction, Gateway Plan/Identity/acceptance **32/32 PASS**, tag `remediation-css`, `.local/cp11-remediation-css-gateway.json`. Built fixture **208/208 PASS**, tag `remediation-final`, `.local/cp11-remediation-final-fixture.json`. Browser test screenshots Gateway Create402 and Preview Settings edit402 opened/inspected. These are D53 local/test checks before the D54 source edits, not direct full Figma comparison or live Backend.
- Failure history: initial Gateway focused25/25 FAIL at login/reset because first copied build used fixture mode. Rebuilt with `VITE_DATA_MODE=gateway`; focused25/25 and full126/126 PASS. First Preview full204/208: header profile link hidden at1024/820 after adding sr-only span, Drawer count still9, Map overflow at769 due CSS `span:last-child` hiding the wrong element. Corrected `.accountName` selector and count/assertions; focused AppShell/Map41/41 then full208/208 PASS. No timeout increase, axe rule disable or Backend edit.
- Browser host remains unavailable for direct source comparison. Manual screen reader, live Backend, CI and physical device NOT_RUN. Performance lab in `CP11_PERFORMANCE.md` compares pre-A01/A01 only; it is not a post-D52 measurement or production SLA.
- Documentation integrity after D52: `verify-inventory.mjs` **PASS76 Markdown/776 local links/22 routes**, six copied baseline image hashes unchanged; strict UTF-8/replacement/conflict scan77 files PASS, `git diff --check` PASS. Backend worktree clean; package/lock/infrastructure diff absent. HEAD moved externally from `f6e1b42` to `f1b2dcf` during this implementation; no agent commit/push.

## W01 — Baseline and resume

- Activation checkout was clean; resume contains only the existing CP10 closeout/CP11 activation documents. Backend `feat/demo-1-backend` is clean. User report is preserved; no dependency/API/Figma/history mutation.
- Earlier sessions 44290/67603/3881 are no longer addressable. Do not infer their process exits. `.local/cp11-baseline-fixture/.last-run.json` reports `passed` with zero failed IDs; the started inventory was206. This is recovered artifact evidence, not a newly observed clean206-test process exit.
- Earlier full unit baseline: **576/577**, first `trip-map-nearby` provider-error test failed; Preview build2930 modules PASS with manifest at `.local/cp11-baseline-preview/.vite/manifest.json`. These results are retained from activation, not rerun claims.
- Resume `corepack pnpm lint` followed by `corepack pnpm typecheck`: **PASS, exit0**.
- Resume `corepack pnpm build --outDir .local/cp11-production --manifest`: **PASS**,2911 modules. Build duration is not UX latency.
- `corepack pnpm test -- tests/trip-map-nearby.test.tsx` reproduced **3/4, provider error FAIL**. Process remained alive after tests and was interrupted; exit1, not clean completion.
- Product Design Audit preflight: no saved context. Direct browser capture unavailable: current CUA reports `The browser access host is unavailable`; native app pipe unavailable. Prior activation reported local browser disabled. No bypass or complete visual audit claim. Repository fixture/HTTP-mock tests remain a separate authorized engineering gate, not live Backend or manual review.

## W03-A — Map test synchronization

Only `tests/trip-map-nearby.test.tsx` changed. The regression test now observes saved-list readiness, waits for the real debounced provider invocation, then explicitly rejects its controlled promise inside `act`. It checks all six saved places before/after failure, no fabricated suggestion and no storage write. `finally` disposes the router on failure as well as success. No global/local timeout increase, production timer change or removed error assertion.

- `corepack pnpm exec vitest run tests/trip-map-nearby.test.tsx`: **4/4 PASS**, clean exit0.
- `corepack pnpm exec vitest run --reporter=default --reporter=json --outputFile=.local/cp11-unit-final.json`: **48/48 files,577/577 tests PASS**, clean exit0,120.46s. Historical baseline576/577 stays FAIL; this is a separate post-correction gate.
- `corepack pnpm test:e2e:gateway --workers=2 --reporter=line --output=.local/cp11-resume-gateway`: **116/123 PASS,7 FAIL**, clean exit1,11.7min. One cumulative Members test timeout; six cross-route cases still expected the pre-CP07 Map empty heading rather than the current status message. Desktop case additionally reports a real Plan breadcrumb contrast failure2.96:1; that finding remains open, not suppressed.

## W02-A / W05-A — Code disposition and build measurements

- [20 findings and22-route mapping](CP11_REVIEW_DISPOSITION.md) complete as code/test audit; direct visual half remains blocked. No new visual delta implemented.
- `node docs/ui-redesign/evidence/cp11/measure-build.mjs .local/cp11-production docs/ui-redesign/evidence/cp11/build-payload.json`: PASS; Node local gzip of entry+route static JS/CSS closures: Home176926B, Auth198122B, Plan311297B, Fund236632B. Manifest SHA/source chunks/full limitations in JSON. These are not actual request graphs or runtime timing; nested dynamic chunks and images/fonts excluded from route sums.
- 119 emitted assets total5893208B. Largest image `06bd1.png`2698783B is imported by `CreateTripPage.tsx`; `16cac.png`475435B by Map. Emitted bytes do not prove downloaded bytes on any route. No compression/replacement applied without measured runtime/fidelity gate.
- Heuristic production JS marker scan found zero `fixtureViewerId`/`previewTripId`/`createFixtureTripRepository` hits. This is not proof all Preview UI code is tree-shaken; repository-selector source and behavior remain authoritative.

## W03-B — Members policy test isolation (verification pending)

Full dev Gateway run123 cases exposed a30s cumulative test timeout in the combined Member/SELECTED/OWNER_ONLY/archive case, during the final navigation. Trace shows login4.137s, member navigation1.819s, owner navigation4.868s, reload5.318s; selected IDs/write bodies/inactive-assignment checks completed before the final archived navigation. This is not evidence that archived authorization failed.

The independent Member and archived read-only cases are now separate tests, each also asserting zero policy PUTs; SELECTED→OWNER_ONLY→reload retains the original ID/body/persistence checks. No global/test timeout increase, removed assertion or application permission change. Gateway inventory becomes125. Focused/full recovery results still pending.

Focused dev recovery `members-policy.spec.ts --grep 'SELECTED uses|Member cannot|archived Trip' --workers=1`: **0/3, exit1**. Failures now occurred at login navigation, profile readiness and the lazy Members loading boundary respectively, before the targeted assertions; concurrent fixture suite was running. Trace/context retained at `.local/cp11-members-recovery`. Do not claim test isolation fixed dev-server load reliability. Next verification uses built assets and bounded workers, separately labeled; dev instability remains a limitation even if built passes.

Added two fixture regression cases (Web402/320) for skip-link offscreen idle, on-focus exposure, Enter→main and hidden after invalid form focuses the name field. Fixture inventory becomes208. These are automated geometry/focus assertions, not a completed direct visual audit.

## W04 — Built fixture gate

`CP11_TEST_MODE=fixture; corepack pnpm exec playwright test --config docs/ui-redesign/evidence/cp11/playwright-built.config.ts --workers=2`: **208/208 PASS**, clean exit0,4.7min. JSON `.local/cp11-built-fixture.json`; artifacts `.local/cp11-built-fixture/`. Includes both new skip-link cases, sidebar heights520–990, sampled axe/contrast, keyboard/focus, reduced motion and native Chrome200% extension cases (CP03/04/05). This uses the retained Preview build; application source has no CP11 changes. It is not the earlier recovered206-case artifact, live Backend or a manual audit.

Fresh `corepack pnpm build:preview --outDir .local/cp11-preview-verified --manifest`: **PASS**,2930 modules. Full recursive SHA256 comparison with the tested `.local/cp11-baseline-preview`:146 files on both sides, zero differences. This verifies the tested assets match a fresh current-source build; no rerun claim on a different build.

## W03-C — Stale Map matcher and visible contrast gate

`ui-acceptance.spec.ts` now expects the CP07 `role=status` text “Chuyến đi chưa có địa điểm đã lưu.” instead of a removed heading. Source and failed screenshot/context confirm the existing status; no runtime copy/role change. The assertion remains specific to the empty Map. Axe violations are written per scanned route for reproducibility; `expect.soft(...).toEqual([])` remains unchanged, including the Plan color failure.

Current automated HTTP-mock desktop snapshot `ui-acceptance-Gateway-visual-and-accessibility-1440x900/plan.png` was opened and inspected: correct Plan1440×900 with the breadcrumb and Settings visible. This is an automated-test snapshot review only, not direct CUA/full visual comparison. Proposed breadcrumb correction must await separate D17 approval.

## W04 — Built Gateway and final recovery

- `CP11_TEST_MODE=gateway; corepack pnpm exec playwright test --config docs/ui-redesign/evidence/cp11/playwright-built.config.ts --workers=2`: **124/125 PASS,1 FAIL**, clean exit1,4.2min. Sole failure: Plan breadcrumb2.96:1 at1440×900. Every cross-route navigation completed after the Map matcher correction.38 persisted axe JSON artifacts contain one violating node overall; this is sampled scope, not all-state accessibility certification.
- Existing CP07 Map/Dress/Packing and CP08 Members/invitation/policy/recipient native Chrome200% tests PASS in this HTTP-mock run. Gateway Plan only has CSS2× test here, not native zoom; its native gate stays NOT_RUN.
- Final Member test strengthened to await the roster’s actual member name rather than the header account name before negative permission assertions. Built focused command `members-policy.spec.ts --grep 'SELECTED uses|Member cannot|archived Trip' --workers=1 --reporter=line --output=.local/cp11-built-members-final`: **3/3 PASS**, clean exit0,13.4s. This final tiny test-only strengthening was after the full125-case run; no claim of a second full run or125/125.
- Final lint/typecheck and scoped Prettier **PASS**. Repeated Map focused test after formatting **4/4 PASS**. [Sanitized per-run results](evidence/cp11/run-summary.json) preserve unit/fixture/Gateway totals and report hashes; no credentials/request bodies copied. [Raw Plan axe failure](evidence/cp11/plan-breadcrumb-axe.json) remains open.
- Report SHA256 `a4ce16640e640fabe24c5f8efea4604c6fd4e365a1b0f9ae641ee40e18540635` unchanged; application/package/lock diff empty, Backend clean, no history changes. Test servers close with runners; no unrelated processes terminated.

## Remaining gates (handoff)

Final inventory/link verifier **PASS75 Markdown/733 local links/22 routes**; official counts and six CP01 screenshot hashes unchanged. `git diff --check` PASS (CRLF notices only). Final worktree includes documentation/evidence and four test files only; no application/dependency/Backend mutation. Test-owned Vite/Playwright runners ended; unrelated CUA processes preserved.

Fresh direct visual comparison/manual keyboard/screen-reader audit, live Backend/provider/notification delivery, CI, physical-device checks and runtime performance are **NOT_RUN**. Automated browser results must identify fixture vs HTTP-mock and viewport; they cannot waive these limits. Pending D17 visual deltas and CP09 deferred work remain pending.

## D50 post-approval pass — IN_PROGRESS

User approved CP11-A01 in direct response and requested completion. Only application diff is `.breadcrumb a` in Plan CSS: existing #079fc5→existing #006b92; no geometry/behavior/contract change. Pre-fix artifacts and runs above remain historical evidence.

- Fresh production/Preview builds at `.local/cp11-a01-production` and `.local/cp11-a01-preview`: PASS2911/2930 modules. Lint/typecheck PASS; native-zoom harness initially needed an explicit `baseURL` guard under exact optional types; fixed and typecheck rerun PASS. Standalone TypeScript check of lab harness also PASS.
- Fresh full unit **577/577,48 files PASS**,157.81s, `.local/cp11-a01-unit.json`, clean exit0.
- New native Plan zoom test uses the existing isolated browser extension (not CSS zoom); all Gateway tests126 running with post-A01 build. Cross-route tests now assert actual breadcrumb computed RGB and save color evidence while retaining zero-axe-violations assertions.
- Added an isolated laboratory suite outside normal E2E testDir: Home/Auth/Plan/Fund × Web1440/402 ×5 samples, cache-disabled target navigation, HTTP mocks, fixed observation window and Event Timing. Before/after runtime measurement pending; not live Backend or production Web Vitals.
- Direct CUA retry still reports browser access host/native pipe unavailable. Automated tests do not bypass user-browser access; direct audit/manual scope remains unavailable, not silently waived by D50.

### W03-D / W04 first post-A01 outcome

`CP11_TEST_MODE=gateway; CP11_RUN_TAG=a01; CP11_BUILD_DIR=.local/cp11-a01-production` with built config/workers2: **121/126 PASS,5 FAIL**, clean exit1,4.6min. All five failures are CP06 composition assertions that still required `color-contrast` to be present. Actual violations contain only `label-content-name-mismatch`; no color-contrast finding. Updated the obsolete expected IDs to exactly the remaining baseline rule, not disabled/suppressed axe; separate full rerun `a01-final` pending.

Raw remaining findings: desktop820/1366/1440 profile link contains visible initials `TG` plus account name; narrow320/402 has profile initials and visible `Menu` button with aria-label “Mở điều hướng chuyến đi”. These are existing shell findings recorded at CP06, not introduced by A01. Default all-rules CP06 scans retain them; selected-tag cross-route scans do not establish full axe cleanliness. No shell accessible-name/interaction change was bundled into color approval.

Native Gateway Plan zoom **PASS** in this run: actual Chrome factor2, width1418→709 CSS px, DPR1→2 and CSS zoom1. Keyboard opens editor, scroll reaches Save in viewport, no horizontal overflow, Escape returns focus; zero Trip writes. Artifact path `.local/cp11-a01-gateway/cp11-plan-native-zoom-CP11-bcc27--fit-native-Chrome-200-zoom/`. This is new HTTP-mock evidence, not retroactive alteration of CP06 NOT_RUN.

Breadcrumb sampled browser colors are `rgb(0,107,146)` on body `rgb(244,251,254)`; sRGB contrast5.7066:1 with those computed colors, and existing axe assertion passes. [Post-A01 static payload](evidence/cp11/build-payload-a01.json) retains exact hashes/sizes; total emitted bytes5893216 (+8), no performance improvement inferred from token change.

### W04 Gateway post-A01 final

`CP11_TEST_MODE=gateway; CP11_RUN_TAG=a01-final; CP11_BUILD_DIR=.local/cp11-a01-production; corepack pnpm exec playwright test --config docs/ui-redesign/evidence/cp11/playwright-built.config.ts --workers=2`: **126/126 PASS**, clean exit0,4.5min. Report `.local/cp11-a01-final-gateway.json`. This is one full run, not combined focused results. Default CP06 scans still explicitly retain the baseline label/name rule; test-suite PASS is not full WCAG compliance.

`collect-a01.mjs` copies bounded post-fix evidence and extracts all five default-rule findings from inline attachments; [hash manifest](evidence/cp11/a01-evidence-sha256.json). Desktop Plan screenshot and native-zoom editor screenshot were opened/inspected: breadcrumb visible, Settings unobscured; zoom editor has reachable footer/Save. This is test-snapshot inspection, not direct full visual/source audit. No request bodies or test credentials copied.

Final lint/typecheck and standalone TS check of lab config/harness **PASS**. Full post-fix Preview fixture and lab before/after are next; historical test outcomes above remain unchanged.

### W04 Preview post-A01 final

`CP11_TEST_MODE=fixture; CP11_RUN_TAG=a01-final; CP11_BUILD_DIR=.local/cp11-a01-preview; corepack pnpm exec playwright test --config docs/ui-redesign/evidence/cp11/playwright-built.config.ts --workers=2`: **208/208 PASS**, clean exit0,5.1min. Report `.local/cp11-a01-final-fixture.json`. All post-A01 full unit/Gateway/fixture suites now have clean observed exits. This does not erase dev failures, default-rule shell findings or unrun manual/live gates.

### W05 laboratory and W06 handoff

Before/after lab runs **8/8 each PASS**, clean exit0,89.92s/90.84s; total80 samples. [Performance report](CP11_PERFORMANCE.md) specifies both build identities, method, actual medians/ranges, resource lists and Event Timing limits. No runtime optimization or production SLA claim. Source CSS-only token difference remains; no Backend/dependency/integration edits.

Post-fix desktop1440/narrow402/native200% screenshots opened and inspected, seven bounded evidence hashes verified7/7. Native Plan200% gap is now covered by HTTP-mock evidence; direct full visual/source comparison is still blocked by CUA host availability. Current all-rules shell finding and manual/live/CI/physical-device limits are explicitly listed in [acceptance](CP11_ACCEPTANCE.md), not waived by D50. Checkpoint cannot be marked DONE without completing remaining gates or explicit exception acceptance.

Final dossier checks: inventory/link verifier **PASS76 Markdown/767 local links/22 routes**, six CP01 baseline image hashes unchanged. Strict UTF-8/trailing-whitespace/conflict scan **77 Markdown including AGENTS PASS**; initial one-line scanner invocation failed at PowerShell quoting before reading files, corrected read-only invocation PASS. `git diff --check` PASS (CRLF notices only). Seven bounded evidence hashes plus nine raw-report hashes **16/16 PASS**; lab raw sample count80 confirmed. Scoped Prettier PASS. Git HEAD/branch unchanged; only application path changed is Plan CSS, one token; package/lock untouched, Backend clean, user report SHA unchanged. All test runners observed clean completion; no commit/push/deployment or official Figma writes. Handoff STOP at residual QA decision, not checkpoint completion.
