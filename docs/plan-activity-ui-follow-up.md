# Plan activity UI — Web-only delivery

## Context

The Plan page separates **Dữ liệu trên server** from **Bản nháp trên thiết bị**.
The server panel calls create, typed update, confirmed delete, completion/reopen,
and complete-list reorder with `expected_plan_version` and `Idempotency-Key`.

## Scope

- Only server-selected location IDs can be linked. Pure reorder preserves times.
- One write per trip at a time in the tab; no automatic write retry/version increment.
- Pending/unknown outcomes retain the exact intent, revision and key in session
  storage scoped to actor/trip, including route changes and reload in that session.
  Explicit reconciliation and explicit replay are required to retry. Failure to
  persist a recoverable intent prevents its write from being sent.
- Refresh both Trip and Plan after success; retain form content on conflict.
- Draft version mismatch preserves the draft and locks it for explicit review/reset.

## Dependency

The current Backend cannot store a day independently from activity timestamps.
Dragging and changing day remain local: retain the date and clear times on the
moved activity and target-day suffix. Source-day remaining times are unchanged;
pool moves clear only the moved activity, and same-slot drops do nothing.

Drafts are never partially published via multiple PATCHes. Server editing supports
existing times; changing day uses the local editor. No fake midnight timestamps or
local map IDs are sent to Gateway. Backend/API/protobuf/database are unchanged.

## Completion

Gateway commands are connected and have adapter/component/HTTP-mock browser
coverage. Shared date-only scheduling remains an explicit contract limitation;
do not mark that flow as Gateway-complete. Recovery survives reload within the
browser session, not storage deletion, a closed session or a different device.

See [implementation evidence](plan-activity-evidence-2026-10-23.md).
