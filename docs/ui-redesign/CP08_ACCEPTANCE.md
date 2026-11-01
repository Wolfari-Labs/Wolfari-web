# CP-08 acceptance — Members / Invitations / PlanEditPolicy Web

**Status: APPROVED / DONE, 01/11/2026 (D43).** W01–W07 are complete within D38/D41 and the approved MBR01–MBR05 packet. User approval closes CP-08 while preserving every verification limit and NOT_RUN disposition below. CP-09 proceeds in its own record. Web only; no native/mobile product deliverable.

## Scope and outcome

Gateway Members now follows the official Web source hierarchy: trip banner and tabs, real loaded roster with joined/left details and Owner/Member actions, and a guidance panel that does not invent Fund Holder or Owner transfer data. Owner invitation form/list preserves EMAIL/LINK, filter, pagination, one-time secret, resend/revoke and unknown retry behavior. PlanEditPolicy uses native radio cards, real membership IDs and the existing journal/receipt rules. Recipient invitation uses the scoped Figma card context and only actual preview metadata; token scrub, login return, terminal/recovery states and receipt-driven navigation remain. Preview behavior is preserved. No Backend, adapter, route, package, lock or official Figma mutation was made.

## Definition of Done disposition

| Gate from [CP-08 record](checkpoints/CP-08.md) | Disposition |
|---|---|
| 1. Three Web routes/source, data/role/permission/terminal states | **MET in tested scope.** [Gateway composition](evidence/cp08/README.md) is clean 24/24 across four views and six Web sizes; focused unit117/117. Real data shape and source departure are bounded by D41; live Backend remains NOT_RUN. |
| 2. Owner invitations, recipient response, policy and remove/leave recovery | **MET with runner limit.** Focused unit117/117; 10 existing Gateway cases and two new lifecycle cases each printed `ok`, including immutable key/body retry and no premature removal. Their Playwright processes hung after all cases and were interrupted, so no clean suite PASS is claimed. No real mutation/email was sent. |
| 3. Responsive, keyboard/focus, reduced motion, contrast and native zoom | **MET with limits.** Composition24/24 checks no horizontal overflow, panel reflow and eight axe scans with zero violations. Native Chrome 200% scenario printed `ok`, with `tabs.setZoom(2)` proof and four captured surfaces, but its runner hung after the scenario. Manual screen reader, physical device and performance are NOT_RUN. |
| 4. Lint/typecheck/unit/build/E2E with truthful failure disposition | **MET with recorded exceptions.** Typecheck, production/Preview builds, scoped ESLint/Prettier and focused unit PASS. Full unit initial573/574 due a Map provider text timeout outside CP08; focused Map4/4 PASS. Repository-wide `pnpm lint` FAIL 2863 on archived generated `.local/cp07-build-preview/assets`; `eslint src tests` and `eslint . --ignore-pattern '.local/cp07-build-preview/**'` PASS. Composition24/24 clean; other individual Playwright cases passed assertions but runner teardown hung. See [verification](CP08_VERIFICATION.md). |
| 5. Before/after evidence and consistent records | **MET.** Four before and twelve after Gateway HTTP-mock images, eight axe JSON, four native zoom images + proof JSON, 29/29 SHA-256; current [STATE](STATE.md), [record](checkpoints/CP-08.md), [route matrix](ROUTE_MATRIX.md), [delta register](DESIGN_DELTAS.md) and decisions synchronized. |

## Evidence and accepted review limits

- [Verification log](CP08_VERIFICATION.md) keeps exact modes, commands, initial failures, focused recovery and Playwright interrupted exits. HTTP mocks and Preview fixtures are separate from live Backend.
- [Visual evidence](evidence/cp08/README.md) contains source/runtime comparison captures; the official Members source and sampled desktop/narrow runtime images were visually reviewed. Screenshots are not proof of every Figma state.
- **NOT_RUN:** live Backend mutation journeys, manual screen reader, physical device, production performance/Web Vitals and CI. The post-test Playwright hang is unresolved; four affected commands lack clean runner exits. Full `pnpm lint` also remains red on generated CP07 build artifacts. These limits are presented for explicit review, not silently waived.

## Repository and stop

At the W07 acceptance snapshot, branch `draft/demo-ui-ux`, HEAD `6908b0b1b3debb5171dffdf358aa2029dc858172` was one commit ahead of the local origin tracking ref; CP08 changes remained uncommitted. An unrelated user edit in `DANH_GIA_CHI_TIET_GIAO_DIEN.md` was left untouched. Backend worktree was clean; no commit/push/deployment. The W07 stop gate awaited explicit CP-08 approval; the user subsequently granted it under D43 and opened CP-09. D41 approval covered MBR01–MBR05 only, not other pending design deltas.
