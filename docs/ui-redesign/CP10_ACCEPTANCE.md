# CP-10 acceptance — Price Watch / Notifications / Admin Web

**Status: READY_FOR_REVIEW, 02/11/2026.** W01–W05 are complete within the CP-10 scope and the separately approved XRT05/D18, NTF01/ADM01/D45 and PWT01/D46 decisions. This is an implementation and review record, **not user approval of CP-10**. Stop before CP-11. Web only.

## Delivered

- Price Watch create/edit form follows the approved right-side desktop and below-content narrow Web placement. Existing Gateway create retry key, versioned edit, pause/resume/stop and recovery paths remain. History uses real paginated observation rows with int64 price, provider, observed/received times, device-timezone notice and limited-freshness copy. Initial and next-page errors have explicit retry; loaded rows remain after a later-page error. No static Figma chart, lowest-fare, booking or payment claim.
- Notifications remain in the shell Drawer and versioned Profile preferences. Read and preference outcomes distinguish definite rejection from uncertain result; uncertain read blocks another read until reconciliation, and actor change resets local inbox state. No full-page notification route, bulk read or push registration.
- `/admin` keeps its role guard and local shell. An authorized Admin sees the approved truthful placeholder; a USER remains denied. No Admin CRUD, fake metrics or Backend API call was added.

## Definition of Done disposition

| Gate from [CP-10 record](checkpoints/CP-10.md) | Disposition |
| --- | --- |
| 1. Watch lifecycle, paginated observations and truthful source/freshness/error | **MET in HTTP-mock scope.** Price lifecycle and recovery are covered by the relevant Gateway cohort **6/6**; PWT01-focused Gateway **1/1** checks initial/next-page failure, exact cursor retry, source/times, int64 display and no mutation. `MOCK_FLIGHT` remains labeled simulation. Live provider/Backend NOT_RUN. |
| 2. Inbox pagination/read and versioned Profile preferences | **MET in tested scope.** Notification unit **3/3** and Gateway inbox case within the relevant cohort PASS. Read receipt is never presented as delivery. Live delivery/Backend NOT_RUN. |
| 3. Admin role denial and truthful accessible placeholder | **MET in tested scope.** Gateway Admin **2/2** at Web1440/402, Preview Admin **3** cases in the relevant fixture cohort and shell unit **21/21** PASS; no Admin API. Complete Admin Figma child context was unavailable, so full source visual parity is not claimed. |
| 4. Source layout, D17 approvals and affected accessibility/reflow | **MET with limits.** XRT05/D18 placement, PWT01/D46, NTF01/ADM01/D45 are separately recorded. Price Gateway geometry checks Web1440/900/402/320, Preview Price nine cases across seven widths, Admin Web1440/402, sampled screenshots and PWT01 Drawer Web402. Relevant Gateway Inbox/Price/Admin cases passed with reduced motion; Price Drawer computed transition was ≤0.01ms. PWT01 scoped axe scan had zero violations; Escape returned focus to the history trigger. Existing Price form and Admin keyboard/focus checks passed. Native zoom, manual screen reader, physical device and complete state-by-state Figma parity NOT_RUN. |
| 5. Contract integrity, test gates and honest evidence | **MET with recorded full-unit failure.** Full lint/typecheck and production/Preview builds PASS. Full Vitest **576/577 PASS, 1 FAIL** in existing Map provider-error test at its default one-second wait; no Map source/test diff. A read-only five-second wait probe PASS **1/1**, but does not turn the full gate green. Relevant Gateway **6/6** and Preview **12/12** PASS with clean exits. Full Gateway/Preview suites, live Backend, CI and performance NOT_RUN. |

## Evidence and limitations

[CP-10 evidence](evidence/cp10/README.md) records the commands, HTTP-mock versus fixture modes, ten reviewed screenshots and SHA-256 values, intermediate test-fixture timing failure, full-unit Map failure and NOT_RUN items. Existing CP-09 deferred Finance work and FND deltas remain outside CP-10. The official Admin child design context failed with selection/transport errors; no full Admin visual-context claim is made. The current lint passes after excluding generated `.local/**` output; its earlier generated-output failure remains historical.

The user-owned `DANH_GIA_CHI_TIET_GIAO_DIEN.md` and prior CP-08/09 work remain intact. At acceptance, branch `draft/demo-ui-ux`, HEAD `4900d59aa079c1d6b23da359788ef9ddee7ffc81`; the working tree has uncommitted changes. The Backend worktree is clean. No commit, push, deployment, Backend/dependency/official Figma edit or production-data mutation was performed. CP-11 requires a separate explicit user approval of CP-10.
