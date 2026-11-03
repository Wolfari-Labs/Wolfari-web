# CP-02 — UX architecture cho Wolfari Web

Ngày cập nhật: 30/10/2026. W02: **COMPLETE — bản đặc tả để review**, không phải design approval hoặc runtime acceptance. W03 đã sửa sang source alignment, không chờ chọn ảnh AI. W04/W05 bám các thiết kế Web có sẵn; proposal khác nguồn chưa được duyệt.

## 1. Nguồn và phạm vi

- Nguồn chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace.
- Dùng inventory CP01, chỉ đọc bổ sung node liên quan. Plan main20:236/unassigned439:2028/day-map439:2497 và reference768:7123 cùng họ nguồn; không coi tất cả frame gốc là secondary chỉ vì có bản alignment. Home768:5376 và Web contract785:6670 theo source map. Không trộn controls tùy ý.
- Mobile page chỉ là evidence lịch sử; không native chrome, mobile app, iOS/Android deliverables. Narrow browser vẫn cùng website, routes, permissions và data model.
- Source/contract quyết định capability; thiết kế Web hiện có trong Figma là visual source, không chỉ tham khảo ý tưởng. [Route matrix](ROUTE_MATRIX.md) là register duy nhất cho 22 routes; [contracts](INTEGRATION_CONTRACTS.md) là authority cho endpoints/invariants, không suy payload từ ảnh.
- Notes Holder mâu thuẫn: không tạo flow handover; giữ runtime/contract hiện hành, Owner không mặc định là FundHolder. Hai họ Admin chưa chọn canonical business UI: chỉ thiết kế guarded placeholder/denied cho route hiện hữu, không CRUD.

## 2. IA và shared shell

| Nhóm | Entry / coverage trong route matrix | UX ownership và navigation |
|---|---|---|
| Public / identity | Home, login, register, forgot, verify, reset, wildcard | CP04; landing có storytelling, auth tập trung form, recovery có hành động quay lại an toàn. Không dùng workspace shell khi chưa có Trip context. |
| Personal | Trips list/new, profile; invitations/local | CP04/05/08/10; Trips là đường vào workspace, invitation giữ recipient/session transition, profile lưu theo từng section. |
| Trip workspace | Overview, Plan, Map, Dress, Packing, Members, Fund, Price Watch, Settings | CP05–10; một Trip context, nav đầy đủ route hiện hữu, active route và title rõ. Không tạo route mới để chứa Drawer. |
| Restricted | Admin | CP10; guard trước nội dung, placeholder đúng capability, không dùng Admin để bypass Trip access. |
| Cross-route | Notifications, account menu, edit/confirm overlays, operation status | CP03/04/10; giữ lifecycle, focus/scroll lock, returnTo và actor invalidation; không nhân bản command coordinator. |

Shell source: giữ brand/logo, header/sidebar, banner và hierarchy của frame hiện có. Đề xuất context strip gọn hoặc bỏ banner ở Plan/Fund/Members chưa được duyệt; chỉ trình bày như delta responsive/short-height nếu cần, không tự áp dụng. Không chuyển share/export chưa wired thành active action.

Plan hierarchy nguồn: shell → breadcrumb/banner → day selector → metrics → timeline heading/actions/rows. ALL/POOL, sync status và runtime actions cần mapping vào source, không tự đổi thứ tự hoặc bỏ metric strip. Thiếu travel-time/presence data cần delta review (PLN04), không tạo số giả. Read-only/pending/unknown phải trung thực; việc thu gọn sync chưa duyệt.

Correction W03: không so sánh ba direction AI nữa. Plan main20:236, unassigned439:2028, day-map439:2497 và source-reference768:7123 đã được kiểm tra live qua MCP. Giữ những bố cục này làm nguồn; W04/W05 lập mapping states/components và ghi delta cần review thay vì yêu cầu thiết kế lại.

## 3. Năm journey specifications

### J01 — Đăng nhập / đăng ký / recovery

Entry: guest CTA hoặc protected-route guard; chỉ safe internal returnTo. Session bootstrap có loading/error riêng, không chớp màn authenticated khi chưa xác minh.

1. Form có persistent labels, autofill, password visibility có accessible name; validation giữ nguyên domain rules, không trim password.
2. Submit → pending; không double-submit. Field error đặt tại field, server error có summary đọc được và retry khi an toàn; giữ input theo current security behavior.
3. Login thành công theo session authority mới điều hướng. Register202 hiển thị accepted/verification instructions, không đăng nhập giả.
4. Forgot-password phản hồi trung tính, không tiết lộ tài khoản tồn tại. Verify/reset phân biệt invalid/expired/rate-limited/unavailable/success; token không xuất hiện trong toast, telemetry hoặc URL tồn dư ngoài current capture/scrub behavior.
5. Actor/session change xoá đúng private query/operation state. Invitation return tiếp tục token flow hiện có, không bypass wrong-account.

Boundaries: Session + Verification/recovery rows của contracts. W04 cần auth form và accepted/error composition; W05 map từng field/action tới validators hiện có.

### J02 — Tạo chuyến đi → mở workspace

Entry `/trips` → `/trips/new`; permission dựa viewer/session hiện hành. Required fields, date constraints/timezone lấy từ current form/serializer; không đưa cover/destination giả vào POST.

1. Form pristine → dirty → invalid/valid; lỗi có mô tả và focus summary/field phù hợp. Giữ draft khi request lỗi.
2. Submit với current intent/idempotency semantics; pending giữ label, không cho duplicate creation.
3. Server authoritative success → Trip detail/overview; errors phân biệt validation/permission/unavailable/ambiguous theo current repository; không tự tạo local Trip để báo thành công.
4. List back/refetch giữ opaque cursor và chỉ hiển thị counts có căn cứ. Không chuyển cursors thành page number.
5. Settings dùng expected version, conflict giữ draft và cho reload/đối chiếu; không silent overwrite. Overview đọc tổng hợp theo panel: Plan lỗi không che Members có dữ liệu, Fund not-enabled không phải lỗi tổng trang.

Boundaries: Trip endpoints và invariants4/6/8. W04 map Overview/Create theo source; compact/progressive layout là DLT07 chưa duyệt. CP05 chịu trách nhiệm implementation/test.

### J03 — Lịch trình: xem → chỉnh sửa → đối chiếu

Entry `T/plan`; all/day/unassigned là presentation của cùng Plan. Mọi dates theo Trip timezone, date-only không bị ép thành timestamp.

1. Loading skeleton ổn định → populated/empty/error; empty có primary add chỉ khi policy cho phép.
2. Chọn activity → editor; form giữ ID/version/draft. Date-only, overnight và chưa chọn ngày có wording riêng; không ép mọi item phải có giờ/địa điểm.
3. Save → pending; error giữ draft, version conflict yêu cầu đối chiếu/tải lại thay vì ghi đè. Unknown không được báo “Đã lưu”; action recovery phải theo coordinator hiện hữu nơi được dùng.
4. Completion/delete chỉ cập nhật theo authoritative behavior hiện có; delete có confirm khi cần, focus trở về vị trí hợp lý nếu item đã mất.
5. Reorder có keyboard alternative, announcements và full ordered ID list theo model, không chỉ IDs đang nhìn thấy trong filtered day. Không dùng animation làm tín hiệu server accepted.
6. Map là optional read projection; provider unavailable vẫn có list. Không tự sinh travel times, online presence, AI auto-plan hoặc booking.

Boundaries: Plan endpoints + invariants4/5/8/9. Bốn ảnh Figma đã xem xác minh thiết kế populated/main/unassigned/map, không chứng minh editor/reorder/runtime hoạt động. Ba ảnh AI trước đó không làm target.

### J04 — Quỹ TEST thủ công: báo chuyển → xác nhận

Entry `T/fund`; not-enabled, loading, denied và unavailable là bốn trạng thái riêng. Luôn ghi TEST/manual; không dùng hình ảnh QR hoặc success animation để hứa payment settlement.

1. Setup/budget/destination consent hiển thị theo actual role/state. Owner và Holder độc lập; không bàn giao Holder, không thêm expense/refund/closure/reversal workflow.
2. Contribution request → contribution instruction; amount giữ int64 string, chỉ format ở display. Destination chưa consent/không hợp lệ có lý do và hành động đúng quyền.
3. Member report-transfer chỉ là báo đã chuyển; UI chuyển sang chờ xác nhận, không tăng received total bằng suy đoán.
4. Holder reject-transfer phải có lý do đọc được; confirm-received chỉ sau authoritative command success. Retry dùng cùng key/body; PROCESSING/PENDING_RECOVERY/UNKNOWN/NEEDS_REVIEW hiển thị bền vững, không toast success sớm.
5. Ledger và totals refetch/reconcile theo current runtime; error không thay bằng0đ. Pagination giữ opaque cursor; tiền và status luôn đọc được khi narrow reflow.

Boundaries: Fund setup/read, Contributions, Ledger/instruction, Operation recovery. W04 cần pending/rejection/permission compositions; W05 map từng state/action tới current finance coordinator.

### J05 — Mời thành viên → recipient chấp nhận

Entry `T/members`; owner/policy controls và member list/cursor theo actual permissions. Invitation count không đồng nhất với member count.

1. Create/resend/revoke invitation dùng current command/intent; pending và unknown không báo link đã gửi hoặc email đã nhận nếu chưa có evidence.
2. Recipient `/invitations` preview token → xác minh đúng account/session → accept/decline. Wrong account có đường đổi tài khoản an toàn; expired/revoked/invalid có lời giải thích và quay lại phù hợp.
3. Login returnTo nội bộ tiếp tục flow hiện hữu, capture/scrub token; không đưa token vào screenshot/mock artifacts.
4. Current InvitationPage dùng authoritative membership receipt để refresh projections và mở Trip; response ambiguous giữ memory attempt/key/action. Không áp Finance PROCESSING/poll `/operations` vào recipient flow. Policy journal, lifecycle coordinator và invitation attempts là các cơ chế riêng; xem MEMBERS_SPEC.
5. Remove/leave có confirmation theo current eligibility, giữ operation status và recovery khi response ambiguous. Không mở Owner transfer/Holder handover. PlanEditPolicy edit có version/conflict và quyền riêng.

Boundaries: Members/Invitations/Operation recovery + invariants5/9/10. W04 cần recipient transition ngoài owner view; CP08 implementation.

## 4. Reflow, accessibility và state behavior chung

- 1440: giữ frame nguồn. 1366×520: phải truy cập được mọi control/content bằng scroll/keyboard; target first-row-before-scroll cũ thuộc DLT03, không là gate ép thay banner. Chưa runtime PASS.
- 820/768: chuyển layout khi content không đủ chỗ; không mặc định breakpoint mới chỉ vì thiết bị. Navigation có menu với accessible name; hành vi breakpoint cuối cùng phải test trong CP03/04.
- 402/320: theo Web contract785:6670, không iOS status/tab bars; đảm bảo labels/status/control không mất. Chi tiết Plan day-nav/panel placement thuộc DLT09, không tự bỏ nested-scroll desktop nguồn. Nội dung có thể reflow chứ không scale screenshot.
- Editor hiện dùng Drawer bên phải; giữ fields/validation/focus behavior. Narrow full-width và dirty-close confirmation mới phải ghi DLT09/PLN07, không coi đã có hoặc đã duyệt. Return focus không phụ thuộc animation; fallback khi trigger bị xoá cần test.
- 200% native zoom, long Vietnamese text, keyboard-only, reduced motion và screen-reader là các gates cần verify, chưa được suy từ mockup.
- Read states: loading/populated/empty/partial failure/stale/denied/not-found/unavailable. Mutation states giữ riêng pending/recovery/unknown/review/success/failure. Status không chỉ dựa màu hoặc spinner; role/status announcement không lặp vô hạn.
- Motion chỉ giúp nhận biết mở/đóng, reorder và feedback; giảm hoặc bỏ transform khi reduced motion, không trì hoãn guard/data/focus. Chi tiết token hiện là proposal tại [design system](DESIGN_SYSTEM.md).

## 5. Review gates và công việc còn lại

W02 hoàn tất ở mức IA/journey/contract boundaries; W03 source alignment complete; W04/W05 bàn giao family/route/foundations specs và bản nháp D18. Cập nhật cuối: CP02 COMPLETE theo explicit closure D20; visual QA còn thiếu được miễn D19, không PASS. Các contrast/font/motion/delta proposal chưa duyệt được bàn giao riêng; [nghiệm thu cuối](CP02_ACCEPTANCE.md) thay trạng thái review từng phần của W06-A. Không chờ chọn ảnh AI, không mở CP03.

Không thay đổi 22-route coverage hoặc roadmap. Những gap không có Figma riêng (recovery/404/async states) thuộc CP04/03 và phải nhận spec trong W04/W05. Map/Dress/Packing, Price Watch/Notifications và Admin có owner CP07/10 theo route matrix, không bị bỏ khỏi redesign chỉ vì W03 dùng màn Plan.

Baseline CP01 vẫn giữ: lint/typecheck/build và545 unit tests PASS; fixture8 FAIL, HTTP-mock4 FAIL; live Backend NOT_RUN. Tài liệu/ảnh CP02 không resolve hoặc miễn12 failures này.
