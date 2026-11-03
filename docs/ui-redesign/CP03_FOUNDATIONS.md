# CP03 — Foundations implementation contract

30/10/2026, D21. Source-first D17; official file and inventory unchanged. This is a bounded maintenance implementation of CP03, not a new visual direction or a claim of matching every Figma frame.

## Values and compatibility

| Layer | CP03 mapping | Boundary |
|---|---|---|
| Field feedback | `--color-field-error`, `--color-control-disabled-text/surface` | Preserve #955c49/#64747c/#edf2f3; legacy `--ios-*` aliases remain available. Web consumers stop implying native design ownership. |
| Card | padding24/narrow16, surface white, existing radius16/shadow | Shared section accepts native id/ref/aria/data props so callers can name regions and report busy state. No global card redesign. |
| Type/spacing/layout | Existing font roles, 4/8/12/14/16/20/24/28/32/48 spacing, control44/narrow48, existing breakpoints | No font substitution, no value normalization or new breakpoint. Component references replace repeated equivalent literals only. |
| Motion | Named aliases for existing control160, spinner800, drawer260/180, backdrop180, menu160/120, dialog220 | No new duration/direction; behavioral timers such as auth redirect and polling remain outside visual tokens. |
| Recovery | ContentState reuses ButtonLink outline for Home recovery | Still a route link, no retry/mutation; current heading/error/domain semantics retained. Narrow hit target follows shared48px control rule. |

## Accessibility and representative region

- CP03-A01 approved D22: error Alert text now uses existing danger #a34b4b on unchanged peach #f8e4d8 (4.66:1, from4.37). Background/border/layout unchanged; this is the sole approved color departure in CP03.

- Required Auth fields expose native required metadata with the existing `noValidate` form and existing domain validation. Preserve names/autocomplete/password bytes, safe returnTo and pending flow.
- Textarea disabled appearance follows existing Input/Select semantics; read-only remains focusable/selectable. Field IDs/error/hint relationships remain owned by Field/useField.
- Reduced-motion shared buttons omit hover/press displacement while retaining color, focus and busy feedback. This enforces the accessibility requirement in AGENTS/CP03, not pending DLT08 timing proposals. Normal-motion timings/transforms stay unchanged.
- ContentState long correlation IDs wrap; all states stay truthful. No generic mutation state machine.
- Overlay JS, return-focus, scroll-lock and busy dismissal behavior stay unchanged; existing nested overlay tests protect lifecycle in both motion modes.

## Verification ownership

Existing design-system preview is extended with required/read-only/password/textarea/conflict/denied/recovery states. It remains fixture-only, without API or storage. Auth fields are the real integration slice; no CP04 page/shell redesign. Unit tests cover native props/ref/draft/description/route semantics; browser tests cover state transitions/keyboard/contrast/reduced/reflow/axe. Screenshots are separate prechange and postchange artifacts. Live Backend, manual assistive technology and native browser zoom require their own evidence; CSS zoom is not a substitute.

PERF01 thresholds are unapproved. Build asset sizes can be recorded as a limited before/after observation, not Web Vitals or runtime performance certification. Pending typography/palette/radius/layout proposals remain in DESIGN_DELTAS.
