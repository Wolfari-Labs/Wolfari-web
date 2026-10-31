# CP-02 — Foundations, component states, motion và performance

30/10/2026. W05-E **DRAFT_FOR_REVIEW**. Giữ current stack React/TypeScript/CSS Modules, Radix/motion/dnd-kit/Query/Router; không thêm dependency/token/source edit trong CP02. Đây là handoff của [DESIGN_SYSTEM](DESIGN_SYSTEM.md), không thay direction D17. Chưa approval cho các deltas.

## 1. Source → semantic mapping

Execution addendum CP03/D21: [implementation mapping](CP03_FOUNDATIONS.md) ghi aliases/value preservation, shared state corrections và Auth representative region. [Verification](CP03_VERIFICATION.md) là evidence hiện tại; bảng CP02 dưới giữ vai trò handoff/history. CP03-A01/D22 duyệt riêng error Alert text contrast, không approve các token/motion proposals khác.

Nguồn [styles](evidence/figma-official/styles.json), [variables](evidence/figma-official/variables.json), Plan instance evidence và [current tokens](../../src/shared/styles/tokens.css). Collection Wolfari có23 variables;4 collections Mobile/native giữ inventory ngoài target, không import234 variables còn lại vào Web chỉ vì có sẵn. Prototype flags không CSS token.

| Role | Figma/catalog | Current CSS và handoff |
|---|---|---|
| Main background/surface | Plan #f6fdff; white cards | `--color-background:#f4fbfe`, surface white. Instance match trước, mismatch DLT04; không đổi palette cả app tùy ý. |
| Ink/title/time | Plan #044791 | `--color-ink:#06458b`, `--color-text` alias; source per-component override khác token phải review. |
| Secondary text | Source #547aad / muted #6c8bb2 | Current #4f7093; giữ readable adaptation tới contrast decision, no blanket source restoration. |
| Actions/selection | Source button endpoints #008ac4/#008eaa; day #009da9; nav #079fc5 | Current action #006b92, gradient #007caa/#007a8d; CSS tokens reuse khi role/value đúng. Gradient+white label cần state/background measurements. |
| Border/field/focus | Source line #bfe5f5; source states chưa đầy đủ | Current line#cdebf7, field#bae4f4, control#6daac0; focus3px ink/offset4 là runtime adaptation. No low-contrast border as only focus signal. |
| Status | Source chips/semantic colors; no full async set | Current warning#8a6500, danger#a34b4b with pale surfaces; keep text/icon + color, no success color for unconfirmed operation. |
| Body/Small/Label | Be Vietnam Pro Regular16/24, Regular13/20, Medium15/22 | Current body16, small13/20, label14/22; source Label15 mismatch DLT04; inline Plan addresses11.5/rows15 are intentional instance roles, not global16. |
| Card/Title/Heading/Display | Be Vietnam Pro SemiBold20/28,24/32; Bold32/40; ExtraBold56/64 | Current roles mostly aligned size; weight/source font import coverage verify per use. Display not used in dense workspace by default. |
| Handwritten | Wolfari/Handwritten Caveat Bold48/52; individual source overrides allowed | Current Patrick Hand. DLT05 unresolved exact font; prefer licensed source font asset when available, no new package or substitution silently. Mobile Kalam/SF Pro not target. |
| Spacing | Source grid/cells vary;4/8/12/16/24/32/48/64 catalog | Current4/8/12/14/16/20/24/28/32/48. No normalize14/20/28 away; use gap/padding from actual node first. |
| Radius | Plan hero10,row8,thumbnail6,nav7; others vary | Existing6/7/8/10/12/16/24 available; do not alias all cards to16 or overlays24 without source. |
| Elevation | Wolfari/Soft shadow x0/y8/blur24/spread0, approx rgba(5,69,140,.1) | `--shadow-soft` compatible intent; raised/overlay/drawer existing values remain adaptations. Native glass/effects not imported. |
| Layout/targets | Header76/sidebar220; Web402 notes and menu source | Runtime collapsed72/narrow header54/drawer280/control44–48. HMA04 source menu/header mismatch; hit target may be larger than glyph without changing asset. |

Token architecture proposal: raw palette/type → semantic purpose → component overrides where source differs. Preserve backwards-compatible aliases until consumers migrated in CP03; no delete `--ios-*` simply because app scope is Web (existing consumers must be audited). Do not connect domain validators/repositories to visual tokens.

## 2. Contrast evidence and decision boundary

Inherited numeric calculation in [PLAN_SPEC](PLAN_SPEC.md), seven solid foreground/white pairs, reviewed here: #0447919.070; #547aad4.408; #6c8bb23.515; current muted#4f70935.158; source primary endpoints3.866/3.853; current primary#006b925.969. Values are ratios, not implementation acceptance.

Review targets proposed for CP03: normal text≥4.5:1; large text/necessary non-text boundary≥3:1, focus visible against actual neighbors, no state conveyed only by color. Need sample opacity/gradient/hover/disabled/error/selected focus backgrounds; solid endpoint calculation does not prove gradient minimum. DLT04/PLN06 decision per actual component; retain accessible runtime color when source insufficient, present delta before applying. No blanket WCAG audit claim from arithmetic or screenshots.

## 3. Component states and ownership

| Existing primitive/pattern | Required reviewed states | Behavior contract / integration slices |
|---|---|---|
| Button/ButtonLink/Icon | default/hover/focus/pressed/disabled/loading; primary/outline/plain/ghost/secondary/destructive | Native button vs route link; name,44px minimum target, stable text/width, busy prevents duplicate. Auth/Plan first migration slices; do not replace button contents with icon alone. |
| Field/Input/Textarea/Select | pristine/filled/helper/required/optional/invalid/disabled/read-only/pending | Label/error id association from Field/useField; Input already password show/hide with aria-pressed; autocomplete preserved. Validation belongs domain, no float money parsing in shared field. |
| Checkbox/radio/Switch | off/on/focus/disabled/invalid; indeterminate only real selection | Native keyboard; checked not implied permission. Policy radio source, prefs Switch behavior; role switch cannot rewrite groups object. |
| Tabs/segments/nav | active/inactive/focus/disabled, wrap/overflow | Route links not role=tab; aria-pressed group remains group unless complete tab arrows/tabpanel are implemented. No source prototype rectangle hotspots. |
| Card/list/table/metric | loading/empty/data/partial-error/stale/selected/read-only | Semantic headers; actual count/money/date; responsive label-value rows, explicit no data; never padding-driven clipped status. |
| Drawer/ConfirmDialog/ActionMenu | open/close/busy/error; Escape/outside click/return focus/trigger removed | Reuse Radix; scroll lock cleanup independent timing; destructive confirm; unresolved operation remains visible outside closed overlay. Nested overlay order tested, no new modal framework. |
| ContentState/Alert/Skeleton/SuccessToast | loading/empty/error/not-found/unavailable/placeholder; info/warning/success | Stable region, correct heading level, live announcement; actual receipt before success; actionable error persistent, toast supplemental. No skeleton hiding auth denial. |
| SplitPanel/TimelineCard/DragOverlay | day/all/pool, resize/keyboard/reduced, empty/locked/conflict | Existing accessible resize + preference; filtered visual list never changes full-order IDs; menu move alternative, no custom reorder transport. |
| Avatar/TravelCollage/TripHero | real image/fallback/long name, source aspect ratio | Keep exact assets/source crop. Placeholder initial/name is not mock identity; cover field null cannot become a false destination photograph. |
| OperationStatus/domain feedback | each domain-specific status mechanism | Fund/lifecycle coordinator only; Plan/Auth/Policy/Invites/Price use their current owners. Share visual Alert, not generic business state machine. |

Component architecture handoff: page orchestrates existing hooks/repos → domain panels receive typed view/handlers → shared accessible primitive styles. Extract only duplicated presentation encountered during implementation; no rewrite of completed components, no generic form engine, no copied fixture adapters. CP03 real integration slice = one Auth field/button state region plus existing design-system preview, not independent application scaffold.

## 4. Current motion → proposed policy

No source animation keyframe/timeline has been verified in these Web frames; do not label current/new timings “Figma motion”. [DESIGN_SYSTEM](DESIGN_SYSTEM.md) proposed120–240ms remains DLT08, not an approved replacement.

| Surface | Current code evidence | Preserve/review |
|---|---|---|
| Button | transform160ms, token150ms color/shadow/opacity; hover translateY(-2), active scale.97; spinner800ms | DLT08 proposal reduced-motion removes transform effects as well as animation; current reduce block removes transition/spinner, not static hover transform. |
| Shell/nav | hover color/shadow160ms | No decorative route-wide entrance added. Focus unaffected by hover animation. |
| Drawer | enter260ms, exit180ms; backdrop180ms | Preserve lifecycle and cleanup; proposed durations only after comparison. No hidden timer delaying dismiss/focus. |
| Menus/confirm/disclosures | Ui enter160/exit120; overlay180/220; disclosure180 | Same shared behavior, no additional stagger. Unknown/error content stays visible until resolved. |
| Plan | row entrance220ms y8→0; drag drop180ms, reduced→no drop animation | Reorder visual feedback follows actual move/command state; reduced useReducedMotion must remain. |
| Home artwork | Static image/cloud/collage | Keep static source; no parallax/loops/reveal on every scroll. |
| Numbers/status | No new animated money/totals specification | Update on authoritative data, no counting that masks partial/unknown state. |

Global reduced-motion in global.css applies0.01ms animation/transition,1 iteration, scroll-behavior:auto; this is source evidence, not browser verification. Review targets: no essential transform animation under reduce, preserve visible final state; focus/locks/polling/guard never depend on animationend. Timed Auth redirect600ms and inbox30s polling are behavior, not motion tokens; do not consolidate them into150ms.

## 5. Performance measurement contract — PERF01 proposed, no benchmark claim

Baseline runtime performance **NOT_RUN** in CP01/CP02; no target below is a current result or approved SLA. Proposed acceptance thresholds to review before CP03/11:

| Measure | Proposed budget | Reproducible procedure |
|---|---|---|
| Initial route content | LCP≤2.5s, CLS≤.1 | Fixed machine/browser/version, build preview, recorded network/CPU throttle,1440 and402.5 cold runs per Home/Auth/Plan/Fund; record each + median, not field percentile claim. |
| Local interactions | User interaction to next paint≤200ms under agreed test environment | Record Performance trace for drawer/tab/filter/editor/reorder. Network pending UI can paint promptly while server operation remains pending; don't count server latency as local animation delay. |
| Regression | Median timings not >10% worse than same-env prechange baseline without approved explanation | Baseline must be measured first. If noise dominates, report distribution and repeat controlled runs; no cherry-picked PASS. |
| Route transfer | Initial-route gzip JS/CSS not >10% above measured baseline without review | Capture build asset manifest + actual network graph; no arbitrary absolute kB claim today. Preserve lazy imports; avoid eagerly loading map/provider/chart everywhere. |
| Background/runtime | No new poll interval/duplicate writes/listeners after navigation; no new animation loop in workspace | Compare request counts and mounted handlers after3 repeated open/close/navigation cycles; existing polling bounded/foreground-only as applicable. |
| Images/fonts | No unexpected layout shift; no duplicate unused font weights or full-frame screenshot as runtime image | Set intrinsic dimensions/aspect ratio; keep above-fold hero available, lazy offscreen media; record font load/FOUT effect. Compression/cropping must retain source fidelity. |

These are lab checks, not production p75/Web Vitals certification. Build duration does not measure UX latency. No profiling/browser/Playwright started in CP02. If browser testing becomes required before implementation approval, follow current user/browser permission rules; local docs work does not authorize account mutations.

## 6. Cross-route responsive/a11y review matrix

| Scenario | Composition spec | Verification owner |
|---|---|---|
|1440 reference | Source hierarchy/spacing/imagery/instance roles, no arbitrary compact header | CP03–10 matched source screenshots; current code evidence is not visual PASS. |
|402 | Home/Fund companions SOURCE; other families explicit extensions in specs | CP04–10 compare reflow, correct public/trip Drawer, no native chrome. |
|320/768/820 | Long content, group wrap, no page horizontal scroll; no essential fields/status hidden | Each feature checkpoint; no new breakpoint assumed approved. |
|1366×520/600 | Scroll/focus reaches form/actions; banners can be above fold, not removed automatically | CP04–09; no first-row visibility metric forcing redesign. |
|Native200% zoom | Reflow/overlay max-height/scroll/footer/focus | Manual browser gate distinct from CSS document zoom. |
|Keyboard/screen-reader | skip link/heading order/names/label/error/status; native radio/tab semantics and alternative reorder | CP03 primitives + every relevant feature journey; current tests not full manual audit. |
|Reduced motion | static final state, no essential delay, no transform movement for sensitive interactions | CP03 shared primitives then Plan/overlay flows; CSS source not runtime PASS. |

Unverified: all new responsive state layouts, gradient/states contrast, screen-reader/runtime/performance. CP02 can deliver reviewable specs and source evidence; it cannot claim implementation DoD or CP03 authorization. Review deltas and missing visual proof separately in acceptance report.
