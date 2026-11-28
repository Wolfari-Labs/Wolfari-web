# CP-02 — Những khác biệt phải review riêng

## POI-HERO-IMAGES — 26/11/2026 — DELTA_PENDING

User-requested: show the licensed POI photo the Backend already serves (`hero_image`, places
contract 1.2.0) instead of the static Figma artwork. Each item is pending review and approves
nothing else. Evidence: unit/component tests only (jsdom); no browser screenshot or live Backend.

| Mã | Khác biệt so với template | Lý do / phạm vi |
| --- | --- | --- |
| POIIMG-01 | Thẻ "Đang chọn" (desktop, Gateway): ảnh 230×90 dùng ảnh thật của địa điểm (`object-fit: cover`, `loading="lazy"`, alt = tên địa điểm) thay cho artwork, kèm một dòng chữ nhỏ 12px màu muted ngay dưới ảnh là dòng ghi nguồn (ví dụ "Ảnh: An · CC BY-SA 4.0 · Wikimedia Commons"), liên kết tới trang nguồn (tab mới, `rel="noopener noreferrer"`). Không có ảnh hoặc ảnh lỗi tải: giữ nguyên artwork và nhãn "Ảnh minh họa". Thẻ mobile (≤ 768 px, đang đóng băng) giữ artwork. | Giấy phép CC BY/BY-SA bắt buộc ghi nguồn cạnh ảnh. |
| POIIMG-02 | Panel "Chi tiết địa điểm" (bố cục hẹp, Gateway): ảnh bìa 354×228 dùng ảnh thật (cùng quy tắc), dòng ghi nguồn ngay dưới ảnh. | Cùng lý do; không thêm control hay panel mới. Ảnh chỉ có khi địa điểm nằm trong kết quả tìm kiếm hiện tại (Plan không lưu ảnh). |

## PAYOS-WEB — 26/11/2026 — DELTA_PENDING

User-requested Web support for payOS real-money contributions (Backend main, finance-payments
1.1.0 / finance-contributions 1.4.0). Behaviour follows the merged contract; each visual or
interaction item below is pending review and approves nothing else. MoMo Sandbox flows, labels and
the "MoMo & đối soát" section are unchanged. Evidence: unit/component tests with HTTP mocks only;
no live payOS, Gateway or bank run.

| Mã | Khác biệt so với template | Lý do / phạm vi |
| --- | --- | --- |
| PAYOS-01 | Hướng dẫn "Mã QR chuyển khoản" thêm nút chính "Thanh toán qua payOS" trước "Tôi đã chuyển — Báo đã chuyển" (nút báo chuyển đổi sang kiểu outline chỉ khi có payOS). Chỉ hiện khi khoản đóng PENDING là của người xem và `online_payment_providers` có `PAYOS`. Bấm mở drawer xác nhận dùng chung (`FinanceAction`) với câu "payOS — chuyển tiền thật, vào thẳng tài khoản của người giữ quỹ…" thay cho câu "MoMo Sandbox — không chuyển tiền thật". | Một hành động chính mỗi nhóm; tiền thật cần một bước xác nhận. |
| PAYOS-02 | Sau khi tạo, phía trên vùng QR có thẻ trạng thái (thẻ `FinanceRecords.record` sẵn có): trạng thái payOS ("Đang chờ thanh toán trên payOS", "Quỹ đã nhận tiền", …), số tiền, liên kết "Mở trang thanh toán payOS" (tab mới, `rel="noopener noreferrer"`), hạn link, ghi chú tài khoản ảo payOS (LOCC…), nút "Kiểm tra trạng thái". Web đọc lại `GET /payment-attempts/{id}` mỗi 3 giây khi tab đang hiện, tối đa 15 phút. Khi Finance khóa mã QR vì đang có thanh toán (409), vùng QR hiện "Mã QR chuyển khoản tạm ẩn…" thay cho thẻ lỗi; "Báo đã chuyển" bị khóa trong lúc đó. | Trạng thái trung thực, không suy từ trang payOS. |
| PAYOS-03 | Trang Quỹ mở với `?provider=PAYOS` hiện một hộp (panel sẵn có) "Đang kiểm tra kết quả thanh toán…"; sau khi đọc lại quỹ đổi thành câu trung tính + thẻ trạng thái của lượt đã lưu trong tab (nếu có) + "Xem khoản đóng" / "Đóng thông báo". Query bị xóa khỏi địa chỉ (replace). | Query từ trang return không phải bằng chứng. |
| PAYOS-04 | Thẻ thanh toán trong "MoMo & đối soát" hiện nhãn payOS, dòng "payOS · tiền thật…", liên kết "Mở trang thanh toán payOS" và câu xác nhận payOS trong drawer đối soát khi lượt là `PAYOS`; lượt MoMo giữ nguyên chữ. Lịch sử thao tác: `CREATE_PAYMENT_ATTEMPT` đổi "Tạo lượt thanh toán MoMo" → "Tạo lượt thanh toán trực tuyến"; thêm "payOS báo tiền về" / "Đối soát payOS tự động". Thông báo xung đột `PAYMENT_PROVIDER_ACCOUNT_MISMATCH` có câu riêng. | Nhãn đúng nhà cung cấp. |

## Finance demo completion — 16/11/2026

User-requested Web/Backend parity for the Finance demo; no new checkpoint, no Figma writes.
Pending review as visual deltas (behavior follows the merged Backend contracts):

- **VietQR**: transfer instruction shows the Finance-rendered QR image (280px, white
  plate) above the existing field list, plus copy buttons for account number and transfer
  content. "TEST" badges/labels are replaced by neutral wording ("Ứng dụng chỉ ghi nhận,
  không tự chuyển tiền"); the state bar badge reads "VietQR". Bank code becomes a select
  from `GET /finance/banks` with a typed-code fallback when the list cannot load.
- **Holder handover**: the existing "Bàn giao Fund Holder" overlay section (previously an
  unavailable placeholder) renders a record list built from the shared Finance record
  card, action drawer and Alert primitives — no new tokens or layout patterns.
- **Expense receipt**: a native file input inside the shared action drawer and a plain
  "Xem chứng từ" button on the expense card.
- **Refund verification**: extra text lines on the refund card (who confirms, how it was
  confirmed) and one more action ("Chỉ định người kiểm chứng").
- **Conflict reasons**: Operation status shows a specific sentence when the Gateway
  returns `error.details.reason`; generic text remains the fallback.

## Overview light-blue border trial — 08/11/2026

User requests a more visible light-blue outline for review. Overview panels and
postcard use1px #a6d9f2 instead of #dceffa; radius6px, geometry, shadow and all
shell/hero/other-page styles stay unchanged. This is a local user-requested trial,
not approval of unrelated palette deltas.

## Overview corners and column alignment — 08/11/2026

Explicit user request authorizes5–7px corners: use6px for overview cards,
postcard, itinerary rows, map label and description popup; existing5–6px inner
controls stay unchanged. Header/sidebar/shared TripHero remain untouched.
Both desktop rows now share the existing KPI column ratios and13px gaps;
itinerary spans the first two columns, Map aligns with Fund, Fare with Packing.
Narrow viewport reflow is preserved. This supersedes the independent lower-row
ratios and larger overview corners only, not other pending design deltas.


## Trip geometry refinement — 08/11/2026

User explicitly requests20–25px below overview progress: choose22px (current Figma
source19px), retain162px cards on short desktops with internal workspace scrolling.
Fare empty state adds a dash like Weather. Fund/Price Watch use the existing Plan
horizontal geometry instead of their legacy1220px cap; vertical layouts unchanged.
[Verification](TRIP_GEOMETRY_VERIFICATION.md). No approval of unrelated pending deltas.

## Trip overview follow-up — 08/11/2026

Explicit user correction: clickable function cards, concise fund/fare/map content,
visible fund/packing progress and source-accurate overview text/button colors.
Restored current Figma colors locally; this supersedes07/11's darker-color choice
below, not global palette or historical checkpoint decisions. Known consequence:
AXE color-contrast FAIL remains recorded and the strict assertion is retained;
source fidelity is not WCAG approval. Fund progress means current balance/budget;
unknown budget is not a fabricated zero. Runtime errors/version/permission guards
remain intact. [Evidence](TRIP_OVERVIEW_FOLLOWUP_VERIFICATION.md).

## Trip overview maintenance — 07/11/2026

User explicitly requested current Figma Desktop overview fidelity, unchanged header/sidebar,
a browser-bounded overview and Plan-style banner across all trip feature pages.
This authorizes the refreshed overview visual treatment and internal scrolling needed to
keep short/narrow browser viewports bounded. The shared Plan landscape banner supersedes
the Overview Figma city hero for this task. Preview Dress code now uses the same banner
and real trip title/dates/lifecycle rather than its previous synthesized3N2Đ summary.
Source Nunito is local to overview content; global font and shell styling are unchanged.
PRESERVE_RUNTIME: existing accessible action/muted colors, permissions, unavailable data,
member pagination feedback and real navigation. Map illustration is visibly labelled;
source sample weather/fare/fund numbers are not runtime data. See
[comparison and verification](TRIP_OVERVIEW_REFRESH_VERIFICATION.md). No blanket approval
of historical pending deltas, no Figma writes and no reopening of closed checkpoints.

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

## Vietnamese Create Trip dates — approved user request 08/11/2026

User explicitly requests dd/mm/yyyy instead of browser-locale-dependent date text
on Create Trip. Both Preview and Gateway use a shared text field with an explicit
format hint and keyboard-accessible native calendar control. Existing field styling,
date validation, draft recovery and ISO/timezone API semantics are preserved.
No official Figma writes, Backend or dependency changes; no new checkpoint.
Built Preview responsive6/6 and Gateway HTTP-mock5/5 (including axe) PASS.

## Review protocol

### SYNC-MAP-A11Y — 17/11/2026 — APPROVED_BY_USER

Merge-readiness review found existing Gateway Map filter/toolbar text contrast failures (approximately 3.8–4.4:1 against a 4.5:1 requirement). User explicitly approved the bounded contrast repair on 17/11/2026. Applied only to affected filters, status chips and map-type button in `TripMapPage.module.css`: selected text and active button backgrounds use existing `--color-action-primary`; scheduled text uses `#087653`; unscheduled text uses `#8a5d00`. Matching responsive filter variants follow the same text colors. Calculated ratios are 5.19–5.97:1. Active teal button backgrounds are darkened to preserve white labels; other backgrounds, layout, controls and interactions remain unchanged. No backend/API change or new redesign checkpoint. Original failures remain historical; fresh browser verification belongs in the main-sync report. Axe assertions remain enabled.

### Provider integration correction — 12/11/2026

User explicitly rejected the extra Map panels/forms and requires the approved template to remain intact. The earlier statement that provider integration authorized presentation changes was incorrect and is superseded. Runtime Map now reuses the existing TripMapPage composition, CSS, compact hero, search, filters, selection checkboxes, map toolbar/cards and PlaceDetail. Existing checkbox/heart controls persist selections through the Gateway; the existing itinerary link opens the existing Plan editor flow. Manual coordinates use the existing pin affordance and shared Drawer, not an always-visible panel. Leaflet occupies the existing map canvas. Price form/card layout and design tokens stay unchanged; provider constraints/status labels remain truthful. The satellite control reports unsupported capability rather than substituting another map. No Figma writes, redesign, commit/push or deployment. Earlier tests of the rejected layout remain historical; fresh correction verification is recorded separately in the root report.

### MAP-POI — 18/11/2026 — TASK_AUTHORIZED

Authority: owner task brief `docs/agents/AGENT_PROMPT_MAP_POI_DEMO.md` §3.1 (D57), Web stream W, local demo only. Each item lists what departs from the approved template so it can be reviewed separately; none of them approves other pending deltas.

| Mã | Khác biệt so với template | Lý do / phạm vi |
| --- | --- | --- |
| MPOI-01 | Plan Gateway “Tất cả” nhóm hoạt động theo ngày (tiêu đề `Ngày N · dd/mm` + số hoạt động) và nhóm “Chưa xếp lịch”; ngày trống có ô thả nét đứt. Trước đây là một danh sách phẳng theo thứ tự toàn Trip. | Cần đích thả rõ ràng giữa các ngày (DoD bước 4). Day tabs/ALL/POOL, panel, card và editor giữ nguyên. |
| MPOI-02 | Thả → một `PATCH {scheduled_date, position}` (thay `PUT /order` + `PATCH scheduled_date` riêng). Hoạt động có giờ cố định kéo sang ngày khác bị chặn với cảnh báo “Hoạt động có giờ cố định — sửa giờ trong chi tiết” và nút “Mở chi tiết”, thay vì tự mở editor. Menu Đưa lên/xuống đổi chỗ trong cùng ngày. | Hợp đồng 4.3; ràng buộc DB `starts_at` vs `scheduled_date`. Nút lên/xuống vẫn là phương án bàn phím. |
| MPOI-03 | Hàng kết quả Bản đồ thêm dòng huy hiệu nguồn (Wolfari/Geoapify/Thủ công) và “Chưa xác minh vị trí” khi `coord_verified=false`; dòng phụ dùng `category_label`. | Truthful provenance/attribution (SRS); không thêm control mới vào hàng (vẫn một nút + checkbox). |
| MPOI-04 | “Thêm vào ngày…” (menu Ngày 1..n) nằm trong thẻ “Đang chọn” sẵn có trên bản đồ và trong Chi tiết địa điểm; sau khi thêm hiện liên kết “Xem lịch trình Ngày N” (`/plan?day=YYYY-MM-DD`). | Tôn trọng quyết định 12/11/2026 không thêm panel/form mới trên Map; tái dùng `ActionMenu` với trigger chữ. |
| MPOI-05 | Bản đồ ngày vẽ polyline theo thứ tự đã sắp: nét liền + “x km · y phút (ước lượng ô tô)” khi OSRM trả kết quả; nét đứt + “Đường chim bay — chưa kiểm tra di chuyển” khi lỗi/503. Không vẽ cho “Tất cả” hay “Chưa xếp lịch”. | Thay quy tắc PLN03 cũ “không vẽ route/travel giả” bằng đường có nhãn trung thực; Leaflet giữ nguyên, MapLibre hoãn. |

### POI-OVERTURE — 18/11/2026 — TASK_AUTHORIZED

Authority: owner task brief `docs/agents/AGENT_PROMPT_POI_OVERTURE_WEB.md` (D58), Web only. Each item is listed separately for review; none approves other pending deltas.

| Mã | Khác biệt so với template | Lý do / phạm vi |
| --- | --- | --- |
| POV-01 | Thêm một hàng chip “Nhóm địa điểm” (Du lịch · Ăn uống · Cà phê · Lưu trú · Bar · Mua sắm · Giải trí · Spa · Giao thông · Tiện ích · Mọi nhóm — đổi từ “Tất cả” theo chủ dự án 18/11 để không trùng chip lọc lịch) ngay dưới hàng lọc Tất cả/Đã chọn/Trong lịch/Chưa xếp, dùng lại style chip lọc hiện có (chip đang chọn nền `--color-action-primary`, chữ trắng). Bố cục hẹp: hàng chip cuộn ngang dưới bộ lọc mobile. Trạng thái nằm trên URL `?group=`; bấm lại chip đang chọn để bỏ chọn. | W11; không thêm panel. Không chọn chip = không gửi `category` (backend trả 4 nhóm mặc định). |
| POV-02 | Dòng trạng thái kiểu `searchState` sẵn có dưới hàng chip: “Phóng to để xem địa điểm” (zoom < 11 hoặc `BBOX_TOO_LARGE`), “Đang hiển thị 150 điểm nổi bật, phóng to để xem thêm” (`bbox_truncated`), lỗi tải khung. Empty state theo nhóm: “Không có địa điểm thuộc nhóm này trong khu vực” + “Phóng nhỏ bản đồ hoặc chọn nhóm khác.” | W11/W12; tái dùng `searchState`/`empty`. |
| POV-03 | Marker cụm tròn có số (nền `#006f8a`, viền trắng, 36/42/48 px theo số điểm) trên Leaflet; marker đơn giữ nguyên. | W12/AC-PL02; gom tự viết, không thêm thư viện. |
| POV-04 | Huy hiệu nguồn thêm biến thể “Overture” (tím nhạt `#f4f2fc`, chữ `#463a8c`, ≈ 8:1) có tooltip; huy hiệu nguồn cũng hiện trong thẻ “Đang chọn” (desktop và mobile). | W10; tooltip thay cho cảnh báo lặp lại trên từng hàng. |
| POV-05 | Panel “Chi tiết địa điểm” (bố cục hẹp) thêm danh sách Loại · Tỉnh/thành · Nguồn (huy hiệu + “Bản dữ liệu dd/MM/yyyy · Cập nhật dd/MM/yyyy”, ghi chú Overture) · Ghi nguồn, đặt dưới địa chỉ. Desktop không có panel chi tiết trong template; theo chủ dự án 18/11, thẻ “Đang chọn” thêm đúng một dòng nhỏ “<loại> · <tỉnh> · Nguồn: <huy hiệu> (dd/MM/yyyy)” (tỉnh và “Nguồn + ngày” không bao giờ bị cắt; thiếu chỗ thì tên loại rút gọn bằng “…” trước, hẹp hơn 40 px thì ẩn hẳn; ngày = `fetched_at`, thiếu thì `data_release`; nội dung đầy đủ “loại · tỉnh” nằm trong tooltip huy hiệu); attribution bản ghi và ghi chú kiểm tay nằm trong tooltip của huy hiệu (hover và focus bàn phím). | W10/FR-TI01. |
| POV-06 | Dòng chữ nhỏ cuối danh sách “Dữ liệu địa điểm: Wolfari, Overture Maps Foundation (bản …), Geoapify / © OpenStreetMap contributors” (chỉ nguồn đang có); attribution Leaflet thêm “© Overture Maps Foundation” khi khung có điểm Overture. | W13. |
| POV-07 | Chế độ khám phá theo khung (không có từ khóa): không tự chọn kết quả đầu; thẻ “Đang chọn” chỉ hiện khi người dùng bấm hàng hoặc pin. Có từ khóa: giữ tự chọn kết quả đầu như cũ. Kết quả cùng tên ở tỉnh khác tỉnh của tâm bản đồ hiện “ · <tỉnh>” sau địa chỉ (W14). | Chủ dự án 18/11 (OVW-2 review); DoD bước 2–3 không đổi. |

### UI-DECLUTTER — 19/11/2026 — USER_REQUESTED_MAINTENANCE

Authority: yêu cầu trực tiếp của chủ dự án, thực hiện đúng kế hoạch [`docs/agents/UI_DECLUTTER_AND_TYPOGRAPHY_PLAN.md`](../agents/UI_DECLUTTER_AND_TYPOGRAPHY_PLAN.md) (Giai đoạn 0 → A → B → C; D chỉ đề xuất). Đây là việc bảo trì Web, không phải checkpoint CP mới và không duyệt thêm delta nào khác. Bằng chứng: [`evidence/ui-declutter-20261119/`](evidence/ui-declutter-20261119/README.md).

**Mobile deferred.** Phạm vi thiết bị chỉ là web desktop (viewport ≥ 769px; `breakpoints.mobile = 768`). Bố cục mobile (≤ 768px) và ứng dụng mobile hoãn sang đợt sau; không khai báo nào hiện có trong `@media (max-width: 768px)` bị sửa. Các quy tắc dùng chung mới chỉ áp từ `min-width: 769px`; giá trị cũ của quy tắc nền được giữ cho mobile bằng khối `mobile freeze` (182 khối, mỗi khối đứng ngay sau quy tắc nó bảo vệ) và bằng thành phần `PageBreadcrumb` (`mobile=`) giữ tiêu đề cũ dưới 769px. Hồi quy: ảnh 402×874 và 320×600 của mọi route giống hệt (so điểm ảnh) trừ chỗ đổi văn bản của Giai đoạn A và nhãn C6.

| Mã | Khác biệt so với template | Lý do / phạm vi |
| --- | --- | --- |
| UDC-A01 | Members: bỏ ba hộp ghi chú trong quản lý lời mời ("Quy tắc lời mời", "Khi chấp nhận", "Lời mời kết thúc") và hộp "Khi chấp nhận…" ở trang nhận lời mời. Trạng thái lời mời vẫn hiện trên từng dòng; lý do từ chối nằm trong thông báo lỗi sẵn có. | Kế hoạch A1–A4, P8 (không nhảy cấp tiêu đề). |
| UDC-A02 | Map: bỏ câu mô tả ô tìm kiếm và ghi chú nhà cung cấp ở bản Gateway; bản Preview rút còn "Bản đồ nền chưa được cấu hình." (giữ `<strong>` vì test khóa). `MapViewport` chỉ gắn `aria-describedby` khi ghi chú còn được render (P1). Ghi nguồn OSM/Geoapify/Overture không đổi (P2). | A5–A7. |
| UDC-A03 | Plan Gateway: bỏ câu hướng dẫn kéo-thả (đã có `screenReaderInstructions`, P3), gợi ý lịch trong editor và khối "Chi tiết đồng bộ"; phiên bản chuyển sang `data-plan-version`. | A8–A10. |
| UDC-A04 | Price Watch: bỏ câu mô tả ở bản Gateway; bỏ dòng "Watch version · providerEnvironment" khỏi bản Preview (chuyển sang `data-watch-version`, `data-provider-environment`). | A11–A12. |
| UDC-A05 | Quỹ Gateway: vùng trống chỉ còn "Chọn một thao tác để bắt đầu."; nhãn môi trường vẫn ở đầu trang (chip TEST) và trong biểu mẫu (P4). | A13. |
| UDC-A06 | Cài đặt chuyến đi: bỏ các câu mô tả, `details` "Tác vụ chưa khả dụng" và hộp `fundNote` (cả mục "Quản lý chuyến đi" vì chỉ còn hai khối đó). | A14–A19. |
| UDC-A07 | Bộ phối đồ Gateway: bỏ cả `aside` tự mâu thuẫn; chip "Chỉ xem" nằm cạnh bộ lọc phạm vi. Lưới nội dung thành một cột (không còn cột phụ). Bản Preview đã ghi "Ảnh và bảng màu đều là minh họa mẫu" nên giữ (P5). | A20–A22. |
| UDC-A08 | Thông báo/Hồ sơ: bỏ hai câu mô tả; công tắc push có chip "Sắp có"; "Phiên bản hồ sơ" chuyển sang `data-profile-version` (bản Preview). | A23–A25. |
| UDC-A09 | Danh sách chuyến đi: bỏ ba bộ lọc bị khóa (Preview) và câu giải thích. | A26. |
| UDC-A10 | Dọn CSS chết sau khi xóa JSX (`.note`, `.help`, `.syncDetails`, `.fundNote`, `.readOnlyPanel`, `.unavailableFilters`, …) và tệp `GatewayMapPage.module.css` không còn ai import. | P7, C7. Không xóa `CapabilityNote`. |
| UDC-B01 | Thang chữ 8 bậc 12/13/14/16/18/20/24/32 qua token (thêm `--font-size-caption`, `--font-size-subtitle`); không còn chữ < 12px ngoài khối mobile. 2 `!important` bỏ bằng độ cụ thể selector. | B; thay đổi > 1px xem UDC-B04. |
| UDC-B02 | Bo góc về token (6/8/10/12/16/20/24/pill); `14/17/18 → 12/16`, `2/3/4/5/9 → 6`. | B. |
| UDC-B03 | `font-weight: 800 → 700`; bỏ `text-transform: uppercase` (đầu cột Thành viên) và `letter-spacing` rộng; nhãn chữ HOA cứng ("CHUYẾN ĐI MỚI", "ĐIỂM ĐẾN ĐÃ CHỌN", "HOÀN TẤT") thành chữ thường câu. Nhãn mã kỹ thuật `TEST · OPEN` ở Quỹ Preview giữ nguyên. | B, 7.5. |
| UDC-B04 | Thay đổi cỡ chữ > 1px: Auth tiêu đề thẻ 30/28 → 32 (tablet 26 → 24); Profile h1 34 → 32; phản hồi lời mời 30 → 24; Packing số tiến độ 26 → 24; thành công tạo chuyến 28 → 24; tiêu đề Tạo chuyến `clamp(28,2.4vw,36)` → `clamp(24,2.4vw,32)`; số tiền Quỹ/Giá vé `clamp(20,3vw,30)` → `clamp(20,3vw,32)`; tiêu đề panel Map 21 → 20, hộp thoại 22 → 20; 45 khai báo 8–11,5px → 12 hoặc 13 (đoạn chữ); 15 → 14/16 theo vai trò. Thẻ "Đang chọn" ở Map rộng 250 → 280px để dòng tỉnh + Nguồn + ngày (POV-05) vẫn không bị cắt ở cỡ 12px. | B; xem ảnh trước/sau trong evidence. Display Home/Auth intro ≥ 29px giữ ngoài thang. |
| UDC-C01 | Một khung nội dung cho mọi trang workspace: `max-width` 1220px căn giữa, lề 8/22/24/18, qua `WorkspacePage.module.css` + token `--workspace-max-width`… (D1). Quỹ/Giá vé Gateway chuyển từ `DemoWorkspace` sang khung chung. Cài đặt 26 → 24px đáy. | C0–C1. |
| UDC-C02 | Một tiêu đề trang: `PageBreadcrumb` "Tổng quan chuyến đi › {Mục}", `h1` luôn thấy, đậm 600 màu ink; bỏ "Chuyến đi của tôi › tên chuyến" ở Bản đồ/Đồ đạc/Quỹ/Cài đặt; Cài đặt chỉnh sửa giữ 3 cấp; Quỹ/Giá vé Gateway có breadcrumb chuẩn, bỏ nhãn HOA (D10); bỏ `visuallyHidden` ở Bộ phối đồ/Thành viên Gateway (D8). Đỉnh hero cách đỉnh vùng nội dung 44px (D2). | C2. |
| UDC-C03 | Hero một bộ số liệu: cao 150px, bo `--radius-hero` (16), `h2` 32/40, padding chữ 31 28 20, nút cùng cỡ; biến thể chỉ đổi nền (Tổng quan dùng chung nền chữ của landscape để không bị cắt). Bộ phối đồ Preview dùng `TripHero` ở desktop. Nút bo 16 (token) thay vì 18 của D3: xung đột giữa D3 và B ("không bo ngoài token"), chênh 2px. | C3, D3. |
| UDC-C04 | Tổng quan: hàng KPI và hàng dưới cùng 4 cột bằng nhau, gap 16 (`--grid-gap`); lịch trình chiếm 2 cột; 769–1100px cả hai hàng 2 cột. Tiêu đề thẻ KPI và thẻ 16px/600, giá trị KPI 24/32. Min-height khai báo một lần (`--overview-*-min`). | C4, D4, D5, D7. |
| UDC-C05 | Lưới còn lại: gap 16 (Map 12, Thành viên Preview 48 → 16, Gateway 18/24, Plan 12, Settings 18, Giá vé Gateway 20); cột phụ `--side-panel-width` ở Quỹ (cả hai bản), Giá vé (cả hai bản; cột phải Preview 288 → 372), Bộ phối đồ Preview (364 → 372) và Thành viên Gateway; thẻ nội dung bo 8, padding 16 ở Quỹ, Map, Packing, Giá vé, Cài đặt, Bộ phối đồ, `DemoWorkspace.panel`. Ngoại lệ giữ vai trò riêng: panel lịch trình Tổng quan (padding 12/15/0 theo hợp đồng Figma), thẻ hoạt động `TimelineCard`, thẻ phản hồi lời mời, hộp thoại. Bộ phối đồ Gateway không còn cột phụ nên D6 không áp dụng (xung đột A20). | C5, D4–D6. Cột chỉ áp ở độ rộng mà lưới không thu về ít cột hơn. |
| UDC-C06 | Nhãn tiếng Việt: "Trang phục" (thay "Dress code"), "Đồ đạc" (thay "Packing list"), tiêu đề Bản đồ "Bản đồ địa điểm" ở thanh bên, breadcrumb, `h1`, `aria-label`, thẻ KPI "Tiến độ đồ đạc". Route và query key không đổi. Trang chủ (quảng cáo) không đổi. | C6, D9. |
| UDC-C07 | Assertion hình học đổi có chủ đích (không xóa, không nới sai số): `trip-overview.spec.ts` cạnh trái/phải theo khung 1220 căn giữa (D1, mọi viewport và sidebar thu gọn), chiều cao hero 170 → 150 (D3), cột `[578,314,260]/1152` → `[2c+g, c, c]`, `c=(w−3g)/4`, g=16 (D5, D7); `plan-preview.spec.ts` hero y 116 → 120 (D2); tên nhãn D9 ở `app-shell.spec.ts`, `packing-list.spec.ts`, `shell-navigation.test.tsx`, `trip-new-features.test.tsx`, `cp07-composition.spec.ts`; A20 ở `cp07-composition.spec.ts` và `cp07-native-zoom.spec.ts` (aside → chip "Chỉ xem"); A25 ở `auth-fixture.test.tsx` và `auth-fixture.spec.ts` (phiên bản → `data-profile-version`); A26 ở `trip-list.test.tsx` và `trip-list.spec.ts` (bộ lọc khóa → không còn); ảnh `home-guest-1440.png` (win32) chụp lại vì Giai đoạn B đổi cỡ chữ Trang chủ (bản linux chưa chụp lại được trên máy này). Spec mới `layout-consistency.spec.ts` (sai số ≤ 1px). | C7, mục 9 của kế hoạch. |

**Giai đoạn D — chỉ đề xuất, trạng thái `PROPOSED`, chưa code.**

| Mã | Đề xuất | Trạng thái |
| --- | --- | --- |
| UDC-D1 | Ẩn linh vật thanh bên desktop (166px) khi chiều cao < 950px (`--breakpoint-short-workspace`); vùng trang trí ngăn kéo mobile để lại cho đợt mobile. | PROPOSED |
| UDC-D2 | Nâng tương phản viền ô nhập và điều khiển lên ≥ 3:1 (đo bằng script, không đoán mã màu); tách thẻ khỏi nền bằng bóng hoặc viền đậm hơn, không dùng nền đổi màu. | PROPOSED |
| UDC-D3 | Giới hạn hộp ghi chú viền trái (`CapabilityNote`, `.note`) cho lỗi và cảnh báo. | PROPOSED |
| UDC-D4 | Thứ bậc tiêu đề: làm tên mục rõ hơn tên chuyến (tiêu đề 24px phía trên hero hoặc nhãn trong hero) thay vì chỉ là mục cuối breadcrumb 13px. | PROPOSED |
| UDC-D5 | Bỏ bất đối xứng lề 18/22px (20/20); đang bị test khóa (`220 + 18`, `width − 22`) nên cần duyệt riêng. | PROPOSED |
| UDC-D6 | Rà các màn còn ghi chú chức năng chưa hỗ trợ (Packing "Chỉ xem" lặp từng dòng, Plan Preview, Thành viên Preview, `AppShell`) theo quy tắc "ẩn điều khiển"; thêm bước giữ nguyên tuyệt đối mobile nếu cần. | PROPOSED |

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

## Dress code writes on Gateway — user request 16/11/2026

Backend now serves API050–053 and `capabilities.dress_codes_write`, so the Gateway Dress page
writes for real. User asked for a sensible, demo-ready Dress code screen.

- Removed the dashed "Chưa có ảnh minh họa riêng" placeholder from every saved card: the
  contract has no image or palette, and the empty box pushed the guidance below the fold.
- Scope groups (whole Trip, each day, each Activity) flow as columns on wide screens and
  stack on phones; cards keep header, description, scope/source rows and actions.
- Editor: scope adds "Cả chuyến"; the day is a list of the Trip's own days instead of a free
  date input, so an out-of-range day cannot be typed. TRIP rows are no longer read-only.
- Unchanged: filters, breadcrumb, hero, capability/permission gating, recovery states,
  suggestion panel gating. No image, palette or upload was added.

Checks: typecheck, lint, unit suite, Gateway HTTP-mock `preparation-srs12` and `cp07`,
plus a live add/edit/reload/delete run against the local demo backend.

### Built-in dress code suggestions — user request 16/11/2026

User asked for suggestions that fit the weather and the place, fixed rules being acceptable.
The editor gains a "Gợi ý nhanh" box (`DressSuggestions`): expected weather is guessed from
the place (Trip name, saved locations, their latitude) and the month, using a fixed table of
Vietnamese climate by region, and can be changed by hand. It lists one preset for that weather
plus presets for places found in the Plan (beach, pagoda, old town, Huế, mountain, highland,
dinner, boat, city), each with three colours. Picking one only fills title and description;
nothing is saved until "Lưu dress code". Colours are written into the description because the
contract has no colour field. No weather provider, no new API; this is not the DSS
recommendation flow (FR-DS03), whose panel stays capability-gated. `dress-suggestions.ts` is
kept identical in the mobile repo.
