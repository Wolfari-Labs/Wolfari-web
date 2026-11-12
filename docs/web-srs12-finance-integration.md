# Web Finance SRS 1.2 integration

User-authorized workstream, branch `feat/web-srs12-finance-integration`, based on local develop including the existing demo/SRS commits. Web only, no backend/dependency/database changes, push, merge or deployment. One completed feature per commit.

## Authority and limits

SRS v1.2 is the requirements reference. The user explicitly selected existing backend behavior where it differs; differences are NOT SRS compliance. Manual TEST only, no real transfers or MoMo work. Existing Finance shell/tokens and official Figma Fund reference retained; functional forms use shared accessible primitives. This work authorizes the requested expense/receipt/note/reversal/refund/closure/history functionality, not unrelated pending redesign deltas or a new UI checkpoint.

| Feature | SRS | Contract | Status |
| --- | --- | --- | --- |
| Expense | FR-FIN-03/04 | funds/:id/expenses and expenses/:id actions | Implemented; focused automated verification passed |
| Receipt | Finance evidence | funds/:id/receipts | Blocked: no expense-to-receipt download locator after reload |
| Outside-fund notes | FR-FIN-03 | funds/:id/notes; PATCH/DELETE notes/:id | Implemented; focused automated verification passed |
| Contribution reversal | FR-FIN-04 | POST contributions/:id/reverse | Implemented; focused automated verification passed |
| Refund | FR-FIN-05 | funds/:id/refunds and refund actions | Implemented with BE-02/BE-04 limitations |
| Closure | FR-FIN-07/08 | funds/:id/closures; closures/:id; confirm/cancel/remind | Implemented; focused automated verification passed |
| Audit history | FR-TR-12 / Finance traceability | GET funds/:id/history, limit/cursor | Implemented; separate from ledger |

Backend authorizes active members to create expense proposals; creator/Owner edits/submits drafts, creator withdraws, Holder alone confirms/rejects/reverses. Draft/proposal is not a ledger payment. Refund self-recipient independent verification required by SRS is not implemented by current backend: record as a known deviation, not independently verified. Holder handover, partial/overpayment, provider transfers, Export/Public Share and missing backend travel/DSS capabilities remain outside this branch.

No live backend/provider/manual-screen-reader/physical-device verification has been performed for this workstream. HTTP mocks do not demonstrate live backend correctness.

## Expense verification — 12 November 2026

- Typecheck and scoped ESLint: PASS. Production build: PASS, existing PostCSS `from` warning retained.
- Focused unit/component suites: 24/24 PASS across finance-integration, finance-action and existing demo1-finance suites. Covers request validation, int64 money, cross-fund decoding, operation receipt for delete, unknown-request recovery retaining body/key, permission/version rejection, and preventing replacement writes from a form after recovery succeeds.
- Gateway HTTP-mock: 9/9 PASS across finance-integration, finance-refresh and finance-operations. Covers create/edit/delete/submit/withdraw/confirm/reject/reverse, no mock balance change before confirmation, Member/Owner-not-Holder restrictions, CLOSING/CLOSED/archive blocks, existing recovery/pagination behavior and stale-version recovery.
- 402px screenshot inspected; targeted automated WCAG2A/AA scan passed. Browser fixture tests are not live server/ledger verification. Native zoom, physical device, manual screen-reader and full project suites NOT_RUN.
- Initial attempts: dev-server cold start exceeded the default 30s test deadline; rerun with 120s deadline passed. Type errors and restricted infrastructure imports were corrected before the final passing runs. No rules disabled.

## Outside-fund notes verification — 12 November 2026

- Typecheck, scoped ESLint and production build: PASS (existing PostCSS warning).
- Focused unit/component: 26/26 PASS across finance-notes, finance-integration, finance-action and demo1-finance. Includes nullable/zero/int64 amount validation and strict scope decoding.
- Gateway HTTP-mock: expense regression 6/6 PASS; notes 3/3 PASS, including CRUD, null versus zero, unchanged mock balance, loading additional payer candidates, CLOSING/CLOSED read-only states and a 402px WCAG2A/AA scan.
- Initial notes E2E exposed a disabled create button while member pagination remained. Fixed without requiring all members to be loaded; explicit member pagination is available inside the notes panel. A subsequent exact-optional-property TypeScript error was corrected.
- These focused checks do not prove backend ledger behavior. Live tests, dedicated notes permission/error matrix, manual screen-reader, full regression and physical-device verification: NOT_RUN. Existing shared command recovery tests passed; notes-specific timeout scenarios have not been separately exercised.

## Contribution reversal verification — 12 November 2026

- Holder-only action for confirmed contributions, required reason (1–1024 Unicode characters), contribution and fund versions. Known non-OPEN request blocks the action; unloaded request state, reconciliation constraints and sufficient available balance remain server-authoritative.
- Typecheck/scoped lint/build PASS; focused unit/component 27/27 PASS. Gateway HTTP-mock 2/2 PASS: Holder reversal with exact reason/versions/key, refreshed contribution state and mock balance; Owner who is not Holder cannot reverse.
- Uses shared unknown-result recovery and finance query invalidation; never deletes the original ledger record or computes balance from a loaded page. Atomic reversal/ledger uniqueness and insufficient-funds enforcement require live backend validation: NOT_RUN. Dedicated reversal timeout/insufficient-funds/closed-fund browser cases and manual accessibility: NOT_RUN.

## Refund verification — 12 November 2026

- Typecheck/scoped lint/build PASS; focused unit/component 29/29 PASS. Gateway HTTP-mock workflow 1/1 PASS, exercising create/report/nonreceipt/cancel, then create/report/receive/request-reversal/consent/reverse after reload, plus 402px automated WCAG2A/AA scan.
- A test locator initially matched both the filter option and status text; scoped it to the refund article and reran successfully.
- Reason, positive int64 amount, recipient UUID, versions and nullable timestamps validated; server remains authoritative for balances/holds. No automatic refund transfer or hold release.
- BE-02 independent verification and BE-04 absent reversal reason remain documented API/SRS limitations. Holder must re-enter the original reversal-request reason; it is not reconstructed from the refund reason.
- Dedicated cross-role/refund timeout/insufficient-funds/closed-fund browser matrix, full regression and live backend/provider tests: NOT_RUN. Current evidence is focused HTTP-mock, not end-to-end live certification.

## Closure verification — 12 November 2026

- List pagination and explicit detail read; immutable snapshot groups render all returned record fields (technical field names retained), required users and their confirmations. Schema/fund/Trip/version/hash/confirmation-set checks reject mismatched data. Confirmation requires explicit review and submits the selected snapshot hash, not a global current version.
- Owner creates/cancels/requests reminders; required users confirm in CLOSING; CLOSED is read-only with no reopen action. A reminder's special 202 accepted receipt settles the command without claiming notification delivery.
- Typecheck/scoped lint/build PASS, focused unit/component 31/31 PASS. Gateway HTTP-mock 1/1 PASS: create, detail, disabled-until-reviewed, accepted reminder, cancel, recreate, confirm and CLOSED; 402px automated WCAG2A/AA scan. Initial ambiguous CLOSED text locator corrected and rerun.
- Nonempty production snapshots, multi-user concurrency/late provider evidence, live closure lock/atomicity, manual keyboard/screen-reader and full regression: NOT_RUN. Snapshot rows intentionally expose exact field names for traceability; localization polish remains.

## Receipt blocker evidence

Backend `expense-http.ts` projects `receipt_available` but intentionally omits `receipt_object_key` (its contract test asserts omission). `finance-receipt-http.ts` download accepts only `object_key`; there is no expense-ID lookup/download endpoint. Upload returns a key, but retaining it only in browser memory does not enable reading existing attachments after reload or by another authorized member.

Do not invent a URL, scrape a storage key, persist private file bytes, or present temporary session-only access as completed receipt integration. On 12 November the user authorized documenting backend gaps and continuing the remaining Web features while deferring receipts. See [backend gaps](backend-integration-gaps.md). No backend edits authorized.

## Audit history and final regression — 12 November 2026

- Separate audit panel with server pagination, actor/system actor, action, timestamp (raw microseconds available in details), entity, versions and reason. Unknown actions retain their original identifier. Ledger retains its legacy accessible region name for existing consumers and now visibly says “Sổ giao dịch”.
- Typecheck PASS; scoped lint PASS; full `eslint .` PASS; production build PASS (existing PostCSS warning).
- Full unit/component: **734/734 PASS, 62 files**. Includes all new finance contract tests and existing recovery tests.
- Finance Gateway HTTP-mock regression: **17/17 PASS** across expense, notes, reversal, refund, closure, history, operations and refresh. History covers read failure/reload, cursor pagination, system actor, CLOSED read access and automated 402px WCAG2A/AA scan.
- Navigation entries placed in business order (notes after expenses, audit at end); final targeted history check rerun after ordering. This does not change commands/contracts.
- Live E2E: **NOT_RUN**. Read-only local listener inventory found no service listening on the default Gateway port 3000 at check time; no backend services, database fixtures or provider operations started. No claim that remote environments were inspected.
- Full Gateway suite outside Finance, Preview fixture suite, manual screen-reader/keyboard/focus review, physical devices, multi-user live race conditions and the per-feature NOT_RUN cases above remain unverified. Automated passing tests are not complete SRS acceptance or production readiness.

## Commit handoff

| Feature | Commit |
| --- | --- |
| Expenses | `0d572ad` |
| Receipts | DEFERRED — BE-01, no completion commit |
| Financial notes + backend gap report | `de4c074` |
| Contribution reversal | `4e14013` |
| Refund workflow | `397b9cf` |
| Fund closure | `eb75406` |
| Audit history + final regression | This document's `feat(finance): integrate audit history` commit |

Six feature commits, not seven: the deferred receipt feature is not represented as completed. Backend/mobile/dependencies/database unchanged. No push, merge or deploy. Remaining backend/SRS work is in `backend-integration-gaps.md`; remaining verification is explicitly listed above.
