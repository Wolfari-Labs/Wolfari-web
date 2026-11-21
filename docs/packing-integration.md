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
