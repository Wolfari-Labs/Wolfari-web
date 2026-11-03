# CP-10 evidence — ready for review

Checkpoint status: **READY_FOR_REVIEW**. Evidence here is from local HTTP-mock Gateway and Preview fixture runs on branch `draft/demo-ui-ux`, HEAD `4900d59aa079c1d6b23da359788ef9ddee7ffc81`, 01–02/11/2026. It does not demonstrate live Backend, production flight prices, email/push delivery or production Admin workflows. Source/test/docs remain uncommitted.

## Source and implementation boundary

Official Figma MCP design context: Price desktop `23:657`, responsive Web `781:6626`, Notifications `299:1926`, session `ff718cda-5fbe-4d48-80a5-a22e68047664`. Admin canvas metadata `194:1073` read; design context for canvas/child failed with selection/Transport closed. D18 approved only Price Watch form right desktop/below narrow Web; NTF01/ADM01 were explicitly approved in D45 and PWT01 observation rows instead of the unverified chart in D46. Runtime form uses existing `PriceWatchForm`, React/TypeScript/CSS Modules and shared tokens; no temporary Figma asset URL is embedded in app code.

## Focused runs

| Work | Command / mode | Result |
| --- | --- | --- |
| W01 unit baseline | `corepack pnpm exec vitest run tests/runtime-ui-contracts.test.ts tests/price-watch-form.test.tsx tests/price-watch-repository.test.ts tests/shell-navigation.test.tsx --maxWorkers=2 --reporter=dot` | **4 files / 20 tests PASS** on concurrent W03 draft snapshot. |
| W01 Gateway Price baseline | `corepack pnpm test:e2e:gateway tests/e2e-gateway/ui-upgrade.spec.ts --grep 'Price Watch create retries' --workers=1 --reporter=line --output=.local/cp10-w01-price-gateway` | **1/1 PASS**, before W02 placement edit; HTTP mock. |
| W01 Preview Price baseline | `corepack pnpm test:e2e tests/e2e/price-watch-preview.spec.ts --workers=1 --reporter=line --output=.local/cp10-w01-price-preview` | **9/9 PASS**, fixture at 1440/1366/1024/820/768/402/320 and provider-failure/capability cases. |
| W02/W03 Gateway focused | `corepack pnpm test:e2e:gateway tests/e2e-gateway/ui-upgrade.spec.ts --grep 'Inbox reads from API\|Price Watch create retries' --workers=1 --reporter=line --output=.local/cp10-w02w03-final` | **2/2 PASS**: Price create unknown→same idempotency key, edit expected_version, pause/resume/stop, desktop1440/right and Web900/below, Web402/320 no overflow; Inbox cursor retry/read and preferences body/version. |
| W03 notification unit | `corepack pnpm exec vitest run tests/notifications-cp10.test.tsx` | **3/3 PASS**: definite save rejection, unknown save/refetch, unknown mark-read/refetch. |
| W03 isolated Gateway | `corepack pnpm test:e2e:gateway tests/e2e-gateway/ui-upgrade.spec.ts --grep 'Inbox reads from API' --workers=1 --reporter=line --output=.local/cp10-notifications-gateway` | **1/1 PASS**, HTTP mock. |
| W04 Admin Gateway | `corepack pnpm test:e2e:gateway tests/e2e-gateway/admin-placeholder.spec.ts --workers=1 --reporter=line --output=.local/cp10-admin-gateway` | **2/2 PASS**: USER denied→ADMIN placeholder→USER denied, Web1440/402, keyboard/overflow and no Admin API. |
| W04 Preview/Admin unit | focused Admin Preview `tests/e2e/app-shell.spec.ts` **4/4 PASS**; `tests/shell-navigation.test.tsx` plus repository unit **21/21 PASS** | Fixture/unit; not live Backend. |
| W02 PWT01 Gateway observations final | `corepack pnpm test:e2e:gateway tests/e2e-gateway/price-observations-cp10.spec.ts --workers=1 --reporter=line --output=.local/cp10-pwt01-reduced-final` | **1/1 PASS** HTTP mock with reduced motion: initial-error retry, partial-page error retention/retry, exact opaque cursor, int64 display, source and observed/received time, loaded-only freshness, Web402 reflow, scoped axe0, reduced Drawer transition and Escape/focus return; no mutation. |

## W05 cross-checks

| Gate | Result and mode |
| --- | --- |
| Full `corepack pnpm lint` | **PASS** after the current `eslint.config.js` excludes generated `.local/**`; the earlier 5,713 generated-output errors remain historical. Repeated after the final PWT01 text/test edit. |
| Full `corepack pnpm typecheck` | **PASS**, repeated after the final PWT01 text/test edit. |
| Full `corepack pnpm test` / Vitest | **576/577 PASS, 1 FAIL** in 47/48 files. `tests/trip-map-nearby.test.tsx:81` expected provider error before its default 1-second wait; existing Preview Map was still loading. Map source/test have no CP10 diff. Focused default run **3/4 PASS**; read-only in-memory 5-second timeout probe **1/1 PASS**. This remains a failed full gate, not a CP10 unit PASS. |
| Production build | **PASS**: `corepack pnpm build --outDir .local/cp10-post-pwt01-prod` after final source edit. |
| Preview build | **PASS**: `corepack pnpm build:preview --outDir .local/cp10-post-pwt01-preview` after final source edit. |
| Relevant Gateway cohort | **6/6 PASS**, HTTP mock: `ui-upgrade.spec.ts`, `admin-placeholder.spec.ts`, `price-observations-cp10.spec.ts`, workers1, `--output=.local/cp10-final-reduced-motion-pass`. Inbox, Price lifecycle/observations and Admin cases ran with `reducedMotion: 'reduce'`; Price Drawer computed transition duration was at most 0.01ms, keyboard/focus/reflow/axe assertions passed. Home case retained its existing no-preference mode. Full Gateway suite NOT_RUN in W05. |
| Relevant Preview cohort | **12/12 PASS**, fixture: Price Watch9 and Admin3 across recorded viewports/provider/capability cases. Full Preview suite NOT_RUN in W05. |
| Focused source format | `prettier --check` on final Price Watch source and observations test **PASS**. |

The final Gateway and Preview cohorts exited cleanly without a post-test hang. A first reduced-motion Gateway cohort had **5/6 PASS** because the PWT01 test expected exactly `0s`; shared reduced-motion CSS intentionally uses `0.01ms` and Chromium reported `1e-05s`. The assertion was corrected to measure the actual maximum duration; focused **1/1** and full relevant cohort **6/6** then passed. The Map full-unit failure and previous generated-output lint failure remain visible as current and historical evidence, respectively. No live Backend, browser push/email delivery, production provider, manual screen reader, physical device, native browser zoom, CI or performance result is inferred.

PWT01 test history: the first observations-focused run passed the cursor-error path. An added initial-error assertion then failed because the HTTP fixture switched to success on an automatic refetch before inspection; the fixture was changed to keep failing until the explicit retry action. The final run above passed both recovery paths. This intermediate failed assertion was a test timing error, not proof that the UI lost the error state.

## Screenshots

| File | Mode / inspected observation | SHA-256 |
| --- | --- | --- |
| [Price empty desktop1440](w02/price-layout-desktop1440.png) | Gateway HTTP mock; list left, create form right. | `0E56998AE43496F3FBAD66E9B71FFC52B6FF990FA934B126B53172E7B529005C` |
| [Price populated desktop1440](w02/price-populated-desktop1440.png) | Gateway HTTP mock; actual watch card left, edit form right. | `EC2CAC5B413812F918C7ECDE89FE6A2B2C902D92304346FE872CB03051A0AC33` |
| [Price Web402](w02/price-web402.png) | Gateway HTTP mock; form below content, visible section of long form. | `75D2E86D5EC4F91074CA3D3A51DCB314324615C2CB90AEBAD928002F05E05791` |
| [Observations loaded](w02/price-observations-loaded.png) | Gateway HTTP mock; actual loaded row, provider, observed/received time, limited-freshness explanation. Opened and reviewed. | `323662E7B7B617C76AA0F9419C1DCB0CE5BD4E131EC1FA565A9C9FAD2EBA96CC` |
| [Observations next-page error](w02/price-observations-page-error.png) | Gateway HTTP mock; retry alert with prior row retained and no duplicate load button. Opened and reviewed. | `7E6C21E5B41E1A2738DFB11C7158E1C0BFC32B545C7BD20D341EBB638CBED0C8` |
| [Observations Web402](w02/price-observations-web402.png) | Gateway HTTP mock; two loaded rows remain readable without document overflow; scoped axe0 and Escape/focus checked. Opened and reviewed. | `CB3E119D84BDFEBB5B610F990D91375523FBBCECEDBC0CE1AF63D2183FC52FC6` |
| [Inbox desktop](w03/inbox-desktop.png) | Gateway HTTP mock; existing Drawer and per-item read. | `10D3668ABE4A906C0C6B21346C16B50750E43ABA02CDD132461B8E312C1D732D` |
| [Inbox Web402](w03/inbox-web402.png) | Gateway HTTP mock; Drawer content remains readable and no document overflow. | `E5A4F20EB70B9C2600650DCE3C886B6AC38B78259316E55EBA61A82AB3D0E589` |
| [Admin Web1440](w04/admin-placeholder-1440.png) | Gateway HTTP mock; centered truthful placeholder. | `9DF43E0DD01A1B7348FC2170607C095DF6EEE940FFBFF2E331B2FB6BD14427AB` |
| [Admin Web402](w04/admin-placeholder-402.png) | Gateway HTTP mock; same role-safe placeholder on narrow Web. | `E0DCA66F7FB3372C5C75B9AB3A5F3C7A8CB410D46786DE122CDBED2C7562C96C` |

Screenshots were copied from ignored Playwright output and reviewed, with SHA-256 calculated on the copies. Desktop and Web402 images capture the visible portion of the app's inner scrolling region, not every row/form field; layout bounding boxes and no-overflow assertions are separate test evidence. The earlier `price-form-desktop1440.png` element screenshot had scroll/stitch artifacts and was intentionally not used as visual evidence.

## Remaining

PWT01 is approved in D46 and W02/W05 are complete for the recorded CP10 scope. Full Gateway/Preview suites, native browser zoom, manual screen-reader/live Backend, CI and performance evidence are **NOT_RUN**. The full unit gate remains **FAIL 576/577** on the existing Map timing case; no CP11 activation.
