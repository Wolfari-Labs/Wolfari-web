# CP-02 — Lịch trình Web: đặc tả bám nguồn

Ngày30/10/2026, HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`. W04-A/W05-A: đặc tả/mapping đã bàn giao; CP02 COMPLETE theo D20 với ngoại lệ visual QA D19. PLN08 centered editor + đủ fields đã duyệt D18. Không application implementation hoặc visual QA PASS; xem CP02_ACCEPTANCE.

Policy D17: giữ thiết kế của người dùng. Mỗi dòng dưới phân biệt `SOURCE`, `PRESERVE_RUNTIME` và `DELTA_PENDING`; xem [DESIGN_DELTAS](DESIGN_DELTAS.md). Không coi “spec complete” là user approval.

## 1. Nguồn trực quan và chế độ dữ liệu

- Main20:236 và tham chiếu768:7123; selected pool439:2028; day-map439:2497. [Bốn ảnh nguồn](evidence/cp02/figma-plan-review-2026-10-30/README.md) được kiểm tra30/10. Ba frame đầu có design context live cùng ngày, lưu tại [source map](SOURCE_MAP.md). Không có ảnh AI làm target.
- `PlanPage` chọn Gateway khi repository có `createActivity`; nếu không dùng PreviewPlanPage. Gateway là shared server Plan, không có cạnh tranh với local draft editor. Preview draft/location pool không chứng minh server mutation đã thành công.
- [PlanPage](../../src/features/plan/PlanPage.tsx), [GatewayPlanPanel](../../src/features/plan/components/GatewayPlanPanel.tsx), [RuntimeTimeline](../../src/features/plan/components/RuntimeTimeline.tsx), [Plan model](../../src/features/plan/model/plan.ts) đã đọc trong lượt này. Không sửa các file.

## 2. Desktop composition — SOURCE

Các số đo là frame1440×960, không phải yêu cầu CSS absolute toàn app. Preserve hierarchy/relationships, fonts/assets và instance overrides; adapt layout bằng CSS Modules hiện hữu sau approval.

| Vùng | Node | Source geometry/appearance | Mapping implementation dự kiến, chưa viết code |
|---|---|---|---|
| Header |135:406, component set135:483 |1440×76, logo155×51.667; active Trips; shadow0/2/10 rgba(10,87,138,.05) | Existing AppShell/header, đúng route links; không prototype transparent hotspots. |
| Sidebar |135:608, set135:1357 |220 rộng, bắt đầu y76; active Schedule, nav radius7; mascot/source artwork | Existing expanded/collapsed navigation, giữ mọi route và keyboard. |
| Breadcrumb |432:2025 |x238,y88;14px Be Vietnam Pro | Existing route context; không hardcode tên Trip trong runtime. |
| Trip banner |432:2026 |x238,y116,1180×150, radius10; image/cloud; title32, date15 | Existing TripHero data/permission actions; giữ banner, không thay compact strip mặc định. |
| Day navigation |432:2053 |x238,y282,1180×54; day buttons128×54/radius8 | Ngày từ Trip timezone. ALL/POOL runtime không được mất; placement là PLN01. |
| Summary strip |432:2067 |x238,y350,1180×74/radius10;4 metrics | Giữ vùng source; counts/duration phải có provenance, PLN04 không cho dùng số giả. |
| Main timeline |432:2095 |x238,y438,1180×498/radius10 | Header/title/progress/actions trên cùng; rows bên dưới. |
| Scroll region |486:3102/3103 |viewport1166×414, content654 cao; source có internal vertical scroll | Desktop chưa bỏ nested scroll. Keyboard/content-end phải test; narrow/short-height adaptation riêng. |
| Activity row |432:2110 và các sibling |Main row1070×76/radius8; step38; type circle46; thumbnail150×56/radius6 | Existing TimelineCard/RuntimeTimeline, ID và status giữ nguyên; long content phải grow/wrap, không truncate domain state. |
| Main actions |instance của11:14/11:9 |Hiện bản đồ148×42, Thêm hoạt động198×42, radius8 override generic component18 | Reuse Button semantics;44px target/current colors khác nguồn được review ở PLN06, không normalize toàn hệ. |

### Hai view hỗ trợ đã được thiết kế

| View | Giữ từ SOURCE | Runtime gap cần review |
|---|---|---|
| Selected/unassigned439:2028 |Main timeline680×498 tại238,438; pool488×498 tại930,438; gap12; search, close, cards456×86/radius8 | Source object là selected places; Runtime split object là activities chưa ngày. PLN02: không đổi noun/data semantics để chỉ giống hình. |
| Day-map439:2497 |Timeline680×498; map panel488×498 tại930,438, title/Ẩn bản đồ; source map visual384.75×445.5 | Gateway chưa map view; Preview Hiện bản đồ disabled. PLN03 cần review cách nối projection; screenshot route illustration không phải live geometry. |

Không invent third direction. Map và pool được thể hiện ở hai frame thay thế cùng vùng phải; không mặc định mở cả hai cùng lúc hoặc thêm panel thứ ba.

## 3. Screen-to-data/action mapping

| Phần UI | Dữ liệu/hành vi thật | Class / decision |
|---|---|---|
| Tên/ngày/trạng thái chuyến đi | Trip detail theo timezone; memberCount có thể null; link settings theo quyền | PRESERVE_RUNTIME; không lấy số4/ngày12–14/10 từ source làm runtime data. |
| Header notification/account | Existing shell session/inbox | PRESERVE_RUNTIME; avatar trong Figma là illustration, không fake người đang online. |
| Presence/live cursor | Không có presence data trong PlanViewModel | PLN04 DELTA_PENDING: proposal bỏ riêng live cursor và dùng member link/count thật, không bỏ banner. |
| Day filters | `ALL`, `POOL`, `planDays`; `startsAt` → localDate, nếu không dùng `scheduledDate`, nếu null → POOL | PRESERVE_RUNTIME. PLN01 proposal append ALL/POOL cạnh ngày bằng cùng styling, không tự đổi initial ALL thành Day1 khi chưa review. |
| Summary hoạt động/địa điểm | activities/selectedLocations có thật; scope all-trip vs selected-day phải ghi rõ | PLN04 proposal giữ4 slots nhưng đặt label theo scope; không đổi count khi chỉ filter mà thiếu nhãn. |
| Trải nghiệm/di chuyển | Không có travel estimate trong Plan model; preview đã dùng hoàn tất trong ngày và “— · Chưa khả dụng” | PLN04 proposal reuse truthful preview wording nếu được duyệt; chưa claim tổng giờ travel là server verified. |
| Thêm hoạt động | current create method + canEdit/alive, mở ActivityForm | PRESERVE_RUNTIME; nguồn CTA nhưng không mở preview-only place importer trên Gateway. |
| Chọn hoạt động/sửa | `activityId`, latest planVersion, existing right Drawer | PRESERVE_RUNTIME; bố cục form bổ sung ở mục4, PLN07. |
| Hoàn tất/mở lại | canComplete riêng canEdit; xem mục6 | PRESERVE_RUNTIME; source progress không thay completion permission. |
| Kéo/thả/reorder | full ordered activities IDs; pointer/keyboard + menu fallback | PRESERVE_RUNTIME; không gửi filtered subset. |
| Đổi ngày | Untimed → PATCH scheduled_date; timed → mở editor xác nhận | PRESERVE_RUNTIME; không tự shift timestamp khi thả. |
| Xóa | ConfirmDialog; warning Dress Code liên quan có thể bị xóa; version guard | PRESERVE_RUNTIME; không biến delete thành optimistic disappearance. |
| Pool | Current server activities POOL khác preview `draft:<locationId>` | PLN02 proposal ghi “Hoạt động chưa xếp ngày” cho Gateway; thêm selected-place create chỉ sau mapping/approval, không silently save draft. |
| Thêm ngày/chia sẻ | Preview Add day disabled; TripHero share disabled; không current Plan endpoint tương ứng | PLN04 proposal giữ disabled có lý do truy cập được, không gọi Trip PATCH ngầm hoặc tạo share link giả. |
| Ảnh/type icon | Gateway activity cover:null; selected location có name/address, không auto cung cấp thumbnail | PLN05/DLT05: chọn đúng asset khi có provenance; không thay row photo bằng ảnh AI. |
| Đồng bộ/recovery | Current hook status và reconcile/retry actions | PLN07: đặt status region gần timeline/editor, không giấu error/unknown trong disclosure hoặc chỉ toast. |

## 4. Editor form — PRESERVE_RUNTIME fields, layout DELTA_PENDING

Correction W05-E30/10: đã mở [board26:406](evidence/figma-official/26-406.png), section A có **centered activity editor**: title/close, name, day/start/end, location, cancel/save. Source editor có thật; chưa bao phủ type/description/publicDescription/end-date cho overnight, loading/conflict/unknown. Runtime right Drawer khác vị trí nguồn (`PLN08`). D18 đã duyệt centered modal và đủ fields hiện có: giữ nhóm name/schedule/location, bổ sung type/descriptions/end-date; không hỏi chọn lại Drawer. Không bỏ field hoặc tạo wizard để ép khớp ảnh.

| UI label | Model → wire | Validation/presentation cần giữ |
|---|---|---|
| Tên hoạt động |title → title |Trim; bắt buộc,≤255; giữ input khi invalid, focus đầu form khi mở. |
| Loại hoạt động |activityType → activity_type |Trim; bắt buộc,≤40; không ép enum/icon choices mới ngoài current contract. |
| Mô tả |description → description |Rỗng gửi null theo form hiện tại; không thêm required/max tùy ý. |
| Mô tả công khai |publicDescription → public_description |Field hiện có; không suy rằng public share đã wired. |
| Địa điểm |selectedLocationId → selected_location_id |Chỉ server selectedLocations IDs; blank→null; selected ID biến mất phải báo lỗi. |
| Ngày bắt đầu hoặc ngày chưa có giờ |day → scheduled_date **hoặc** starts_at |Ngày thuộc `planDays`, theo Trip timezone. Không giờ: scheduled_date giữ date-only, starts/ends null. |
| Giờ bắt đầu |start → starts_at |Nhập giờ thì bắt buộc day và cả hai mốc; `localTimeToIso`, round-trip local clock/date validation. |
| Ngày kết thúc (nếu có giờ) |endDay → ends_at conversion |Blank dùng day; cho overnight khi end>start và cả hai trong Trip bounds. Không ép end về cùng ngày. |
| Giờ kết thúc |end → ends_at |Phải có cặp start/end; không giờ thì không tự suy0:00. |
| Bỏ ngày và giờ |day/start/end/endDay cleared |Cả scheduled_date/starts_at/ends_at trở về null. Không tự xoá activity. |
| Thứ tự, revision |position; expected_plan_version |Create position=activities.length; edit không gửi position nếu không thay; không là editable text field. |

Serialization giữ omission khác null; repository whitelist. Không đưa IDs/version/idempotency/token vào editable controls. `endDay` không phải field API riêng.

Editor footer: Lưu/Hủy chỉnh sửa; pending disables fieldset. Conflict giữ draft và hiện “Đã đối chiếu, giữ nội dung nhập” khi version khác, không tự rebase mà không user acknowledgement. Unknown yêu cầu tải đối chiếu trước khi thử đúng request cũ. Dirty-dismiss confirmation chưa có trong Gateway close callback; nếu thêm là PLN07, không báo đã implement.

## 5. Action-to-contract mapping

Prefix `/api/v1/trips/{tripId}`; identifiers encode theo existing repository. Tất cả writes dùng cùng immutable intent + expectedPlanVersion + idempotencyKey trong một attempt. [Gateway repository](../../src/infrastructure/repositories/plan.gateway-repository.ts) là source serializer.

| Action | Method/path | Body chính |
|---|---|---|
| Read |GET `/plan` |Trip/Plan coherent snapshot; query keys hiện hữu, không phụ thuộc visual tab. |
| Add |POST `/activities` |expected_plan_version + activityFields whitelist, position. |
| Edit/day change |PATCH `/activities/{activityId}` |expected_plan_version + explicit changed fields; null khác omitted. |
| Complete/reopen |PATCH `/activities/{activityId}/completion` |expected_plan_version + status TODO/COMPLETED. |
| Delete |DELETE `/activities/{activityId}` |expected_plan_version + confirmed:true. |
| Reorder |PUT `/activities/order` |expected_plan_version + activity_ids là full permutation. |

`usePlanCommands` **không phải Finance operation coordinator**. Plan statuses hiện tại là idle/pending/success/error/conflict/unknown. Không thêm PROCESSING/NEEDS_REVIEW/poll `/operations` vào Plan chỉ vì Finance dùng chúng. [Command hook](../../src/features/plan/hooks/use-plan-commands.ts) và [intent restore](../../src/features/plan/model/plan-command-intent.ts) giữ recovery scope Trip+user, không auto replay.

## 6. State matrix — layout bổ sung PLN07, semantics phải preserve

| State/event | Presentation proposal trong source layout | Actions / invariant |
|---|---|---|
| Initial loading |ContentState ở vùng main, shell giữ hợp lệ |Không render rows/count0 giả; Plan query chỉ chạy sau Trip access. |
| Snapshot empty |Empty message, không giả permission |Chỉ cho add khi có coherent snapshot và canEdit; empty result khác ready với activities rỗng. |
| Ready, no activities |Timeline empty slot, cùng banner/day controls |Add nếu có quyền; không disable navigation của read-only viewer. |
| Filter day empty |Empty trong timeline, không xoá data nhóm khác |ALL/POOL luôn truy cập theo PLN01. |
| Read-only |Inline explanation gần heading |Hide/disable edit/drag/delete theo canEdit; completion theo quyền riêng. |
| Archived/left membership |Read-only hoặc denied theo current guards/snapshot |alive=false không mutation, kể cả canEdit snapshot true. |
| Pending |Status “Đang lưu thay đổi…” gần main/editor, label button giữ rõ |Locked=pending hoặc blocked; không duplicate submit hoặc reorder song song. |
| Validation |Field/form message, giữ typed input |Không gửi request khi client invalid; backend validation không làm mất draft. |
| Version/state/idempotency conflict |Warning + tải đối chiếu; draft không remount |Giữ nội dung; sau version refresh cần explicit acknowledgement trong editor. |
| Unknown/network ambiguous |Persistent “Chưa xác định…” + tải đối chiếu |Không success toast; không intent mới. Retry chỉ enabled sau reconcile và giữ exact key/version/body. |
| Confirmed write, refresh failed |Thông báo cần đọc/đối chiếu lại, không mời ghi lại |Hook trả success receipt nhưng status conflict; attempt đã clear, **không replay confirmed write**. |
| Recovery storage unavailable/invalid |Persistent safety message |Không gửi recoverable mutation khi không lưu intent được; invalid recovery không cho reconcile vô hạn. |
| Permission/session/resource lost |Error đúng domain, safe exit/reload theo hiện hành |Không downgrade thành unknown hoặc giữ write affordance usable. |
| Read unavailable/mismatched revisions |ContentState/error; during refresh có thể giữ last coherent snapshot |Không trộn Trip và Plan versions/exportRevision khác; không unmount editor khi hai reads hoàn thành lệch thời điểm. |
| Authoritative success + refresh ready |Đã lưu thay đổi, đúng data mới |Close editor theo current result, không success theo animation. |
| Delete cancelled / changed revision |Giữ row, đóng confirm hoặc yêu cầu chọn lại |Không gửi DELETE khi confirmVersion khác. |
| Trip/actor change / late response |Đúng context mới, không leak draft/status cũ |Hook generation/abort, actor-scoped recovery và query invalidation giữ nguyên. |

Completion predicate phải giữ: alive && canComplete && (status TODO hoặc canEdit hoặc completedByUserId==current user). Không suy mọi member có quyền mở lại completion của người khác.

## 7. Responsive compositions — source và delta không trộn

| Viewport/state | Source/PRESERVE_RUNTIME | Proposed composition cần review |
|---|---|---|
|1440×960 main |Giữ geometry mục2 và source internal timeline scrolling |Không compact/banner removal. Rows có nội dung dài cần intrinsic height, không copy text h10px từ generated code. |
|1440×960 pool/map |Giữ680/488 với gap12 ở source |Existing SplitPanel default62/38 và min40/25 khác source; đề xuất source ratio≈58/42 cho initial layout nếu duyệt, vẫn preserve user resize preference. |
|1366×520/600 short |Không bắt buộc activity phải trên fold; mọi nội dung phải reachable |DLT03/09: ưu tiên scroll tới timeline thay vì bỏ banner; thử document flow cho height thiếu và ghi before/after để duyệt. Chưa runtime QA. |
|820/768 |Không có Plan Web companion đã xác định; không dùng M09 làm target |DLT09: giữ same nav/menu semantics; current SplitPanel<=1200 dùng Drawer, không tự đổi breakpoint. Map/pool presentation narrow cần review riêng. |
|402/320 |Notes785:6670 là Web contract: no native chrome, document reflow, imagery giữ aspect ratio, text auto height |DLT09: header/menu theo783:6655, banner wrap content giữ identity; days wrap/accessible horizontal navigation; metrics stacked; row time/title/location/actions thành nhiều dòng; pool qua current Drawer; editor fields một cột. Đây là proposed Plan extension, không frame nguồn đã có. |
|200% native zoom |Keyboard/focus/content reachability là gate |Không lấy CSS document zoom test làm native browser zoom PASS; cần browser evidence sau approval implementation. |

Không hide status/amount/identifier để vừa width. Escape/focus return theo existing Radix Drawer; khi trigger bị xoá cần kiểm tra fallback, không khẳng định generic Drawer đã xử lý mọi trường hợp. Native Web semantics, không mobile product.

## 8. Component và asset handoff — reuse trước

| Source/pattern | Existing owner | Giữ / delta |
|---|---|---|
| Header/sidebar |features/shell/AppShell; route helpers |Giữ routes/guards/session/accessibility; restyle đúng source, không xây shell mới. |
| Banner |features/trips/components/TripHero |TripHero hiện Gateway variant landscape khác source photo/cloud; ghi PLN05/DLT03 để map asset đúng, không giả đổi Trip cover. |
| Rows |RuntimeTimeline + TimelineCard |TimelineCard hiện schedule/body/footer khác source horizontal row; CP06 restyle view, preserve props/handlers/model. Không rewrite repository. |
| Split |shared/components/SplitPanel |Giữ resize/keyboard/ratio preference và compact Drawer; ratio delta review trước đổi default. |
| Editor |GatewayPlanPanel ActivityForm + shared Drawer/Input/Select/Button/Alert |Không tạo form serializer mới; reuse exact validation/null/date semantics. |
| Action menu/confirm |shared/components/Ui |Reuse native menu/confirm behavior; không dùng prototype hotspots làm buttons. |
| Feedback/loading |ContentState/Alert + usePlanCommands |Không thay bằng Finance OperationStatus lifecycle không tương thích. |
| Icons/photos |shared/assets/figma, asset-map, scene-assets; source exports |Logo14:2, mascot14:4 phải nguyên dạng. Dùng exact assets nếu có; glyph matching bằng mắt cần làm CP03/06. Không dùng temporary MCP URLs trong runtime. |

Implementation architecture chỉ là handoff cho checkpoint sau: view composition/styles có thể thay; adapters/validators/query/session/commands tách và preserve. Không thêm dependencies, không copy Tailwind/absolute mock code vào app.

## 9. Token/motion notes cho W05-A

- Source type roles từ MCP: Label Be Vietnam Pro Medium15/22, Small Regular13/20, Title SemiBold24/32. Plan còn heading32 và row title15, address11.5, time14; không normalize mọi text thành16px mặc định.
- Source colors: background#f6fdff, border#bfe5f5, title/time#044791, secondary#547aad, active day#009da9; sidebar nav#0a55a1/active#079fc5. Current tokens chỉ alias khi đúng giá trị/role; mismatch phải ghi delta chứ không sửa cả palette.
- Current body/ink/muted/action/radius/header tokens ở [tokens.css](../../src/shared/styles/tokens.css); `--radius-6/8/10`, `--radius-nav:7`, header76/sidebar220 đã có thể reuse. Current semantic radius12/16/24 không override source instance.
- Existing motion: TimelineCard220ms, y8→0; RuntimeTimeline DragOverlay180ms ease-out khi không reduced; global token150ms. Đây là current code, không phải Figma motion spec. Design context chưa chứng minh keyframe/timeline motion nguồn. DLT08 giữ pending; không tự thêm route fade hoặc scenic loop.
- Reduced-motion/focus không dựa animation completion; runtime behavior cần test trước đổi durations. Motion preset mới120–240ms vẫn là proposal cũ, chưa approve.

### Contrast calculation evidence (không phải full accessibility audit)

Tính sRGB relative luminance với Node30/10, ratio=(Lmax+.05)/(Lmin+.05), các cặp solid trên trắng. Không render app, không đo opacity/gradient trung gian/hover hoặc background thực; con số không phải blanket PASS/FAIL toàn UI.

| Foreground / background | Ratio | Ý nghĩa cho review PLN06 |
|---|---:|---|
|#6c8bb2 / white |3.515 |Figma muted token, cần kiểm tra nơi dùng small text. |
|#547aad / white |4.408 |Secondary text trong Plan; cần review cặp thực. |
|#4f7093 / white |5.158 |Current accessible CSS adaptation, không tự tuyên bố source match. |
|#008ac4 / white |3.866 |Source button gradient endpoint1 so với white label. |
|#008eaa / white |3.853 |Source button gradient endpoint2; không đủ để chứng minh toàn gradient. |
|#006b92 / white |5.969 |Current primary action token để so sánh delta. |
|#044791 / white |9.070 |Source title/time ink. |

Performance là gate chưa chạy: preserve lazy route/data boundaries; không thêm font/provider/library/network call chỉ để giống mock. Budget số chỉ là đề xuất PERF01 tại [Foundations](FOUNDATIONS_HANDOFF.md), chưa đo hoặc được duyệt; không hứa Web Vitals PASS.

## 10. Verification handoff / open work

Đã làm: read-only Figma contexts3 nodes + reuse4 source screenshots; code read cho Plan model/repository/form/timeline/snapshot/commands/Drawer/SplitPanel/tokens; source/field/action/state mapping và numeric contrast calculation. Không mutate source hoặc Backend.

Tests liên quan **đã đọc tên/cases, NOT_RUN trong lượt docs này**: [Gateway panel](../../tests/gateway-plan-panel.test.tsx), [commands](../../tests/plan-commands.test.tsx), [serializer](../../tests/plan-gateway.test.ts), [Gateway Plan HTTP mock](../../tests/e2e-gateway/plan.spec.ts), [timeline HTTP mock](../../tests/e2e-gateway/timeline-interaction.spec.ts), [preview](../../tests/e2e/plan-preview.spec.ts). CP01 failures không được đổi thành PASS.

Acceptance khi implementation được duyệt: source comparison ở1440; pool/map và capability disclosure; create/edit/date-only/overnight/unassigned/completion/delete/full reorder; conflict/unknown/confirmed-write-refresh-fail; keyboard/touch;402/320/820/short-height/native zoom/reduced motion. Live Backend gate riêng, không lấy HTTP mocks thay thế.

W05-E đã xác minh editor source26:406-A; D18 chốt PLN08; D20 đóng CP02 và D19 miễn visual comparison còn thiếu. Các PLN/DLT chưa duyệt vẫn là proposal, không áp dụng mặc định. Không mở CP03 chỉ từ tài liệu này; xem nghiệm thu cuối.
