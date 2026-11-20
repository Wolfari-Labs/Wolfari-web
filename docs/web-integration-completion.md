# Web integration completion — 19/11/2026

Authorized workstream: one branch `feat/web-integration-completion`, four commits.
Base Web `7765f0581e24271b4e42acefe45bad3b73531dc3`; Backend main
`52d5d8c118d05c09183f3ee74f72f9fdc17ce6d0` (fast-forwarded from local PR18).
Existing uncommitted QA changes remain in the original develop worktree.

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
