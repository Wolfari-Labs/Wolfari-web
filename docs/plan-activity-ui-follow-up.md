# Follow-up: connect Plan activity mutations to UI

## Context

The Plan repository now exposes Gateway-backed activity commands with
`expected_plan_version` and `Idempotency-Key`. The current Plan screen still
uses `usePlanDraft` for local editing and does not call those commands.

## Scope

- Connect create, update, completion, delete, and reorder controls to
  `PlanRepository`.
- Keep the local draft until the Gateway confirms the command.
- Invalidate the plan query after success.
- Preserve the draft and show a reload action on `VERSION_CONFLICT` or
  `STATE_CONFLICT`.
- Do not retry mutations when the outcome is unknown.

## Dependency

Depends on the Plan/Activity adapter slice and a Gateway environment that can
exercise the activity endpoints end to end.

## Completion

Do not reference this follow-up as closed from the Plan/Activity issue until
the Plan UI invokes the real repository commands and has adapter/component
coverage for success, conflict, permission, and uncertain outcomes.
