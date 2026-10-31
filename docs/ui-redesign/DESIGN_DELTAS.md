# CP-02 — Những khác biệt phải review riêng

Ngày30/10/2026. User chốt: “oke. chốt điều đó. Bạn tiếp tục thiết kế. CP-02”. **APPROVED_POLICY**: bám thiết kế Web có sẵn; mọi thay đổi khác nguồn cần trình riêng. Không phải approve các thay đổi dưới đây, không mở CP03 hoặc quyền write Figma.

## Phân loại bắt buộc

Chốt D19/D20,30/10/2026: CP02 COMPLETE với ngoại lệ visual QA WAIVED_BY_USER; xem [nghiệm thu](CP02_ACCEPTANCE.md). Những quyết định D18 đã duyệt được giữ nguyên. Các DELTA_PENDING trong register được bàn giao như proposal chưa áp dụng, không là lý do giữ CP02 mở và không tự thành approval nhờ đóng checkpoint.

Cập nhật D18,30/10/2026: user duyệt3 bố trí đã trình. `APPROVED_LAYOUT` cho PLN08 (centered editor + required fields), phần placement của FND03/XRT05 (right form→below main ở narrow), HMA04 (source header/menu, account/notification access). Các ID có nhiều nội dung chỉ được duyệt phần này; default tabs, chart/copy/validation refinements và những ID khác vẫn pending. Approval design/spec, không permission implementation/Figma writes.

- `SOURCE`: thông tin xác định từ Figma, ghi node/evidence; không tự gọi source proposal là nghiệp vụ đã triển khai.
- `PRESERVE_RUNTIME`: hành vi/contracts/components hiện có, không thêm tính năng và không thay visual tùy ý.
- `DELTA_PENDING`: khác biệt visual/interaction hoặc state bổ sung chưa đủ source; cần review trước implementation.
- `WITHDRAWN`: bỏ khỏi target triển khai; giữ bằng chứng lịch sử.
- `APPROVED_LAYOUT`: user đã chốt phần bố trí cụ thể, tiếp tục review states/reflow trong CP02; không suy approval toàn checkpoint hoặc token/motion khác.

## Đề xuất trước đó — không được áp dụng mặc định

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
| DLT09 | Reflow Plan/Members/Auth tại320/402/768/820; editor full-width; bỏ nested scrolling | DELTA_PENDING ở chi tiết chưa có Web frame. Nguyên tắc Web402 drawer/document flow có SOURCE785:6670; không suy mọi màn có composition đã thiết kế. |

## Plan — khác biệt cụ thể cần quyết định trong design review

| ID | Source → runtime gap | Đề xuất để review, chưa triển khai |
|---|---|---|
| PLN01 |20:236 chỉ day tabs; RuntimeTimeline có ALL/POOL và split toggle | Giữ truy cập ALL/POOL qua controls cùng hệ day navigation, không bỏ hành vi runtime. Trình placement trên source trước CP06. |
| PLN02 |439:2028 panel là selected places chưa xếp lịch; Gateway split hiện là activities chưa có ngày | Giữ panel visual nguồn, label đúng object thực tế. Không biến location thành saved activity bằng local draft; action tạo activity phải qua create contract. |
| PLN03 |439:2497 có map trong Plan; Gateway RuntimeTimeline chưa có day-map; PlanView preview có nút Hiện bản đồ disabled | Trình read projection từ existing coordinates cùng unavailable/list fallback; không hứa route geometry/travel-time provider. Không coi preview đã có map hoạt động; chưa tự mở tích hợp provider. |
| PLN04 | Source có travel totals/connectors, online avatars/cursor, share và thêm ngày | Không hiển thị dữ liệu giả trong Gateway. Review unavailable/explanation hoặc omission từng vùng; không bỏ cả metric strip. “Thêm ngày” không âm thầm sửa Trip dates. |
| PLN05 | Source có thumbnail cho activity; Gateway decoder đặt cover:null | Dùng asset thật chỉ khi là editorial/decorative có nhãn phù hợp hoặc dữ liệu có provenance; nếu thiếu, review row không ảnh/placeholder phù hợp. Không gán ảnh điểm khác vào địa điểm thật. |
| PLN06 | Source text muted và controls nhỏ hơn current accessible adaptations | Đo contrast và target từng cặp; trình token delta có số liệu. Giữ accessibility invariants, không đổi palette toàn app để xử lý một cặp màu. |
| PLN07 | Source chưa chứng minh đủ error/unknown/conflict/editor field states | Bổ sung trạng thái vào vùng hiện có, giữ command hook; xem PLAN_SPEC. Copy/layout bổ sung vẫn phải review, không đồng nghĩa Backend capability mới. |

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

Tất cả `DELTA_PENDING`; evidence/fields/permissions tại [Fund spec](FUND_SPEC.md).

| ID | Gap | Review proposal |
|---|---|---|
| FND01 | Advanced expense/refund/close/Holder controls ngoài current integration | Giữ source hierarchy, giải thích unavailable đúng vùng; không mở mutation mới/handover. |
| FND02 | KPI source khác RuntimeFund fields | Review4 source-shaped cards dùng budget/current/reserved/available và labels đúng; không tổng hợp sai từ partial pages. |
| FND03 | Stacked runtime panels/Drawer khác source main+right context/tabs | APPROVED_LAYOUT D18: form bên phải desktop, dưới content khi narrow. Giữ setup/destination/recovery truy cập được; default-tab và mapping còn lại vẫn review. |
| FND04 | Equal amount/partial receipt/history filters khác current model | Giữ per-member amounts/confirmed destination/timezone deadline; không hứa partial-payment/filter capability chưa wired. |
| FND05 | Async/rejection/recovery/consent states thiếu trong source | Persistent operation region + per-panel errors/reasons; form dismissal không hủy request. |
| FND06 | Old source real-money/QR wording | Giữ TEST/manual text instruction; không provider/QR/receipt/webhook writes hoặc settlement giả. |

## Members — khác biệt cụ thể cần review

`DELTA_PENDING`, source/code/field/state details: [Members spec](MEMBERS_SPEC.md).

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
| XRT04 | Map/Dress/Packing source interactive controls vs Gateway read projection | Source-shaped read-only surfaces + explicit capability, preserve preview separately; no pretend map/provider/upload/apply/save. |
| XRT05 | Price source form phải/chart, runtime Drawer/UTC details | APPROVED_LAYOUT D18 chỉ placement: form phải desktop, dưới nội dung khi Web hẹp. Chart/table/copy còn review; retain UTC/all passengers, stop not delete, MOCK_FLIGHT label. |
| XRT06 | Profile push devices/Notifications full-page/bulk filters khác runtime | Keep profile source cards with actual sessions/preferences; inbox stays existing Drawer, per-item read, no new route/push registration. |
| XRT07 | Admin/404 no canonical implemented design | Current guarded Admin placeholder;404 shared-shell heading/explanation/home recovery, no fake KPIs/business UI. |
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

## Review protocol

Mỗi delta cần source node, current code, lý do, proposed presentation, impact contracts/accessibility và trạng thái approval riêng. Nếu chưa có quyết định: giữ source và runtime semantics, không tự resolve bằng đổi thiết kế hoặc thêm API. CP02 đã đóng bằng D20 với ngoại lệ D19 và báo cáo nghiệm thu; register tiếp tục giới hạn những gì được phép áp dụng ở checkpoint sau.
