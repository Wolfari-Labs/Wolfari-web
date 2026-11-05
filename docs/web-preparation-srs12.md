# Web preparation — SRS v1.2 integration contract

Workstream authorized by the user's implementation request, separate from the closed UI-redesign checkpoints. Baseline: `develop` / `d9d2035`; branch: `feat/web-map-dress-packing-integration`. Source: the user-owned `Wolfari_SRS_v1.2.docx` (02/11/2026, draft); its business rules override the older API catalog. No Backend changes, dependency changes, migrations, commit/push or deployment. The DOCX is not modified or staged.

## Availability and architecture

Existing `GET /api/v1/trips/{tripId}/plan` remains the authoritative aggregate. Optional `data.capabilities` is an object of booleans (missing keys are false):

```json
{
  "locations_write": true,
  "dress_codes_write": true,
  "packing_items_write": true,
  "packing_assignment": true,
  "packing_completion": true,
  "place_search": true,
  "routes": true,
  "route_order_request": true,
  "route_order_apply": true,
  "packing_dress_request": true,
  "packing_dress_apply": true,
  "schedule_validation": true
}
```

These are negotiated Web contract additions, not claims about current BE support or fields prescribed by SRS. Only advertise an operation when its authorization, validation, idempotency and receipt implementation is ready. The next reload/refetch enables it; no polling or realtime is implied. Missing flags preserve old read projections and existing Activity editing. Permission and capability are independent; `can_complete` for Activity is not reused for Packing.

All calls use the existing same-origin authenticated HTTP client. Components never fetch directly. TravelRepository owns read-like operations, including POST Route/recommendation-generation/schedule-validation. They do not enter the Plan write journal or increment Plan version. PlanRepository owns typed preparation mutations and existing Activity commands. One Trip+actor command owner is mounted above the Gateway route outlet; all those operations share pending/unknown blocking and `wolfari:plan-command:{tripId}:{userId}`. Existing Activity journal kinds remain readable. Recovery validates stored fields and reconstructs known operations, never executable URLs.

## Plan writes

Prefix `/api/v1/trips/{tripId}`. Standard envelope remains `{data,meta:{correlation_id}}` or `{error:{code,message,details,retryable},meta:{correlation_id}}`.

| Operation             | Endpoint                                           | Body in addition to `expected_plan_version`                                                |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Create location       | POST `/locations`                                  | name, address, latitude, longitude, provider, provider_place_id, opening_hours, fetched_at |
| Update location       | PATCH `/locations/{id}`                            | Same complete editable fields                                                              |
| Delete location       | DELETE `/locations/{id}`                           | No other fields                                                                            |
| Create/update Dress   | POST `/dress-codes`; PATCH `/dress-codes/{id}`     | scope_type, plan_date, activity_id, label, description, public_description                 |
| Delete Dress          | DELETE `/dress-codes/{id}`                         | No other fields                                                                            |
| Create/update Packing | POST `/packing-items`; PATCH `/packing-items/{id}` | name, quantity, unit, category, note, due_at                                               |
| Delete Packing        | DELETE `/packing-items/{id}`                       | No other fields                                                                            |
| Assignment            | PUT `/packing-items/{id}/assignment`               | assigned_member_id (membership UUID or null)                                               |
| Completion/reopen     | PATCH `/packing-items/{id}/completion`             | status: TODO or COMPLETED                                                                  |

These mutations use `Idempotency-Key`. Success is a confirmed 200/201 envelope with `data.plan_version` greater than the submitted version; normal entity receipts may contain the full entity including `id` and `trip_id`, both checked when present. Delete may return `{plan_version,export_revision}`. 202, malformed/mismatched receipts, network loss and timeout are not success. Retry reuses exactly the old body, key and version. BE must check current authentication/authorization, then replay an existing confirmed receipt before applying a new version check. After receipt, Web marks caches stale and refreshes a coherent Trip/Plan pair; a failed read never causes a confirmed write to be sent again.

### Validation and lifecycle

- Location: name 1–255; latitude/longitude both null or decimal strings with at most six fractional digits, ranges ±90/±180; limit 50 saved places. Search results have external provider IDs, not fabricated Wolfari IDs. Provider metadata does not authorize writes to provider data; BE verifies source identity. Deletion lists all referring Activities, including unscheduled ones, and remains blocked until links are removed/reassigned via Plan. BE enforces referential integrity and concurrent duplicate/limit checks.
- Dress: new writes DAY (valid Trip calendar date, activity_id null) or ACTIVITY (current Trip Activity UUID, plan_date null); label 1–100. Legacy TRIP rows are read-only. Image/palette/upload excluded. Updating weather never rewrites saved Dress.
- Packing: name 1–200, positive decimal-string quantity ≤99999999.99 with ≤2 fractional digits, unit ≤30, category ≤80, note ≤500, due_at nullable instant. Unchanged due date preserves the original instant. Create is unassigned/TODO; assignment is a distinct action/request, not a hidden two-write transaction.
- Owner/editor can complete and reopen any item; active non-editor can do both only on their currently assigned item. `completed_by_user_id` gives no continuing permission. Archive/departure disallows writes. Server rechecks rights at processing time.
- Rename, quantity change or reassignment resets TODO. Note/category-only changes preserve status. Unit/due_at-only changes preserve status by this contract's compatibility default (not an additional SRS claim). Member departure unassigns/resets. BE retains assignment/completion history and updates/cancels reminders; Web never claims reminder delivery or simulates those server effects.
- Known stale/expired/unsupported errors are deterministic: VERSION_CONFLICT, STATE_CONFLICT, VALIDATION_FAILED, PERMISSION_DENIED. Aliases RECOMMENDATION_EXPIRED, RECOMMENDATION_STALE and FEATURE_NOT_SUPPORTED map to STATE_CONFLICT. Do not encode a known rejected write as an ambiguous transport failure.

## Travel read contracts

- `GET /api/v1/travel/places?trip_id={id}&q={query}`.
- `POST /api/v1/travel/routes`: `{trip_id,coordinates:[{latitude:number,longitude:number},...],travel_mode:"WALKING"|"DRIVING"|"CYCLING"}`. Web currently selects two saved endpoints; departure_at is omitted (optional in catalog).
- Response envelope `data` contains **ProviderResult**, separate from the outer correlation metadata:

```json
{
  "data": {
    "data": null,
    "meta": {
      "status": "NO_RESULT",
      "provider": "provider-name",
      "fetched_at": "2026-11-05T00:00:00Z",
      "stale": false,
      "is_mock": false,
      "warnings": []
    }
  },
  "meta": { "correlation_id": "trace-id" }
}
```

SUCCESS place data is an array of `{id:externalId,name,address:string|null,coordinates:{latitude,longitude}|null,opening_hours?}`. SUCCESS route data is `{distance_m:number,duration_seconds:number,geometry:[{latitude,longitude},...]}`; geometry needs at least two valid points. NO_RESULT/ERROR has no usable data. Fetched timestamp may be null when unavailable. Mock provider data is not presented as live data. Missing routes never become zero or straight-line estimates. Real route geometry is rendered through the existing Google presentation adapter; textual results remain usable without a map SDK. Provider selection/secrets/quotas/cache policy remain BE/provider OQ-01 dependencies; no paid provider was selected here.

## DSS and validation

- `POST /recommendations`: `{type:"ROUTE_ORDER"|"PACKING_DRESS",scope:{date?,selected_location_ids?,activity_ids?},expected_plan_version}`. Scope references current Trip data; BE builds trusted inputs. Generation does not modify Plan.
- `GET /recommendations/{id}`: the same Recommendation representation, with matching identity.
- Recommendation: `{id,trip_id,type,base_plan_version,input_hash,rule_version,expires_at,status,proposal:{items},provider_sources,warnings}`. Web permits Apply only for status `PENDING`. Provider sources use the metadata shape above; warnings are string arrays.
- Item: `{id:string,type:"ACTIVITY"|"ROUTE_ORDER"|"DRESS_CODE"|"PACKING_ITEM",values:object,reason:string,rule_ids:string[],duplicate_of?:string[]}`. Values are the proposed snake_case entity fields; ROUTE_ORDER supplies activity_ids in proposed order; time changes must be shown explicitly (starts_at/ends_at). Current order/time and proposed values are shown for review. Unknown item types are rejected, not silently applied. Server duplicate warnings identify related Packing item IDs through duplicate_of; Web also warns on normalized equal names. Users either deselect the item or explicitly choose to create a separate one; no automatic quantity aggregation.
- `POST /recommendations/{id}/apply`: `{selected_item_ids:string[],expected_plan_version,apply_request_id:uuid}`. Unlike CRUD, Apply uses the body request ID, not a new header protocol. Version equals the proposal base and current snapshot. Receipt: `{recommendation_id,apply_request_id,applied_plan_version,created_entity_ids?}`. Selected changes are atomic; BE rechecks current authorization, expiry, references, version and valid selection dependencies. Receipt replay uses the original proposal/selection/version/request ID. No client-generated proposal values are sent to Apply.
- `POST /schedule-validation`: `{expected_plan_version}` → `{plan_version,warnings:[{code,activity_ids:string[],message,missing_minutes?}],unchecked_routes:string[]}`. Route identifiers in unchecked_routes are opaque strings. Triggered automatically for each new coherent saved Plan version when capability is present; local overlap warnings use actual intervals even without it. Validation/provider failure cannot roll back or replay a save. The panel explicitly states that travel has not been evaluated where data is missing.

## Traceability and verification

| Requirements                    | Web behavior                                                                   | Automated coverage                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| FR-PL-01–04, FR-PL-10, FR-TR-11 | Independent permissions/capabilities, shared version/owner, immutable recovery | preparation unit suite, existing Plan command suites, cross-page unknown E2E       |
| FR-LOC-01–03 / AT-02            | Provider search vs saved list, CRUD/50 limit/all references                    | preparation contract tests; location persistence and linked-deletion/limit E2E     |
| FR-LOC-04–06 / AT-06            | Route source/geometry, unknown travel, route-order preview                     | Travel decoder tests, route/no-result E2E, recommendation preview                  |
| FR-PK-01 / AT-07                | DAY/ACTIVITY, legacy TRIP reads, manual/DSS                                    | validation and legacy projection tests; Dress save/reload E2E                      |
| FR-PK-02–05 / AT-07             | Separate content/assignment/completion, reset and assignee rights              | quantity/reset/permission unit tests, Packing lifecycle and non-editor/archive E2E |
| FR-PK-06, FR-DSS-01–06 / AT-08  | Request/preview/selection/apply, duplicates, expiry/version, missing inputs    | proposal/receipt tests, partial Apply/duplicate/expiry/read-only E2E               |
| AT-05                           | Conflict/unknown/reload/retry and successful-receipt/read-failure separation   | existing command tests plus shared two-consumer test and cross-page unknown E2E    |

Preview remains explicitly local/simulated: historical visual mockups are not live provider/DSS integrations. Map validation/limit/linked-Activity guards and Dress DAY/ACTIVITY draft validation now follow the same domain rules; Packing uses the shared quantity/reset/permission rules. Existing fixture illustration assets are not newly supported media uploads. The production Gateway never falls back to local saves.

Verification results will be recorded below after final runs; HTTP mocks/fixtures do not prove BE completion. Live Backend/provider/DSS/reminder/audit delivery, manual screen reader, physical devices and CI are NOT_RUN. No production-release approval or automatic CP12 is implied.

## Deferred backlog (preserved)

- Map/Dress/Packing server mutations and capabilities: BE integration obligation, not implemented here.
- Travel routing and DSS computation: Web consumers only; live provider runtime remains pending BE.
- Dynamic home recommendations: deferred; static landing remains valid.
- Finance notifications: publisher/consumer/inbox integration already exists; operational flags and delivery verification remain separate.
- Plan realtime: deferred; shared-version HTTP collaboration remains the mechanism.
- Activity completion/reopen policy discrepancy versus FR-PL-08 is a separate backlog item; not silently changed to match Packing in this workstream.

## Verification log

- Full Vitest after the final Preview compatibility correction: **631/631 passed, 50 files**. Targeted command/preparation/map rerun: 60/60 passed.
- Final lint, typecheck, production build and Preview build: PASS. `git diff --check`: PASS (Git reports only expected LF→CRLF normalization notices for edited source files).
- Built Gateway HTTP-mock run: **40/40 passed**, including SRS12 Map/Dress/Packing, route/no-route, limits/referential blocking, assignment/completion/reset/authorization, partial DSS apply, expired proposal, archive, responsive/accessibility, existing CP07 Map/Dress/Packing and Plan regression cases. Browser screenshots were captured for 402px Dress editor and Map route.
- Live BE, live provider/DSS, reminder delivery, manual screen-reader, physical-device and CI checks: NOT_RUN. Backend worktree status is clean; no dependency changes, branch history changes or DOCX staging.
