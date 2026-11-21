# Web integration completion — 19/11/2026

Authorized workstream: one branch `feat/web-integration-completion`, four commits.
Base Web `7765f0581e24271b4e42acefe45bad3b73531dc3`; Backend main
`52d5d8c118d05c09183f3ee74f72f9fdc17ce6d0` (fast-forwarded from local PR18).
Existing uncommitted QA changes remain in the primary working directory, excluded
from this workstream's commits.
At the user's subsequent direction, implementation was transferred into
`D:\Study\HK7\pbl6\Wolfari-web` on the same feature branch. The original QA files
were hash-compared before/after transfer and preserved. The extra worktree is
detached; no second feature branch was created.

## Commit 1 — critical Finance alignment

Current main supports LIVE VietQR payload/SVG, expense-ID receipt downloads,
Holder handover and refund verification. Existing Web adapters already target
these contracts; do not add a legacy TEST/qr_url fallback or duplicate workflows.
Regression suites cover QR validation, attachment retrieval across reload,
handover commands/snapshots and refund verification. Corrected the refund UI's
assumption that current Holder is the historical payer: the wire projection omits
that payer, so offer confirmation to Owner/recipient/assigned verifier candidates
and let server authorization decide. Never infer a single-member Trip from a
partially loaded roster. Verifier choices exclude the recipient/payer, not a new Holder.

Live verification is BLOCKED: Docker Linux engine unavailable (missing named pipe).
Commit 1 verification: typecheck and scoped ESLint PASS; focused Vitest 35/35
PASS; built Gateway HTTP-mock finance/refund/handover 8/8 PASS. These are not live
Backend/provider tests.
No database migration, seed, real bank transfer or production mutation was run.
Firebase configuration is not yet provisioned; provider verification is separate
from unit/component and HTTP-mock evidence. No claim of production readiness.

## Commit 2 — reversal reason and bank directory

Reversal uses the exact server-provided reason in a read-only field; missing reason
disables the action. Bank selection supports name/code/BIN search, loading/error,
retry and manual entry without clearing the selected code or form draft.
Verification: typecheck/scoped lint PASS; bank-picker/refund unit 4/4 PASS;
built Gateway HTTP-mock refund journey (including read-only reason after reload)
1/1 PASS. Live Backend NOT_RUN.

## Commit 3 — MoMo Sandbox and reconciliation

Added Sandbox destination configuration, payment creation/status/recovery, bounded
foreground polling, Holder reconciliation and paginated exception resolution.
Uses existing command journal, versions and idempotency keys; 202 attempt receipts
and terminal 202 reconciliation operations match current main. Request completion
is not payment completion; no optimistic balance update. Redirects allow only
HTTPS test-payment.momo.vn without credentials/port. Previous-Holder transfer
confirmation is explicit, never inferred. Recovery stores the latest attempt
ID per actor/Trip/contribution in this browser session; no invented all-attempts history.

Typecheck/scoped lint PASS; payment contract/recovery unit 4/4 PASS; built Gateway
HTTP-mock create/reload/reconcile/resolve 1/1 PASS including narrow AXE scan.
Narrow screenshot inspected; existing Finance overlay/primitives reused.
Live MoMo provider, IPN and real Backend execution NOT_RUN.

## Commit 4 — browser push registration

Profile now contains a separate browser-registration card. Firebase Web SDK is
lazy-loaded and its worker is built at the stable root URL used by FCM deletion
after reload. Explicit user gesture is required for permission; missing config,
unsupported browser, denial, registration errors and unconfirmed deletion are
distinct. Device API uses WEB platform, validates its response and performs a
bodyless DELETE. Application storage contains only device ID/actor/intent, never
the FCM token. SDK-managed token storage remains under Firebase's control.

Account/session changes abort pending registration. Web Locks serialize changes
across tabs; the non-secret session-boundary epoch is checked before publishing
registration. Logout/account switch attempts cleanup before credentials change,
with an 8-second bound. Local subscription is revoked even when API removal
fails; failures remain visible. Configuration and live checklist:
[browser-push-setup.md](browser-push-setup.md).

## Contract baseline

All paths below use `/api/v1`; backend main is the SHA recorded above.

| Flow | Contract and safety boundary |
| --- | --- |
| VietQR | `GET /contributions/{id}/vietqr`: LIVE payload/SVG; strict amount/reference/CRC validation; display does not confirm receipt. |
| Receipt | `GET /expenses/{id}/receipt`: authorized binary image/PDF; reject HTML and invalid MIME. Upload object key is not a download substitute. |
| Handover | Fund `holder-handovers` create/list and per-handover accept/refresh-snapshot/confirm/cancel; version and snapshot checks remain server-authoritative. |
| Refund | Recipient/Owner/assigned-verifier candidates; `assign-verifier`, reversal request/consent/reverse; exact server reversal reason. |
| Banks | `GET /finance/banks`: code/name/BIN directory; manual input remains server-validated. |
| MoMo | Contribution `payment-attempts` POST; attempt GET/reconcile; fund payment-exceptions GET and exception resolve POST. Idempotency journal, version checks, Holder reconciliation and explicit old-Holder transfer confirmation. |
| Push | `POST /me/devices` `{platform: WEB, token}` → active device ID; `DELETE /me/devices/{id}` → 204. Authenticated session; preference toggles do not register a device. |

Live acceptance remains BLOCKED: Docker engine named pipe unavailable on the
21/11/2026 recheck; Firebase TEST and MoMo provider configuration not supplied.
No backend source, database, production payments, deployment or remote push changed.

## Final verification — 21/11/2026

| Check | Result and provenance |
| --- | --- |
| Full lint / TypeScript | PASS, rerun at handoff. |
| Scoped formatting | PASS for implementation/test files. An additional whole-notifications-directory check reported four unchanged baseline files; these were not reformatted. |
| Production / Preview builds | PASS through the built-browser harness. Existing PostCSS `from` warning remains. |
| Full Gateway HTTP-mock | 185/185 PASS before final push-revocation retry, UUID disclosure and short-height reflow refinements. |
| Full Preview fixtures | 245/245 PASS before those final refinements; not rerun in full afterward. |
| Full unit suite | FAIL: 773 passed, 2 timed out at 5000ms (`trip-map` saved-location list and `runtime-timeline-readonly` navigation). Both files are unchanged from develop. |
| Focused unit follow-up | 37/37 PASS across six files, including both timed-out cases (427ms/419ms), push/adapter and payment tests. This does not replace the failed full-suite result. Resource contention is suspected, not proven; no timeout increase or suppression. |
| Focused browser follow-up | Push missing-config/payment/native zoom 3/3 PASS; final payment plus short-height reflow 2/2 PASS; strengthened native zoom viewport assertion 1/1 PASS. |
| Visual/accessibility | Desktop and 320/402/768px payment/push checks, axe, keyboard/Escape and native 200% zoom exercised. Final screenshot inspection found Finance clipping on short windows; corrected to scroll/reflow, then verified the exception section is inside the viewport and the footer no longer overlaps it. |
| Live Backend / MoMo / Firebase | BLOCKED / NOT_RUN; requires Docker TEST services and provider configuration. Token registration is not evidence of backend notification delivery. |

The contribution read projection does not expose its destination snapshot/type.
The MoMo action therefore offers pending own contributions with an explanatory
warning; Backend remains authoritative for whether the destination supports MoMo.

Exactly four commits are retained on the single feature branch. Implementation
is directly in `Wolfari-web`; pre-existing QA edits are excluded. No push or PR.

## PR #29 CI follow-up — 21/11/2026

The preceding four-commit/no-PR statement describes the original handoff. The
user subsequently authorized two Packing commits and PR #29 into develop.
The pull_request run 44876522542 failed one of 193 Gateway dev-server tests;
the push run 44876498425 at the same head SHA and both built-browser matrices
passed. The failure was a 18px center offset in finance-operations.spec.ts.

The retained CI trace shows the receiving panel moving as its outer frame/padding
is removed, while the heading and button remain aligned within each screenshot.
The test read the button and heading using separate boundingBox calls around
258976–259008ms, crossing that layout update. It now checks the unframed container
first, reads both rectangles synchronously in one browser evaluation, and retries
the alignment assertion. The original <2px tolerance and right-of-title assertion
remain; no product CSS, arbitrary sleeps or test-timeout increases are introduced.

Verification for this test-only repair:

- Scoped ESLint, Prettier, TypeScript typecheck and `git diff --check`: PASS.
- Dev-server HTTP-mock Finance spec, three repetitions / one worker: 6/6 PASS.
- Production build and built Gateway HTTP-mock Finance spec, three repetitions /
  one worker: build PASS, 6/6 tests PASS.
- Earlier dev-server stress run, five repetitions / two workers: 5/10 PASS,
  5 failures at the existing 30s test timeout (initial login/navigation,
  transaction row count or post-reload budget control). None reported the
  receiving-header alignment assertion. The cause of these other timeouts is
  not established; the serial passes do not make that stress run green.
- Full suites and live Backend/provider checks: NOT_RUN for this repair.
  Updated remote CI results must be checked separately after pushing.
