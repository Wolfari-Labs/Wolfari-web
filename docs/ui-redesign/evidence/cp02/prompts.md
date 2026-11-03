# CP-02 visual exploration — exact ImageGen prompts

Generated30/10/2026 with built-in ImageGen, three independent calls, no CLI/API fallback. Preview concepts only; not exported Figma frames or runtime screenshots. Requested1440×1024; actual1487×1058 for all three, no rescaling performed. References were opened and passed to every call.

References in input order:

1. `docs/ui-redesign/evidence/figma-official/768-7123.png`
2. `docs/ui-redesign/evidence/baseline/plan-1366x520.png`
3. `docs/ui-redesign/evidence/figma-official/768-5376.png`

Each exact prompt is the shared block plus its direction block. `transparent_background:false` for all calls.

## Shared block

```text
Use case: ui-mockup. Create a realistic, production-quality Wolfari Web Plan screen, 1440 x 1024, full browser content only, no device bezel or browser chrome. Focused primary screen with clear hierarchy, readable Be Vietnam Pro typography 14-16px body, one primary action "Thêm hoạt động". No cards within cards. Use whitespace, alignment and subtle row separators before borders or shadows. No gratuitous metrics or features.
References attached: Image1 official Web Plan frame768:7123 from https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace; preserve recognizable Wolfari logo, blue/teal brand and timeline language but compact its oversized chrome. Image2 actual current Web HTTP-mock baseline at1366x520 demonstrates content below fold; improve vertical density. Image3 official Home frame768:5376 is brand-only inspiration; do not copy its device mockups or landing hero into workspace.
Current date anchor2026-10-30 Asia/Ho_Chi_Minh. Illustrative upcoming trip "Đà Nẵng 3N2Đ", "01–03/11/2026", active "Ngày 1 · 01/11", Sunday. Top small annotation "Dữ liệu minh họa · Đề xuất CP-02". No claims of live data or server save. Day navigation "Tất cả", "Chưa chọn ngày", "Ngày 1", "Ngày 2", "Ngày 3". Activities in order: "08:00–10:30" "Bán đảo Sơn Trà"; "11:30–13:00" "Ăn trưa hải sản"; "14:00–16:00" "Bãi biển Mỹ Khê"; "19:00–20:30" "Cầu Rồng". Use sparse small location subtitles, simple outline icons and unchecked completion controls. White/pale-blue surfaces, ink#06458b, muted#4f7093, primary#006b92, accents teal. Controls radius12px, meaningful panels16px, generous44px targets. Handwritten styling only tiny editorial accent if needed. Single coherent screen, no concept comparison or option numbers printed.
Constraints: Web only, no native mobile chrome, no new logo, no dark mode, no AI controls, no booking, no online presence badges, no unsupported share/export, no invented travel durations, no financial metrics, no calendar drag-and-drop fantasy. Preserve route access, honest read/pending semantics. No enormous trip banner. Do not sacrifice legibility to decoration.
```

## Displayed image 1 — Nhật ký gọn

```text
Direction name: "Nhật ký gọn". Composition: persistent220px white left navigation with Wolfari logo at top, compact items Tổng quan, Lịch trình active, Bản đồ, Dress code, Packing list, Thành viên, Quỹ nhóm, Theo dõi giá vé, Cài đặt. Quiet minimal brand mascot at bottom only if it fits naturally. Compact64px global header for Chuyến đi của tôi, notifications/account. Main wide single-column journal timeline, compact trip title/date context, title Lịch trình with primary CTA at right, horizontal day tabs immediately above full-width rows. First activity begins near y300. Four spacious activity rows with time column, slim teal timeline markers, titles and ellipsis menus, no giant photos. Bottom modest dashed text add-row affordance. Calm spacious journal with great scanning and no supporting side panel.
```

## Displayed image 2 — Tập trung theo ngày

```text
Direction name: "Tập trung theo ngày". A genuinely compact task-focused layout, NOT the large scenic banner from references. Strictly NO landscape photograph, hero, mascot illustration or scenic header anywhere. Use two left columns:72px compact global navigation rail with recognizable small logo and labeled menu button, then200px day-navigation rail under trip context containing Tất cả, Chưa chọn ngày, Ngày1 selected, Ngày2, Ngày3. Route access via labeled "Chuyến đi" menu, no invented route destinations. Main header at y0–64 notifications/account. Trip title/date compact one-line at y80. Main wide timeline starts at x310,y240; heading "Chủ nhật, 01/11" and primary add CTA above. Four lightweight rows as one grouped list; a selected row is highlighted pale teal but no edit panel, no extra metrics. Narrow right supporting area only for a single "Chưa chọn ngày" note item "Dạo phố ven sông" with small "Chọn ngày" action, not a map. Calm utilitarian, wide comfortable whitespace, no card nesting, distinct vertical day navigation hierarchy. Make content visible early, no banner. Label mock data.
```

## Displayed image 3 — Không gian ngang

```text
Direction name: "Không gian ngang". Explicit structural departure: NO left sidebar and NO day rail, NO scenic banner or hero image anywhere. Full-width top64px global bar, Wolfari logo left, Chuyến đi của tôi link, notification/account right. Second compact horizontal WORKSPACE ROUTE NAV bar with Tổng quan, Lịch trình active, Bản đồ, Thành viên, Quỹ nhóm and "Thêm" overflow for remaining existing routes. Main content max-width1200 centered on white base surface, no app-in-card background. At y160 show compact one-line trip title/date, at y220 Lịch trình and primary CTA. At y280 slim horizontal day tabs. At y340 four wide timeline ROWS spanning content width, with checkbox/time/teal dot/title/location aligned cleanly and ellipsis at far right. No repeated trip title, no side panel, no decorative mascot, no large image. Use fine dividers and typography not individual cards. Bottom simple text "Chưa chọn ngày · 1 hoạt động" as link, not new panel. Main advantage is horizontal breathing room with earlier task content. Mock data note small at top. Keep exact brand, readable UI and restrained teal active indicators.
```

