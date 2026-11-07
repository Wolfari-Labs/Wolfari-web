# Finance overlay workspace — checkpoint 1

Date: 2026-11-07 (Asia/Saigon). Branch: `feat/fund-figma-v12-desktop`.
Base: `54e750e`. Status: READY_FOR_REVIEW, not completion of the full Finance integration plan.

## Scope

The user approved the Finance Desktop plan and requested continuation. This checkpoint
relocates existing Gateway actions into Finance settings and corrects the breadcrumb.
Web-only: no Backend, Android, timeline, dependency, Figma or SRS edits; no commit/push/deploy.
Historical CP09/CP11 acceptance is unchanged.

Expense/Refund/Closure/History adapters and new lifecycle UI are NOT IMPLEMENTED here.
Those sections say that Web integration is pending; they do not claim Backend lacks contracts.
Holder handover remains unavailable because no contract exists.

## Delivered

- Breadcrumb heading explicitly 13px/20px, regular weight, zero letter-spacing, with
  specificity above shared `.page h1`. Other headings unchanged.
- Main page retains hero/progress/state/KPIs and one transaction table. Removed duplicate
  operational lists and duplicate ledger from the old detail section.
- General: budget editor. Receiving: destination list/create/edit/consent. Contributions:
  request create/edit, amount/waive/cancel/report/reject/confirm and inline instructions.
  All use existing commands, versions, query keys, decimal strings and recovery journal.
- Members: current roles, Holder assignment, pagination, link to existing Members route.
- Single FormSpec/form/session. Lists stay mounted but hidden during editing so focus can
  return to the original action. Section switching preserves the active draft.
- Escape dismisses the form/instruction first, then settings. Existing centered setup
  dialog remains intact; failed reads retain draft and focus falls back to reload if the
  original setup trigger disappeared.
- OperationStatus remains outside the overlay and is hidden while it is open; a view of
  the same session inside keeps recovery controls actionable.
- Narrow navigation uses two columns with bounded scrolling; context reflows below content.
- Ledger next-page retry fetches the next page without discarding already loaded rows.

## Verification

- Typecheck, lint: PASS. Targeted Finance Vitest: 26/26 PASS.
- Gateway HTTP-mock finance-operations + finance-refresh: 3/3 PASS, one worker.
  Includes inline destination form, empty contributions, member navigation, budget conflict,
  draft retention, recovery after reload, NEEDS_REVIEW, int64 balance, cursor and focus.
- Fixture fund-preview: 9/9 PASS, separate server 5274 via `.local/finance-fixture.config.ts`.
- Overlay widths 1440/1366/1024/820/768/402/320: no document/dialog overflow. Destination
  form overflow assertions at 402/320. AXE main page and recovery overlay: zero violations.
- Production and Preview builds PASS; non-fatal PostCSS `from` warning remains.
- Screenshot spot review: desktop budget form and 320px recovery settings. Artifacts under
  `test-results/gateway/finance-operations-HTTP-mo-57d33-oes-not-manufacture-balance/`.
- Runs use reduced motion. Full pixel-diff, native 200% zoom, manual screen-reader,
  live Backend and new-domain lifecycle tests: NOT_RUN. No claim of 100% visual parity.

Failure history: first concurrent Gateway run timed out in login. A single-worker run
found existing contrast failures in the filter/amount colors; corrected locally. Setup
test expected focus on a trigger removed by a failed read; it now tests the existing reload
fallback. Fixture startup on 5173 stalled while Docker owned that port; interrupted only
the test process and reran successfully on 5274. Business assertions were preserved.

## Visual correction requested 07/11/2026

Re-read Figma preview `1006:7024`, content `1022:7218`, members `996:6714`,
contributions `996:6826` and receiving `996:7498` using design-to-code context and
screenshots. Corrected the Gateway overlay's missing field boxes and status tiles:
5px radius, existing #cdebf7 border / #f3fbff surface, two-column field grid,
520px desktop general/context cards, 24px section title, right-aligned role/refresh.
Members/contributions no longer have the unrelated right context column. Members
use a responsive four-column role table. Receiving details use labelled field boxes;
existing operational lists/forms have scoped compact borders instead of generic
demo card styling. Context rule icon is the downloaded Figma 19x19 asset `a013d.svg`.

Contract-safe differences: fund name is derived from trip; currency replaces an
unsupported description field; actual ledger balance is not labelled cumulative
receipts. No fabricated participant totals or contribution aggregates from partial
pages. Budget action retains its existing form and command. Unsupported domains
remain unavailable. Shell/navigation icons and all 26 state pixel parity are not
claimed complete by this correction.

Verification: typecheck/lint/build PASS; targeted finance Vitest 26/26 PASS;
Gateway HTTP-mock finance operations/refresh 3/3 PASS (including AXE, focus/draft,
7-width overflow matrix and new 1440/402/320 field-box screenshots). First run
found an invalid img child inside dl grouping; moved icon inside dt and rerun passed.
Inspected `fund-general-boxes-desktop.png` and `fund-general-boxes-320.png` in
`test-results/gateway/finance-operations-HTTP-mo-57d33-oes-not-manufacture-balance/`.
Existing PostCSS `from` warning persists. Live BE, full 26-state visual comparison,
native zoom and fixture suite after this correction: NOT_RUN.

This is a correction of checkpoint 1, not approval to advance Backend integration.

## Vertical spacing correction — 07/11/2026

User reported inconsistent vertical gaps. Rechecked Figma `1022:7218`: title to
field group 20px, label/value 5px, field rows 26px. Replaced mixed browser/demo
margins with explicit 16px section/panel gaps and 8px list-item content gaps.
Receiving create action now has a measured 16px gap before its card; contribution
panels also have a measured 16px gap. Empty lists no longer reserve extra spacing.
The hidden draft-preservation wrapper stays hidden (grid applies only when visible).
At <=1024px, remove desktop minimum card height/auto spacer: stacked general cards
use 24px before the note and 16px before actions. Desktop keeps the intentional
Figma lower action area. No command/permission/API changes.

Fresh typecheck/lint/production build PASS; finance unit26/26 and Gateway HTTP-mock
3/3 PASS, including new bounding-box gap assertions. Reviewed receiving/contribution
screenshots (`fund-receiving-spacing.png`, `fund-contributions-spacing.png`) in the
same artifact directory. Existing AXE/focus/draft and viewport overflow checks pass.
Live Backend/full 26-state comparison/manual zoom NOT_RUN; PostCSS warning unchanged.

## Compact cards and discard confirmation — 07/11/2026

User explicitly requested further layout/interaction changes: receiving title and
add action share one header (right-aligned action, wraps on narrow screens); remove
outer wrapper borders around receiving/contribution/form panels and use separators
between destinations instead of nested cards. General and context cards now fit
content at desktop too, overriding the previous Figma 520px height adaptation.
Existing field borders remain. Form close is now `← Trở lại`.

Leaving an open inline form via another Finance section, Back, close or Escape now
uses the shared accessible ConfirmDialog, with `Tiếp tục chỉnh sửa` and `Bỏ bản nháp
và thoát`. Cancel retains the mounted form/draft; confirm discards only local draft
and navigates to the requested section or closes settings. Same-section navigation
just refocuses the form. No session journal deletion or Backend cancellation;
discard is disabled while a command is sending. Automatic command completion still
closes the form without asking to discard. Shared dialog options for cancel label
and focus destination are opt-in; other callers retain their defaults.

Reference: read-only FIN/26 `996:8058` screenshot, with user-requested compact
confirmation rather than replacing the whole workspace with the Figma sample screen.
First run found confirmation autofocus returning to an old navigation trigger;
fixed via explicit restore-focus target and reran. Gateway3/3 PASS includes
cancel/confirm switching, Back, Escape, close-settings, retained/cleared drafts,
zero writes on discard, focus return, AXE on confirmation, 320/402 dialog overflow,
existing operation recovery and version conflict. Reviewed compact general,
receiving header and discard screenshots. Targeted unit26/26 PASS;
typecheck/lint/build PASS. Existing PostCSS warning unchanged. Live Backend and
full 26-state pixel parity NOT_RUN. No commit/push or Backend/timeline changes.

## Transaction filter note placement — 07/11/2026

User reported the Finance projection/filter disclaimer in the wrong position.
Merged the duplicate notes into one normal-flow note directly below toolbar and
above results, with 12px vertical margins and explicit 12px/20px text. Gateway and
fixture custom note content is preserved; no filtering/financial logic changes.
Gateway finance-operations2/2 PASS including note count/text/position assertion;
reviewed `fund-filter-note.png`. Typecheck/lint/build PASS; PostCSS warning unchanged.
Live Backend NOT_RUN.

## Next checkpoint

Add strict runtime models/decoders/repository reads/commands for Expense, Refund, Closure
and History, then wire the respective sections. Expense DELETE must consume operation
responses and avoid mutation replay after recovered success. Closure reminder accepted
does not mean delivered; CLOSING permits confirm/cancel/remind. Confirm binds the exact
snapshot hash. Refund reversal uses matching history reason, never creation reason.

Per AGENTS.md and the earlier per-checkpoint user requirement, stop for review before
advancing to this Backend integration checkpoint.
