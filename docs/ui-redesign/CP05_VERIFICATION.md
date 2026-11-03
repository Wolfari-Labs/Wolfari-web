# CP-05 verification — Trips Web

31/10/2026 final D29/D30 remediation verification; branch `draft/demo-ui-ux`, HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`. Worktree CP03–05 is uncommitted and preserved. Results distinguish fixture, Gateway HTTP mocks and checks not run against a live Backend. The 30/10 W07 failures remain documented below as history.

## Source and integration boundary

- Official Figma Web nodes: Trip list `3:29`, Create `3:30`, Overview `3:31`/`3:32`, Settings `25:676` and edit `269:1234`. Existing [inventory](FIGMA_INVENTORY.md) was sufficient; the scoped Create node context was checked again via MCP on 31/10, without a whole-file resurvey or Figma write. [Source provenance](evidence/cp05/source/README.md).
- CP05 production changes cover `src/features/trips/`, approved CP05-A01 text in `src/features/plan/components/PlanSummary.module.css`, and bounded D29 Shell/Home remediation. Changes already present from CP03/04 remain in the same dirty worktree. No `src/app`, `src/infrastructure`, package/lockfile, Backend, schema, router, guard, repository, shared session or CSRF implementation edit was made in CP05.
- List keeps the opaque cursor and describes search/filter/count/sort as applying to loaded pages. Create keeps date-only/timezone/end-exclusive serialization and the actor-scoped immutable idempotency intent. D29 Gateway Create adds source-aligned Web columns and a capability panel, without unsupported controls or payload fields; success dialog closes/reset draft without an extra POST. Overview uses independent actual Trip/Plan/Fund/Members reads and does not fabricate weather, prices or maps. Settings keeps expected versions and draft; its actor/Trip-scoped session journal locks ambiguous PATCH intent until exact retry or authoritative refetch. Definitive 403/404 is shown separately. Gateway E2E below uses HTTP mocks, so live service parity remains unverified.
- D26/CP05-A01, D27/CP05-A02 and D30/CP05-A03 approve only measured text-color corrections in [delta register](DESIGN_DELTAS.md). D29 approves XRT01/02 and CP04-R01/R02 within their recorded limits. XRT03 remains pending; Figma-only creation fields and Settings lifecycle/reminder controls were not activated.

## Automated gates

| Gate | Result and limit |
|---|---|
| `corepack pnpm lint`, `corepack pnpm typecheck` | **PASS** on 31/10 after D29/D30. |
| `corepack pnpm test` | Vitest 44 files, **564/564 PASS** on 31/10. Focused W11 Settings16/16 and W09 Gateway Create6/6 passed earlier. |
| `corepack pnpm build`, `corepack pnpm build:preview` | Production and fixture preview builds **PASS** on 31/10. |
| Built fixture full suite: `corepack pnpm exec playwright test --config playwright.cp05-fixture-preview.config.ts --reporter=line` | **205/205 PASS** on 31/10, including CP04 Shell/Home remediation, CP05 route review, responsive/keyboard and native Chromium zoom tests. Original 194/196 before D26/D27 remains failure history below. |
| Built Gateway HTTP-mock full suite: `corepack pnpm exec playwright test --config playwright.cp05-preview.config.ts --reporter=line` | **57/57 PASS** on 31/10. Includes two new Create success-dialog tests at 1440/402 with focus return, draft reset, no extra POST, fit and sampled axe zero. Original 53/55 before test-harness correction remains failure history below. |
| Browser visual and accessibility sampling | Gateway Create dev HTTP-mock 1440/402/320/1366×520, corrected Shell/Home dev fixture and built suites reviewed; 26 copied PNG/JSON artifacts hash-listed. Web responsive layouts and sampled axe zero are evidenced; manual screen reader and full WCAG conformance are not claimed. |
| Targeted Prettier, `git diff --check`, strict text/link and evidence hash audit | **PASS**: 26/26 QA hashes, inventory 7239 frames/175 components/17 sets/257 variables, 22 routes/430 local links, strict UTF-8 85 files; no whitespace/replacement/conflict marker hit. Git emitted only LF→CRLF warnings. |

## Failure history and browser scope

1. Built fixture 194/196: Preview Create had 15/4 sampled low-contrast text nodes at 1440/402 (2.86–4.34:1); Overview cyan text/selected day measured 2.96–3.09:1. User separately approved CP05-A01/A02. Changes only use existing darker text tokens on affected selectors, retain Figma composition and keep the original failures visible under `.local/cp05-fixture-full/`. Earlier focused axe inspection also found an invalid Overview progressbar ARIA attribute, corrected in the Overview component. Corrected focused review 5/5 passed with zero axe violations in its sampled routes.
2. Built Gateway 53/55: the two Create accessibility tests had a harness mistake, not a demonstrated product route failure. `tests/e2e-gateway/cp05-create-axe.spec.ts` now injects `gateway`; focused 2/2 passed with zero sampled axe violations at 1440/402. Original full-run artifacts remain under `.local/cp05-gateway-built-approved/`; focused artifacts under `.local/cp05-gateway-create-axe-fixed/`.
3. Fixture screenshots test Web 1440, 402, 320 and 1366×520; native zoom tests a Chromium browser at 200%. Keyboard/focus, reduced motion and no document horizontal overflow passed in sampled cases. [Visual evidence](evidence/cp05/qa/README.md) distinguishes source and runtime image modes; 26 copied PNG/JSON artifacts are hash-listed. The original Shell sidebar clipping was corrected under D29; the active Settings link is fully visible initially at 1440×960 and scrolls into view at short desktop heights. These checks do not establish every Figma state, physical browser/device behavior or full WCAG conformance.
4. D30's Gateway dialog text originally measured 3.09:1 and 3.72:1 on white. The approved `#006b92` replacement calculates 5.97:1; final dev HTTP-mock dialog axe sampled zero at 402 and built Gateway modal tests sampled zero at 1440/402. The original failing report remains in `.local/cp05-d29-gateway-qa/report.json`, separate from the final copied report.

Historical W07 repository audit: branch `draft/demo-ui-ux`, HEAD unchanged; `git diff --check` PASS, `git diff --name-only -- src/app src/infrastructure package.json pnpm-lock.yaml` empty, 15 copied CP05 QA artifact SHA-256 hashes matched and the original six CP01 baseline hashes remained unchanged.

Final W13 repository audit: same branch/HEAD, `git diff --check` PASS and `git diff --name-only -- src/app src/infrastructure package.json pnpm-lock.yaml` empty. The inventory/link verifier confirmed the original six CP01 baseline hashes and unchanged Figma catalog; all 26 CP05 QA hashes matched. Strict UTF-8 scan covered 85 documentation/evidence text files; no trailing-whitespace, replacement-character or conflict-marker hit. Dirty source/docs/evidence were preserved without commit/push.

Live Backend, production environment, manual screen reader, physical devices and runtime Web Vitals **NOT_RUN**. No commit/push, Figma write, Backend edit, dependency change or CP06 implementation was performed.
