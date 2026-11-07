# CP-02 — Những khác biệt phải review riêng

## Finance workspace maintenance — 07/11/2026

User approved the Finance Desktop implementation plan. Existing command forms/lists move
into corresponding settings sections; page retains summary/ledger. This authorizes the
placement change for current work without rewriting historical CP09/CP11 acceptance.
At narrow widths settings navigation becomes a scrollable two-column grid to leave
usable content space. Scoped AXE corrections: active transaction tab uses existing
`--color-action-primary` instead of #008cac (white text was 3.92:1); incoming amount/percent
uses #00795a instead of #008a66 (12px amount was 4.35:1); outgoing amount uses existing
`--color-status-danger`. No global palette change. Full pixel parity/native zoom remain
unverified; see [checkpoint evidence](FINANCE_OVERLAY_WORKSPACE_VERIFICATION.md).

Ngày30/10/2026. User chốt: “oke. chốt điều đó. Bạn tiếp tục thiết kế. CP-02”. **APPROVED_POLICY**: bám thiết kế Web có sẵn; mọi thay đổi khác nguồn cần trình riêng. Không phải approve các thay đổi dưới đây, không mở CP03 hoặc quyền write Figma.

## Phân loại bắt buộc

Chốt D19/D20,30/10/2026: CP02 COMPLETE với ngoại lệ visual QA WAIVED_BY_USER; xem [nghiệm thu](CP02_ACCEPTANCE.md). Những quyết định D18 đã duyệt được giữ nguyên. Các DELTA_PENDING trong register được bàn giao như proposal chưa áp dụng, không là lý do giữ CP02 mở và không tự thành approval nhờ đóng checkpoint.

Cập nhật D18,30/10/2026: user duyệt3 bố trí đã trình. `APPROVED_LAYOUT` cho PLN08 (centered editor + required fields), phần placement của FND03/XRT05 (right form→below main ở narrow), HMA04 (source header/menu, account/notification access). Các ID có nhiều nội dung chỉ được duyệt phần này; default tabs, chart/copy/validation refinements và những ID khác vẫn pending. Approval design/spec, không permission implementation/Figma writes.

Cập nhật D33,31/10/2026: user duyệt riêng PLN01–05, PLN07 và phần Plan Web của DLT09 **đúng theo [CP06 decision packet](CP06_DESIGN_DECISIONS.md)**. Chỉ các phương án trong bảng đó chuyển `APPROVED_CP06_SCOPE`; PLN06, DLT03 và các delta khác vẫn pending. Không suy từ quyết định này quyền đổi Figma, Backend, dependency hoặc làm CP07.

- `SOURCE`: thông tin xác định từ Figma, ghi node/evidence; không tự gọi source proposal là nghiệp vụ đã triển khai.
- `PRESERVE_RUNTIME`: hành vi/contracts/components hiện có, không thêm tính năng và không thay visual tùy ý.
- `DELTA_PENDING`: khác biệt visual/interaction hoặc state bổ sung chưa đủ source; cần review trước implementation.
- `WITHDRAWN`: bỏ khỏi target triển khai; giữ bằng chứng lịch sử.
- `APPROVED_LAYOUT`: user đã chốt phần bố trí cụ thể, tiếp tục review states/reflow trong CP02; không suy approval toàn checkpoint hoặc token/motion khác.

## Đề xuất trước đó — không được áp dụng mặc định

CP11 cập nhật02/11/2026: [CP11-A01](CP11_DESIGN_DECISIONS.md) **APPROVED D50 / IMPLEMENTED_AND_VERIFIED, subset PLN06**: chỉ breadcrumb Plan #079fc5→existing #006b92, chung Gateway/Preview. Browser computed colors #006b92/#f4fbfe cho tỷ lệ5.7066:1; sampled axe contrast PASS. Không duyệt toàn PLN06. Các nhận xét khác ở [CP11 disposition](CP11_REVIEW_DISPOSITION.md), không tự thành approval hoặc roadmap mới.

CP11 D52: user duyệt riêng [CP11-A02–A05](CP11_DESIGN_DECISIONS.md) sau khi chọn gói bốn nhóm và yêu cầu implementation. Tình trạng IMPLEMENTED/VERIFIED trong scope: sửa shell accessible names, hai route link Drawer, Settings read-only summary và timezone Select/custom IANA. Các delta DLT03/PLN06/FND và đề xuất khác vẫn pending; không có approval cho thiết kế lại diện rộng hoặc Backend writer.

| ID | Đề xuất | Trạng thái / xử lý |
|---|---|---|
| DLT01 | Ba ảnh AI Plan, day-rail mới, horizontal navigation mới | WITHDRAWN; xem lịch sử evidence/cp02. Không cần chọn lại. |
| DLT02 | “Travel journal, calm workspace” như một design direction mới | WITHDRAWN như direction thay thế. Giữ brand theo Figma; không giảm trang trí mặc định. |
| DLT03 | Compact trip header, bỏ banner/metric strip, gom sync; sidebar compact mới ở820 | DELTA_PENDING, không áp dụng. Desktop giữ header76/sidebar220/banner/timeline nguồn. Mọi adaptation phải chỉ rõ viewport và evidence, không dùng first-row-above-fold làm điều kiện ép redesign. |
| DLT04 | Đồng loạt body16/24, control/card/overlay radius12/16/24, spacing4px và3 elevation levels | DELTA_PENDING. Đây có phần là CSS đang tồn tại, không đồng nghĩa Figma đồng nhất như vậy. Map theo từng node/component trước, giữ khác biệt có chủ đích. |
| DLT05 | Thay font handwritten hoặc glyph bằng font/icon hiện có | DELTA_PENDING nếu không match source; không thay Caveat bằng Patrick Hand hay icon chỉ vì tên giống. Be Vietnam Pro/Web logo đã có thì reuse đúng asset. |
| DLT06 | Light-first / trì hoãn dark | DELTA_PENDING như quyết định sản phẩm; các frame đang review là light source. Không tự tạo dark hoặc tuyên bố user đã từ bỏ dark. |
| DLT07 | Rút gọn Home storytelling; progressive form tạo Trip; sắp xếp lại Overview/Fund panels | DELTA_PENDING; chưa có approval đổi content/order. Bám source, giữ runtime constraints. |
| DLT08 | Motion mới120/180/220/240ms, route fade, reorder transitions mới | DELTA_PENDING. Không phải motion extracted từ Figma. Reduced-motion/cleanup và existing motion giữ nguyên cho tới review mapping. |
| DLT09 | Reflow Plan/Members/Auth tại320/402/768/820; editor full-width; bỏ nested scrolling | APPROVED_CP06_SCOPE D33 **chỉ cho Plan Web** theo packet: day tabs scroll, metrics reflow, timeline/panel/editor usable ở hẹp/short-height/zoom. Members/Auth và proposal “bỏ nested scrolling” toàn app vẫn DELTA_PENDING. |

## Plan — khác biệt cụ thể cần quyết định trong design review

| ID | Source → runtime gap | Đề xuất để review, chưa triển khai |
|---|---|---|
| PLN01 |20:236 chỉ day tabs; RuntimeTimeline có ALL/POOL và split toggle | APPROVED_CP06_SCOPE D33: day tabs sau banner; ALL/POOL sau các ngày trong cùng thanh, default ALL giữ nguyên; filter read-only, drop permission giữ. |
| PLN02 |439:2028 panel là selected places chưa xếp lịch; Gateway split hiện là activities chưa có ngày | APPROVED_CP06_SCOPE D33: panel hai nhóm selected places chưa xếp và saved POOL activities; chọn địa điểm mở editor prefill, tạo chỉ sau explicit submit qua create contract. |
| PLN03 |439:2497 có map trong Plan; Gateway RuntimeTimeline chưa có day-map; PlanView preview có nút Hiện bản đồ disabled | APPROVED_CP06_SCOPE D33: map/pool là alternative right panel; scoped day markers khi provider thật sẵn có, unavailable/list fallback khi thiếu; không vẽ route/travel giả. |
| PLN04 | Source có travel totals/connectors, online avatars/cursor, share và thêm ngày | APPROVED_CP06_SCOPE D33: giữ bốn metrics với scope rõ và unavailable trung thực; không presence/share/Add day giả. |
| PLN05 | Source có thumbnail cho activity; Gateway decoder đặt cover:null | APPROVED_CP06_SCOPE D33: type icon/badge và cover thật nếu có, thiếu thì neutral/empty; shared TripHero giữ đến khi asset delta riêng. |
| PLN06 | Source text muted và controls nhỏ hơn current accessible adaptations | Đo contrast và target từng cặp; trình token delta có số liệu. Giữ accessibility invariants, không đổi palette toàn app để xử lý một cặp màu. |
| PLN07 | Source chưa chứng minh đủ error/unknown/conflict/editor field states | APPROVED_CP06_SCOPE D33: feedback/reconcile gần timeline và trong editor; giữ command hook/recovery, không toast-only hoặc Finance lifecycle. |

## Home/Auth — khác biệt cụ thể cần review

Tất cả HMA là `DELTA_PENDING`; semantics đang tồn tại là `PRESERVE_RUNTIME`. Chi tiết và source/code links: [Home/Auth spec](HOME_AUTH_SPEC.md).

| ID | Source → runtime gap | Đề xuất để review, chưa triển khai |
|---|---|---|
| HMA01 |768:5376/5746/780:6444 có video CTA; HomePage hiện anchor tính năng và guest/user CTA khác label | Giữ honest target hiện có, review label/placement; chưa có video nên không tạo player giả hoặc chuyển route tùy ý. |
| HMA02 | Source marketing promises, Xem tất cả/favorite, device art; current editorial/capability copy | Giữ section order/assets; review copy đúng Web-only/current capabilities; không khẳng định realtime/optimization/favorites/market price chưa wired. |
| HMA03 |768:6211 không hiển thị fullName/consent;768:6118 có info note và không forgot link như runtime | Giữ required fields/validation/session; review đưa fullName trước email, consent/help trước CTA, forgot link tại footer; current consent error copy “xem trước” cần chỉnh trong CP04 sau review. Không thêm Backend consent payload. |
| HMA04 | Web402 logo trái/Menu phải, menu source khoảng300px/logo/mascot; current header hamburger trái/logo giữa/account phải và Drawer280px | APPROVED_LAYOUT D18: source-aligned public/trip header/menu composition, preserve correct routes/focus/account/notification access; không copy active Fund nav vào Home guest. Chi tiết responsive/visual QA còn lại. |

CP04 implementation theo D18/HMA04: public/trip Web header dùng logo trái/Menu phải; trip Drawer max300px với logo/Đóng/mascot từ assets hiện có; account/notification và đúng route context được giữ. [Verification](CP04_VERIFICATION.md) ghi responsive/focus/zoom evidence. HMA01/02/03/05 và XRT06/07 không tự chuyển sang APPROVED; các thay đổi copy/semantics chỉ phản ánh Web-only scope và Backend contract đang có, không cấp phép bố cục mới.
| HMA05 | Recovery/async/short-height/Auth narrow chưa có dedicated Web frame xác định | Extension theo Auth card family với state matrix trong spec; không redesign hoặc tạo wizard. Review manual success link/timing, pending edit policy và reflow trước implementation. |

## Fund — khác biệt cụ thể cần review

FND01/FND02/FND04/FND05/FND06 là `DELTA_PENDING`; evidence/fields/permissions tại [Fund spec](FUND_SPEC.md) và phương án CP09 cụ thể tại [CP09 decision packet](CP09_DESIGN_DECISIONS.md). FND03 đã duyệt riêng phần placement theo D18.

| ID | Gap | Review proposal |
|---|---|---|
| FND01 | Advanced expense/refund/close/Holder controls ngoài current integration | Giữ source hierarchy, giải thích unavailable đúng vùng; không mở mutation mới/handover. |
| FND02 | KPI source khác RuntimeFund fields | Review4 source-shaped cards dùng budget/current/reserved/available và labels đúng; không tổng hợp sai từ partial pages. |
| FND03 | Stacked runtime panels/Drawer khác source main+right context/tabs | APPROVED_LAYOUT D18: form bên phải desktop, dưới content khi narrow. Giữ setup/destination/recovery truy cập được; default-tab và mapping còn lại vẫn review. |
| FND04 | Equal amount/partial receipt/history filters khác current model | Giữ per-member amounts/confirmed destination/timezone deadline; không hứa partial-payment/filter capability chưa wired. |
| FND05 | Async/rejection/recovery/consent states thiếu trong source | Persistent operation region + per-panel errors/reasons; form dismissal không hủy request. |
| FND06 | Old source real-money/QR wording | Giữ TEST/manual text instruction; không provider/QR/receipt/webhook writes hoặc settlement giả. |

## Members — khác biệt cụ thể cần review

`APPROVED_CP08_SCOPE` chỉ cho MBR01–MBR05 theo D41, source/code/field/state details: [Members spec](MEMBERS_SPEC.md) và [CP08 decision packet](CP08_DESIGN_DECISIONS.md). D38 chỉ mở checkpoint; D41 duyệt rõ năm mã ngày01/11/2026. Recipient card `299:2042` context đã đọc thành công trước W05, full parent `299:2010` Transport closed giữ như lịch sử. CP08 [APPROVED/DONE](CP08_ACCEPTANCE.md) theo D43 với QA limits; các delta khác vẫn pending.

| ID | Gap | Review proposal |
|---|---|---|
| MBR01 | Owner transfer, Holder badge và count mẫu không tương ứng đủ runtime | Không activate transfer; badge/count chỉ authoritative data, không suy Holder=Owner. |
| MBR02 | Runtime EMAIL/LINK/filter/one-time link/recovery vượt email-only source frame | Giữ form trái/list phải, thêm đúng controls hiện có và feedback trong cùng vùng. |
| MBR03 | Radio-card source vs current Select policy | Native radio source treatment, preserve membership IDs/journal/receipt reconciliation. |
| MBR04 | Recipient source metadata nhiều hơn preview actual | Centered card dùng actual trip/inviter/expiry/status; recovery/login/wrong-account states, không fake4/6. |
| MBR05 | Narrow/short-height/async states chưa có dedicated frame | Member/invite/policy reflow và persistent status spec; review trước implementation. |

## Các route còn lại và performance

`DELTA_PENDING`; exact compositions/fields/state proposals tại [Route gaps](ROUTE_GAPS_SPEC.md), [Foundations](FOUNDATIONS_HANDOFF.md).

| ID | Source/current gap | Concrete review proposal |
|---|---|---|
| PLN08 | Overlay26:406-A là centered activity editor; runtime right Drawer, fields nhiều hơn | APPROVED_LAYOUT D18: centered modal theo nguồn; giữ source title/actions/field grouping và đủ type/description/publicDescription/end-date theo contract. Tiếp tục state/narrow/short-height composition; không bỏ fields để ép khớp source height. |
| XRT01 | Trip create source có destination/map/style/budget/cover ngoài current create | APPROVED D29: source two-column Web desktop, supported fields trái, capability explanation phải; narrow form trước side panel; no wizard/API expansion or fake controls. Gateway screenshot/QA phải dùng runtime thật. |
| XRT02 | Custom create-success dialog/focus, “Tiếp tục chỉnh sửa” chỉ dismiss | APPROVED D29: giữ visual/source mascot, dùng shared accessible overlay behavior; primary mở Trip, secondary “Đóng thông báo” xóa form draft cũ sau success. Không auto POST/navigation khi đóng. |
| XRT03 | Overview/settings source data/reminder/lifecycle khác actual | Giữ section order, per-panel unknown/error/capability; name/description/publicDescription edit, other fields không tự active. |
| XRT04 | Map/Dress/Packing source interactive controls vs Gateway read projection | APPROVED_CP07_SCOPE theo D36 **chỉ** ba phương án CP07-M01/D01/P01 trong [CP07 decision packet](CP07_DESIGN_DECISIONS.md): source-shaped read-only Gateway surfaces + explicit capability, preserve Preview separately; no pretend map/provider/upload/apply/save. Màu/font/motion/asset departures khác vẫn pending. |
| XRT05 | Price source form phải/chart, runtime Drawer/UTC details | APPROVED_LAYOUT D18 cho placement: form phải desktop, dưới nội dung khi Web hẹp. **PWT01 APPROVED D46** cho Gateway lịch sử dạng dòng quan sát thật, source/time/freshness/error; không dựng chart tĩnh hoặc suy giá thấp nhất. Source card decoration/palette và delta khác còn review. Retain UTC/all passengers, stop not delete, MOCK_FLIGHT label. [Decision packet](CP10_DESIGN_DECISIONS.md). |
| XRT06 | Profile push devices/Notifications full-page/bulk filters khác runtime | **NTF01 APPROVED D45** trong [CP10 packet](CP10_DESIGN_DECISIONS.md): keep profile source cards/current sessions/preferences, inbox in existing Drawer/per-item read, no new route/bulk/push registration. |
| XRT07 | Admin/404 no canonical implemented design | **ADM01 APPROVED D45** trong [CP10 packet](CP10_DESIGN_DECISIONS.md): guarded Admin placeholder with truthful same-geometry copy; no fake KPIs/business UI. 404 existing shared-shell recovery is outside CP10. |
| PERF01 | No measured performance baseline | Proposed lab budgets/procedure in FOUNDATIONS_HANDOFF; review thresholds before enforcement. No current performance PASS. |

## Không phải thay đổi direction

Sessions/guards/query keys, expected versions/idempotency, timezone/date-only/overnight, opaque cursors, int64 money, permission separation, truthful pending/unknown, keyboard/focus/return/reduced-motion là yêu cầu bảo toàn. Tái sử dụng primitives thay vì rewrite không cho phép restyle khác nguồn mặc định. Các đề xuất cấu trúc code chỉ triển khai trong checkpoint tương ứng sau approval.

## CP03 maintenance scope — D21

| ID | Evidence | Proposed change / approval |
|---|---|---|
| CP03-A01 | Axe state grid reports Alert error #955c49 on #f8e4d8 at4.37:1 (13px), below4.5:1; current CSS inherited from baseline. | APPROVED D22/user30/10: use existing `--color-status-danger` #a34b4b for error Alert text (4.66:1); inherited icon follows text, background/border/layout unchanged. No palette-wide approval. |
| CP05-A01 | CP05 Overview axe review found existing cyan `--color-active` #079fc5 links, activity times and selected-day controls below4.5:1 on light/white surfaces (2.96–3.09:1). | APPROVED by user30/10/2026: use existing `--color-action-primary` #006b92 only for affected Overview breadcrumb/workspace links plus PlanSummary activity times and selected-day control; no new token or palette-wide normalization. Source composition/layout unchanged. Preview Create muted Figma-only controls remain a separate finding. |
| CP05-A02 | Built fixture Create at1440 has15 small muted/cyan text nodes below4.5:1 (2.86–4.34:1), at402 has4; current CSS predates CP05 and controls are Preview/Figma-only, not Gateway Create payload. | APPROVED by user30/10/2026: change only affected muted labels/help/captions to existing `--color-muted` #4f7093 (minimum calculated4.85:1 on tested light surfaces) and cyan text to existing `--color-action-primary` #006b92 (minimum5.61:1). No layout, controls or Backend change; retain original FAIL evidence. |
| CP04-R01 | Desktop Trip sidebar cuts the initial Settings link by22px at1440×960; nav can scroll but first render hides part of the active item. | APPROVED D29: adjust sidebar height/scroll allocation so the full link is visible on initial desktop render, preserving order/labels/decoration. Record as bounded repair of CP04 Shell, not CP06 scope. |
| CP04-R02 | Home `TravelCollage` figcaptions #0089c5 on white measure3.90:1; note #008ca9 on #fff7cc measures3.65:1 in dev fixture. | APPROVED D29: only affected text uses existing `--color-action-primary` #006b92; calculated5.97:1 on white,5.52:1 on yellow. Keep backgrounds/layout; repeat browser axe check. |
| CP05-A03 | Gateway success-dialog axe found “HOÀN TẤT” #079fc5 on white3.09:1 and description #6f879e on white3.72:1. | APPROVED D30/user31/10: only these two text selectors use existing `--color-action-primary` #006b92, calculated5.97:1 on white. Preserve background, layout and behavior; repeat browser axe. |

[Implementation mapping](CP03_FOUNDATIONS.md) giữ source direction và current values. Semantic aliases/normal-motion timing extraction/Card native props không phải visual redesign. Accessibility corrections trong scope CP03: native required metadata trên Auth, disabled Textarea parity, long correlation wrapping, shared Home recovery link với target44/48px, và loại displacement của Button khi người dùng chọn reduced motion. Không đổi normal-motion duration/transform, không approve DLT08 mới120/180/220/240ms, không thay font/palette/radius/layout pending. D18 feature layouts vẫn thuộc checkpoints sau.

## Plan presentation cleanup — approved 06/11/2026

User explicitly requested implementation of the reviewed “Chỉnh lịch trình” plan. This is a bounded maintenance change, not a new checkpoint or reopening CP02 visual QA.

| ID | Source/current presentation | Approved change and boundary |
|---|---|---|
| PLN09 | Plan main `20:236`; `PlanMetrics` adds ordinal day labels and long metric captions | Keep four metrics and existing calculations; show `D/M` (for example `6/11`) in each selected-day caption, with short labels Hoạt động/Địa điểm/Trải nghiệm/Di chuyển. Keep Cả chuyến/Chưa chọn ngày scopes, the `—` unknown-duration value and the screen-reader-only missing-hours note; remove visible no-data explanation. Day-filter labels are unchanged. |
| PLN10 | Gateway success Alert persists after an authoritative save/refetch | Remove only “Đã lưu thay đổi.”; retain pending/error/conflict/partial/unknown/recovery and existing command locking. Tests wait for authoritative data and unlocked controls, not the removed success text. |
| PLN11 | Shared numbered timeline rail extends through the final row's bottom padding | Only rows followed by another activity keep connecting padding; the final/single row rail ends at the card bottom. Apply to Gateway/Preview, narrow layouts, ALL groups and read-only lists; end-drop targets are not activities. Preserve drag/drop indicators and business behavior. |

[Scoped implementation and verification](PLAN_PRESENTATION_CLEANUP_VERIFICATION.md). Historic checkpoint acceptance and NOT_RUN limits remain unchanged.

## Price Watch compact overlay — approved user request 07/11/2026

User explicitly supersedes the inline form placement in D18/XRT05 for this surface
(desktop source `768:7992`, reference `23:657`, responsive `781:6626`): reduce vertical
spacing, chart radius to 6px, create action opposite title, form only on demand in
a centered Finance-style overlay. Existing cards fit content; remaining workspace
uses two columns in Preview and one in Runtime (no fixture chart promoted to Gateway).
Shared Drawer preserves keyboard/focus behavior; existing contracts/recovery unchanged.
[Verification](PRICE_WATCH_OVERLAY_VERIFICATION.md). Not a new CP10 acceptance.

## Review protocol

Mỗi delta cần source node, current code, lý do, proposed presentation, impact contracts/accessibility và trạng thái approval riêng. Nếu chưa có quyết định: giữ source và runtime semantics, không tự resolve bằng đổi thiết kế hoặc thêm API. CP02 đã đóng bằng D20 với ngoại lệ D19 và báo cáo nghiệm thu; register tiếp tục giới hạn những gì được phép áp dụng ở checkpoint sau.

## Finance overlay box correction — 07/11/2026

User requested correction of missing boxes/layout against Figma. General and receiving
now use bordered pale fields and status tiles, members/contributions full-width content.
Contract-safe retained differences: derived trip fund name, VND instead of unsupported
description, actual balance rather than fabricated cumulative receipts; no totals from
partial pages, no unsupported mutation controls. Existing budget form remains the only
budget write path. No change to historical acceptance or pending domain integration.

User-requested spacing follow-up: preserve desktop Figma action area, but remove
its fixed-height spacer when cards stack at <=1024px. Use explicit 16px block gaps
instead of collapsed/cumulative legacy margins; no business behavior changes.

Subsequent explicit user approval supersedes fixed desktop card height: General and
context fit their content, receiving add action sits right of title in one card,
list/form outer wrappers lose redundant borders. FIN/26 discard semantics use the
shared compact confirmation dialog rather than a full-page mockup; Back replaces
Close form. Only local draft is discarded; sent operations/recovery are preserved.
