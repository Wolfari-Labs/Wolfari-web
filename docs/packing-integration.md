# Packing integration

Web-only follow-up on `feat/web-integration-completion`, after `66a2476`.
Backend baseline: `52d5d8c118d05c09183f3ee74f72f9fdc17ce6d0`.
Preserve the previous four Finance/push commits and unrelated QA working files.

## Contract alignment

`GET /api/v1/trips/{id}/plan` is the read source. Its `packing_write` flag
activates the three internal UI capabilities (CRUD, assignment, completion).
Missing/false flags stay read-only; they never grant actor permissions.
Create uses POST `packing-items`; update/assignment uses PATCH `packing-items/{id}`;
delete uses DELETE on the item; completion uses PATCH on its `/completion` suffix.
Every write carries the captured Plan version and immutable idempotency key.
Assignment takes a membership ID, not a user ID. A legacy `/assignment` journal
is never reissued as PATCH: retry produces a local conflict without a request,
then the user must reconcile before a new command.

Editors can modify items and completion. Other active members can complete
unassigned items or their own assignments; undo additionally requires that they
performed the completion. Backend remains authoritative. Edits do not implicitly
reset completion; membership-departure cleanup is a separate backend operation.
Notes support 5,000 Unicode code points, names 200, units 30, categories 80.
No backend, dependency, reminder-delivery or DSS implementation is in scope.

## Verification

Commit 1: typecheck PASS; preparation/plan-gateway/packing-suggestions unit 77/77 PASS.
UI verification is recorded below as implementation proceeds.
HTTP mocks and Preview fixtures are not evidence of live Backend acceptance.

## Server-backed UI

Gateway reuses the Packing page and item drawer, including local name/category
suggestions (not DSS). Create can assign in the same request; edit can change or
clear assignment. The paginated active-member roster is shared by the list and
editors and scoped to Trip, actor and membership revision. Unsupported reminders
are not shown on Gateway. Preview remains labelled illustrative and no longer
resets completion when editing fields.

The checkbox follows server completion/undo rules. Names, due dates, completion
actor/time and progress come from the read projection. Date-only edits serialize
to 23:59 in the Trip timezone; untouched dates retain the exact server timestamp.
Errors retain drafts, dirty dismissal asks confirmation, pending/unknown commands
block duplicate writes, and focus returns to the trigger (or Add after deletion).
Editors are keyed by Trip and actor and capture their opening Plan version;
focus/visibility refresh does not silently rebase an open draft. Stale forms must
be closed and reopened after review. The old assignment journal must be reconciled
and rejected locally before a new command can be submitted.

## Live acceptance checklist (not yet executed)

Use two active TEST accounts on a dedicated Trip and the pinned Backend SHA.

1. Editor creates an item assigned to a member; verify from the member account
   and after reload. Edit quantity, note, due date and assignment; verify persistence.
2. Member completes an assigned or unassigned item; another non-editor cannot undo
   their completion. Editor can undo. Editing an already-completed item must retain
   status; explicit undo changes it to TODO.
3. Remove/leave the assigned member through the existing membership workflow;
   re-read and verify Backend cleanup removes assignment and resets completion.
4. Submit concurrent edits and check version conflict without overwriting the
   other account. Simulate a lost write response and retry the original key only.
5. Archive the Trip or revoke edit access; verify writes are disabled/refused.
   Delete with confirmation and verify the item stays absent after reload.

On 21/11/2026, `docker info` still reports the missing
`dockerDesktopLinuxEngine` named pipe. Live Backend acceptance is BLOCKED/NOT_RUN;
no database changes or provider actions were performed. No Backend source changed.

## Final automated verification — 21/11/2026

| Check | Result |
| --- | --- |
| Full lint, final typecheck, scoped formatting | PASS |
| Full unit (`pnpm test --maxWorkers=2`) | 786/786 PASS, 69 files, 172s; before the final UI-only focus/message/layout refinements |
| Focused unit follow-up | 94/94 PASS across five files after the focus/message changes; final later change is CSS-only |
| Built Gateway regression (Packing, preparation, CP07 projections/native zoom) | 29/29 PASS; before the final menu-column/metadata CSS refinement |
| Final built Gateway Packing + native 200% zoom | 7/7 PASS after that CSS refinement, including populated list and drawer at 1440/768/402/320, axe, recovery, validation, stale version and roster retry |
| Final built Preview Packing | 4/4 PASS |
| Production and Preview builds | PASS; existing PostCSS `from` warning remains |
| Full browser suites for unrelated modules | NOT_RUN in this Packing workstream |
| Live Backend / manual screen-reader / physical devices | NOT_RUN; Backend TEST blocked by Docker engine |

Screenshots of desktop and narrow lists/editors and the native-zoom editor were
inspected. Final CSS keeps the action menu in its action column and makes Gateway
notes/completion metadata visible rather than inheriting Preview's hidden labels.
Earlier test failures were corrected at their causes: old button/assignment/reset
expectations, an isolated component test missing its new member repository provider,
and an exact text selector that included a responsive label. No tests were suppressed
or timeouts increased. The previous Finance workstream's historical unit timeouts
remain recorded there; they are not erased by this successful full run.

Two Packing commits follow the unchanged four Finance/push commits. No new branch,
push, PR, deployment, dependency change or unrelated QA changes are included.
