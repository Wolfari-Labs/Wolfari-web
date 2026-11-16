# Web Finance demo completion

User-requested workstream (16/11/2026), branch `feature/finance-demo-completion` from
`develop` 7a7f90b. Web only; uses Backend contracts already merged to Backend `main`
(PR #19 integration gaps, PR #20 VietQR). No dependency, database or Figma changes; no new
checkpoint. Visual departures are logged in `ui-redesign/DESIGN_DELTAS.md` for review.

| Feature | Backend contract | Status |
| --- | --- | --- |
| Live VietQR transfer instruction | `GET /contributions/{id}/vietqr` (`qr_payload`, `qr_svg`, `bank_name`, `environment: LIVE`) | Implemented |
| Bank picker | `GET /finance/banks` | Implemented (loaded only while a destination form is open; typed-code fallback) |
| Expense receipt upload | `POST /funds/{id}/receipts` (multipart) + `receipt_object_key` on create/edit | Implemented (key sent only when a new file is attached) |
| Expense receipt download (was BE-01) | `GET /expenses/{id}/receipt` | Implemented (works after reload / for other members) |
| Refund independent verification (was BE-02) | `POST /refunds/{id}/assign-verifier`, `confirmation_mode`, `independent_verification` | Implemented |
| Refund reversal reason (was BE-04) | `reversal_reason` on refund view | Implemented (prefilled; still editable) |
| Holder handover (was BE-03) | `/funds/{id}/holder-handovers`, `/holder-handovers/{id}/{accept,refresh-snapshot,confirm,cancel}` | Implemented |
| Audit history labels | `GET /funds/{id}/history` | Vietnamese labels for every Backend action; accepts `BANK_WEBHOOK:SEPAY` system actor |
| Conflict sub-reasons | optional `error.details.reason` (409) and Price Watch 429 | Implemented; absent/unknown reason keeps generic text |

## Behaviour notes

- The QR decoder rejects any payload whose NAPAS fields (bank BIN, account, amount, transfer
  content) or CRC do not match the printed fields, and any SVG that is not the plain shape
  Finance renders. A rejected instruction shows the read error, never an image.
- Refund confirmation buttons follow the Backend rule: recipient confirms; if the recipient
  is the Holder, the Owner confirms; if Owner, Holder and recipient are one person, the
  Owner assigns another active member. A single-member Trip confirms without independent
  verification. After a handover the Backend keeps the original reporter as payer; the UI
  hint uses the current Holder and the server stays authoritative.
- Handover: Owner nominates; only the nominee accepts; a stale snapshot hides confirmations
  until someone refreshes; each Holder confirms once; Owner, old or new Holder may cancel
  with a reason. Money moves outside the app; balances never change on handover.
- Receipt upload has no idempotency contract; a retried upload may stage another file that
  expires unbound after 24 hours.

## Verification — 16/11/2026

- Typecheck, ESLint (changed files) and Prettier: PASS.
- Unit/component: full suite 741 tests — 740 PASS first run; `trip-settings` focus test
  failed under load and passed 16/16 when rerun alone. New `finance-demo-completion` 8/8.
- Gateway HTTP-mock E2E: Finance specs 18/18 PASS (incl. new `finance-handover` and the
  verifier flow in `finance-refund`). Full Gateway suite with 2 workers: 178 PASS / 5 FAIL;
  the 5 (cp08 lifecycle, cp11 shell, finance-operations, finance-reversal, ui-acceptance
  320x600) rerun serially 15/15 PASS — load-related, not reproduced.
- Live Backend E2E, Preview fixture suite, manual screen reader, native zoom and physical
  devices: NOT_RUN. HTTP mocks do not prove Backend behaviour.

## Not in this branch

- Dress code writes and recommendations: the Backend exposes only the read projection in the
  Plan snapshot, no create/update or `/recommendations` route, so write controls stay
  capability-gated and a live demo shows an empty dress code page unless data exists.
- MoMo payment attempts, SePay bank-transfer list (Backend webhook PR pending), Export.
