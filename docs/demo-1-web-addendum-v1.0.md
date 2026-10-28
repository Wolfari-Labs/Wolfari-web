# Demo1 Web — phụ lục implementation v1.0

Cập nhật **29/10/2026**. Web `feat/demo-1-web`; Backend `feat/demo-1-backend`; working tree chưa commit. Phụ lục ghi **đã triển khai** tách khỏi **đã nghiệm thu**: chỉ [validation](demo-1-web-validation.md) với run ID hiện hành quyết định gate, không lấy code/build thay browser. Phạm vi là core + quỹ thủ công TEST, không toàn MVP.

Giữ nguyên audit ở thư mục cha, Mobile và ba DOCX chính thức. Ngoại lệ Backend đã được người dùng phê duyệt: đưa `rejected_reason` qua RPC/REST + contract/test/docs; không mở quyền đọc, không migration mới. Các thay đổi Backend khác có sẵn từ đợt Backend trước đó.

## 1. Nguồn chuẩn

- **C0:** Backend [local-demo](../../Wolfari-backend/docs/architecture/local-demo.md), [handoff](../../Wolfari-backend/docs/architecture/demo-1-web-handoff.md), scripts config/migrations; Web [runbook duy nhất](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md).
- **C1:** Backend [trip-core OpenAPI](../../Wolfari-backend/docs/api/trip-core.openapi.yaml), create/update/policy và interval/timezone.
- **C2:** Backend [Plan OpenAPI](../../Wolfari-backend/docs/api/plan.openapi.json), Trip V003, `trip.proto`, [Backend addendum](../../Wolfari-backend/docs/architecture/demo-1-addendum-v1.0.md).
- **C3:** Backend [membership OpenAPI](../../Wolfari-backend/docs/api/trip-member-lifecycle.openapi.json), invitation runtime và C1 policy.
- **C4:** Backend [Fund OpenAPI](../../Wolfari-backend/docs/api/finance-fund.openapi.json), [contributions OpenAPI](../../Wolfari-backend/docs/api/finance-contributions.openapi.json), Finance repositories và `finance.proto`.
- **C5:** Backend operation protocol/Trip–Finance recovery và Web `command-coordinator.ts`, `OperationStatus.tsx`.
- **C6:** Identity runtime/OpenAPI trong [runtime inventory](../../Wolfari-backend/docs/api/runtime-inventory.json); Web Identity adapter/session manager.
- **C7:** [Rejection feedback addendum](../../Wolfari-backend/docs/architecture/demo-1-rejection-feedback.md), `ContributionView.rejected_reason` field15, REST nullable.
- **C8:** [Audit](../../WOLFARI_DEMO_1_AUDIT_VA_KE_HOACH.md) §§4–7 và [integration matrix](gateway-integration-matrix.md).

SRS v2.3, ERD v1.2, DDL/API/Event Specification v1.1 DOCX trong Backend là baseline thiết kế. Các phụ lục versioned phản ánh runtime bổ sung, không sửa ngược migrations đã áp dụng hoặc tạo OpenAPI khác ở Web.

## 2. Truy vết 34 tác vụ bắt buộc

Tất cả hàng dưới có implementation trong working tree. “Gate” là tiêu chí đóng cần đối chiếu kết quả mới tại validation, không mặc định PASS. Prefix nguồn ngắn: Gateway* nằm `src/features/{trips,plan,members,fund}`; adapters dưới `src/infrastructure`; test unit dưới `tests`, mock dưới `tests/e2e-gateway`, real dưới `tests/e2e-demo1`. Tác vụ/độ lớn/phụ thuộc gốc giữ theo audit, thứ tự nền→core→quỹ→UX/QA.

| ID | Ưu tiên | Kết quả triển khai / nguồn | Test / contract | Gate đóng |
| --- | --- | --- | --- | --- |
| INF-01 | P1 | Launcher/harness cô lập, giữ IDs và ledger qua restart; `scripts/demo1-e2e.mjs` | e2e-demo1: restart; C0 | Start→UI→restart→đọc lại đúng Trip/Plan/500000; không đụng dữ liệu cá nhân |
| INF-02 | P1 | Lỗi dependency theo module, không biến lỗi thành quỹ rỗng; `GatewayOverview; GatewayFundPage` | e2e-demo1: Finance/DB/MinIO/broker; C0,C4 | Finance mất: Plan vẫn đọc; lỗi read không thành0; phục hồi đọc lại |
| INF-03 | P1 | Recovery UI và runbook operation treo; `OperationStatus; command-coordinator` | demo1-finance; finance-operations.spec; C5 | 202/NEEDS_REVIEW giữ guard; chỉ terminal mới hoàn tất; retry đúng intent |
| INF-04 | P1 | Tài khoản từ journal, không email/password mặc định; `HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md` | Backend demo:accounts + demo1 register; C0 | Không reset/seed lại để tìm password; phân biệt account test và demo |
| AUTH-01 | P1 | Auth/Profile/avatar/Sessions thật; `auth/ProfilePage; IdentityActionPage` | identity.spec; e2e-demo1 identity; Backend identity integration; C6 | Register/verify/resend/reset/change/revoke/logout; avatar bền và lỗi MinIO rõ |
| AUTH-02 | P0 | Cookie coordination theo origin; token memory; `session/coordinated-session` | coordinated-session; e2e-demo1 shared-cookie; C6 | Hai tab đồng thời refresh; logout không hồi sinh phiên; không broadcast token |
| AUTH-03 | P0 | Draft/cache theo actor; legacy ownerless không nhập; `GatewayCreateTripPage; main.tsx` | gateway-create-trip; e2e-demo1 same-SPA; C1,C6 | A→logout→B cùng SPA không thấy draft/cache A; không replay A |
| HOME-01 | P1 | Entry points Guest/Login/Trips/Create; `app/HomeRoute` | e2e-demo1 navigation; fixture shell; C1 | Đi qua UI không cần gõ URL; chức năng chưa có không fake success |
| TRIP-01 | P1 | Chỉ tên/mô tả/ngày/timezone thực sự lưu; `GatewayCreateTripPage` | trips.spec; e2e-demo1 create; C1 | Không destination/style/budget/template giả; artwork ghi minh họa |
| TRIP-02 | P0 | Interval end-exclusive theo timezone, giữ end giờ lẻ; `shared/lib/calendar; plan-presentation; TripSettingsPage` | demo1-foundation; trip-list-query; Backend demo1 dates; C1,C2 | Một ngày/cuối tháng/năm/DST/end giờ lẻ đúng; metadata PATCH không đổi instant |
| TRIP-03 | P1 | Strict Trip/scope/permission/revision decoder; `trip.gateway-repository; http/decode` | trip-repository; demo1-foundation; C1 | Malformed không thành empty/quyền hợp lệ |
| TRIP-04 | P1 | Create immutable intent/key qua reload; `GatewayCreateTripPage` | gateway-create-trip; e2e-demo1 lost create response; C1 | Mất response sau commit replay cùng request, không tạo bản sao |
| TRIP-05 | P1 | Overview read composition độc lập lỗi; `GatewayOverview` | e2e-demo1 overview; trips.spec; C1,C2,C4 | Không fake totals/budget/balance hoặc lấy tổng từ một page |
| PLAN-01 | P0 | Một timeline server, drawer/form và day filter; `GatewayPlanPanel; PlanPage` | gateway-plan-panel; plan.spec; e2e-demo1; C2 | Reload/actor khác cùng lịch; không cạnh tranh local draft |
| PLAN-02 | P1 | Schedule/unschedule/timed/overnight; `GatewayPlanPanel.ActivityForm` | gateway-plan-panel; e2e-demo1 overnight; C2 | End date riêng; null/omission đúng, không cascade giờ |
| PLAN-03 | P1 | scheduledDate xuyên model/decoder/command/form; `plan.ts; plan.gateway-repository; plan-command-intent` | plan-gateway; Backend V003 + demo1; C2 | Ngày-only bền, không midnight giả; legacy patch bỏ field giữ ngày |
| PLAN-04 | P1 | Full permutation reorder; single move; keyboard; `GatewayPlanPanel` | gateway-plan-panel; plan.spec; e2e-demo1; C2 | Một request mỗi thao tác; timed drag cần xác nhận; không xóa giờ phía sau |
| PLAN-05 | P1 | Conflict/recovery/quyền completion độc lập; `use-plan-commands; GatewayPlanPanel` | plan-commands; e2e-demo1 conflict/revocation; C2 | 409 giữ input; đối chiếu trong drawer rồi xác nhận; Editor revoke chặn ghi |
| MEM-01 | P1 | display_name nullable, ID fallback thật; `membership.gateway-repository; GatewayMembersPage` | members-gateway; e2e-demo1 names; C3 | Không email/avatar đoán; pagination và include_left giữ scope |
| MEM-02 | P1 | GET/PUT đủ policy, saved assignments; `GatewayMembersPage; trip.gateway-repository` | members-policy.spec; e2e-demo1 selected/revoke; C1,C3 | Membership ID/revision; non-SELECTED không cấp quyền saved assignments |
| MEM-03 | P1 | EMAIL/LINK flow account mới, safe errors; `InvitationManagement; InvitationPage` | invitations.spec; invitations-gateway; e2e-demo1; C3 | Send accepted≠delivered; verify/reopen/accept; revoke/wrong account không join |
| MEM-04 | P1 | Leave/remove + Finance operations; recovery sau rời; `GatewayMembersPage; App.tsx` | demo1-finance; e2e-demo1 departure; Backend lifecycle; C3,C5 | Terminal mới cập nhật; Holder chặn; rejoin không Editor cũ; không bịa debtID |
| FIN-01 | P0 | HTTP adapter Fund/destinations/requests/contributions/ledger; `fund.gateway-repository; finance-decoders` | demo1-finance; e2e-demo1; C4 | Trip authorization trước absence;503/403 không thành zero/empty |
| FIN-02 | P1 | Setup/Holder/budget/destination + consent version; `GatewayFundPage` | e2e-demo1 owner≠holder và owner=holder; Backend finance; C4 | VND TEST; edit destination reset consent; budget không tiền |
| FIN-03 | P1 | Create/read/edit request, amount/waive/cancel; `GatewayFundPage.FundCommandForm` | e2e-demo1 management; Backend finance; C4 | Từng khoản đúng actor/amount/version/reason; metadata không ledger |
| FIN-04 | P1 | Self report → Holder reject → report → confirm; `GatewayFundPage; Backend rejected_reason projection` | demo1-finance; e2e-demo1 rejection reload; Backend finance; C4,C7 | Lý do gần nhất bền; chỉ Holder confirm; Owner không override |
| FIN-05 | P1 | Money/ledger exact strings, paging; `finance-decoders; GatewayFundPage.formatVnd` | demo1-finance; finance-operations.spec; real500000; C4 | Đúng2IN/500000, int64 không Number rounding, không tổng page |
| FIN-06 | P1 | Immutable command coordinator + recovery journal; `command-coordinator; OperationStatus` | demo1-finance; finance-operations.spec; real lost confirm response; C5 | 202/503/unknown/reload/replay không duplicate; bank memory/fingerprint |
| SAFE-01 | P0 | Packing Gateway read-only; `PackingPage` | e2e-demo1 deferred; fixture packing; C2 | Không writer/toast thành công chỉ React state |
| SAFE-02 | P1 | Map/Dress đọc thật, hoãn UI rõ ràng; `DeferredReadPage; GatewayOverview` | e2e-demo1 deferred; bundle checks; C2,C8 | Không trộn draft/fixture vào Gateway; nút chưa làm có lý do |
| UX-01 | P1 | Narrow/keyboard/drawer/error copy; `GatewayPlanPanel; DemoWorkspace styles; Drawer` | fixture164; gateway responsive; e2e-demo1 viewport/zoom; C8 | 320/402/768/1366/1440; focus return/scroll; không che recovery |
| QA-01 | P1 | Harness Backend thật dev/build, snapshot và ownership; `scripts/demo1-e2e; playwright.demo1.config` | test:e2e:demo1 + Backend integration; C0 | Không seed SQL nghiệp vụ/mock success; ghi PASS/FAIL/NOT RUN theo lớp |
| DOC-01 | P1 | Runbook/addendum/validation + runtime docs; `README; docs hiện hành` | traceability/link check; C8 | 49ID, sáu nhóm artifact, lịch sử không bị coi current |
| DOC-02 | P1 | Dùng contract Backend làm nguồn chuẩn; `http/envelope; adapters; integration matrix` | contracts:rest/check; decoder tests; C1,C2,C3,C4,C5 | Status/meta/scheduled_date/member/policy/Finance đúng spec, không fork OpenAPI |

## 3. 15 nhóm hoãn

Không tính là lỗi đang chặn demo1; không tuyên bố Web đã triển khai chỉ vì Backend có API. Mobile toàn bộ ngoài scope.

| ID | Kết quả hiện tại | Điều kiện mở lại / nguồn |
| --- | --- | --- |
| LATER-TRIP | Sau demo — Date-change batch/duplicate/Owner transfer/lifecycle | Khi cần đổi lịch toàn Trip/lifecycle, chốt preview KEEP/SHIFT và nghĩa vụ quỹ; C1, audit4.9 |
| LATER-ID | Sau demo — OAuth/đổi email/delete/retention | Khi mở account public và retention; không tự xóa account để né nghĩa vụ; C6, audit4.9 |
| LATER-FIN1 | Sau demo — Expense/receipt/note Web | Khi demo chi tiền; nghiệm thu private files, attribution và version; C4, audit4.9 |
| LATER-FIN2 | Sau demo — Reversal/refund/closure Web | Khi quyết toán/đổi Holder; nghiệm thu linked ledger và recipient consent; C4, audit4.9 |
| LATER-PAY | Sau demo — Provider thanh toán thật | Merchant/provider scope riêng; không thật hóa hướng dẫn TEST; C4, audit4.9 |
| LATER-AUTO1 | Sau demo — Finance outbox relay/delivery | Khi cần thông báo thật; outbox persisted không đồng nghĩa delivered; C8, audit4.9 |
| LATER-AUTO2 | Sau demo — Notification/Price Watch Web | Khi có inbox/preferences/provider scope; giữ nhãn MOCK_FLIGHT; C8, audit4.9 |
| LATER-AUTO3 | Sau demo — Reminder scheduler/context | Khi cần tự động nhắc; retry/lease/audience đúng; C8, audit4.9 |
| LATER-MAP | Sau demo — Locations writer/cộng tác Map | Khi mở địa điểm chia sẻ; server IDs/provider quota có acceptance riêng; C2, audit4.9 |
| LATER-PACK | Sau demo — Packing CRUD/assignment/completion | Khi có writer/role contract; bỏ readonly sau tests thật; C2, audit4.9 |
| LATER-DRESS | Sau demo — Dress writer ba scope | Khi cần chỉnh TRIP/DAY/ACTIVITY; kiểm version và calendar; C2, audit4.9 |
| LATER-DSS | Sau demo — Travel providers/DSS Preview-Apply | Khi có provider và preview/apply atomic contract; C8, audit4.9 |
| LATER-EX | Sau demo — Export immutable snapshot/Public Share | Khi mở public sharing; privacy/token expiry, day-only snapshot; C8, audit4.9 |
| LATER-ADMIN | Sau demo — Admin/support/audit portal | Khi có role/read scope và operator recovery có kiểm soát; C8, audit4.9 |
| LATER-INF | Sau demo — Containers app/production/domain | Khi deploy HTTPS; cần TLS/service DNS/secrets/backup và guards production; C0, audit4.9 |

## 4. Ma trận ảnh hưởng tài liệu và contract theo từng ID

“Cần cập nhật” ghi đích cụ thể và đã cập nhật trong đợt này, trừ hàng hoãn có điều kiện. “Không cần” nghĩa không có thay đổi artifact đó **trong đợt Web**, không khẳng định mọi tài liệu baseline đã mô tả toàn bộ runtime. Mobile compatibility chỉ đánh giá thiết kế; chưa chạy/build Mobile.

| ID | SRS | ERD/migrations | DDL/API/Event Specification | OpenAPI/Protobuf/event schemas | Runtime/README | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| INF-01 | Không cần — giữ nghiệp vụ C0 | Không cần — không đổi DB; C0 | Không cần — consume contract hiện hành C0 | Không cần — wire giữ nguyên C0 | Cần cập nhật — runbook + validation, phản ánh scripts/demo1-e2e.mjs | Không cần — thay Web, wire không đổi; C0 |
| INF-02 | Không cần — giữ nghiệp vụ C0,C4 | Không cần — không đổi DB; C0,C4 | Không cần — consume contract hiện hành C0,C4 | Không cần — wire giữ nguyên C0,C4 | Cần cập nhật — runbook + validation, phản ánh GatewayOverview; GatewayFundPage | Không cần — thay Web, wire không đổi; C0,C4 |
| INF-03 | Không cần — giữ nghiệp vụ C5 | Không cần — không đổi DB; C5 | Không cần — consume contract hiện hành C5 | Không cần — wire giữ nguyên C5 | Cần cập nhật — runbook + validation, phản ánh OperationStatus; command-coordinator | Không cần — thay Web, wire không đổi; C5 |
| INF-04 | Không cần — giữ nghiệp vụ C0 | Không cần — không đổi DB; C0 | Không cần — consume contract hiện hành C0 | Không cần — wire giữ nguyên C0 | Cần cập nhật — runbook + validation, phản ánh HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md | Không cần — thay Web, wire không đổi; C0 |
| AUTH-01 | Không cần — giữ nghiệp vụ C6 | Không cần — không đổi DB; C6 | Không cần — consume contract hiện hành C6 | Không cần — wire giữ nguyên C6 | Cần cập nhật — flow-map + runbook, phản ánh auth/ProfilePage; IdentityActionPage | Không cần — thay Web, wire không đổi; C6 |
| AUTH-02 | Không cần — giữ nghiệp vụ C6 | Không cần — không đổi DB; C6 | Không cần — consume contract hiện hành C6 | Không cần — wire giữ nguyên C6 | Cần cập nhật — flow-map + runbook, phản ánh session/coordinated-session | Không cần — thay Web, wire không đổi; C6 |
| AUTH-03 | Không cần — giữ nghiệp vụ C1,C6 | Không cần — không đổi DB; C1,C6 | Không cần — consume contract hiện hành C1,C6 | Không cần — wire giữ nguyên C1,C6 | Cần cập nhật — flow-map + runbook, phản ánh GatewayCreateTripPage; main.tsx | Không cần — thay Web, wire không đổi; C1,C6 |
| HOME-01 | Không cần — giữ nghiệp vụ C1 | Không cần — không đổi DB; C1 | Không cần — consume contract hiện hành C1 | Không cần — wire giữ nguyên C1 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh app/HomeRoute | Không cần — thay Web, wire không đổi; C1 |
| TRIP-01 | Không cần — giữ nghiệp vụ C1 | Không cần — không đổi DB; C1 | Không cần — consume contract hiện hành C1 | Không cần — wire giữ nguyên C1 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh GatewayCreateTripPage | Không cần — thay Web, wire không đổi; C1 |
| TRIP-02 | Không cần — giữ nghiệp vụ C1,C2 | Không cần — không đổi DB; C1,C2 | Không cần — consume contract hiện hành C1,C2 | Không cần — wire giữ nguyên C1,C2 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh shared/lib/calendar; plan-presentation; TripSettingsPage | Không cần — thay Web, wire không đổi; C1,C2 |
| TRIP-03 | Không cần — giữ nghiệp vụ C1 | Không cần — không đổi DB; C1 | Không cần — consume contract hiện hành C1 | Không cần — wire giữ nguyên C1 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh trip.gateway-repository; http/decode | Không cần — thay Web, wire không đổi; C1 |
| TRIP-04 | Không cần — giữ nghiệp vụ C1 | Không cần — không đổi DB; C1 | Không cần — consume contract hiện hành C1 | Không cần — wire giữ nguyên C1 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh GatewayCreateTripPage | Không cần — thay Web, wire không đổi; C1 |
| TRIP-05 | Không cần — giữ nghiệp vụ C1,C2,C4 | Không cần — không đổi DB; C1,C2,C4 | Không cần — consume contract hiện hành C1,C2,C4 | Không cần — wire giữ nguyên C1,C2,C4 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh GatewayOverview | Không cần — thay Web, wire không đổi; C1,C2,C4 |
| PLAN-01 | Không cần — giữ nghiệp vụ C2 | Không cần — không đổi DB; C2 | Không cần — consume contract hiện hành C2 | Không cần — wire giữ nguyên C2 | Cần cập nhật — plan-activity-ui-follow-up + screen-contracts, phản ánh GatewayPlanPanel; PlanPage | Không cần — thay Web, wire không đổi; C2 |
| PLAN-02 | Không cần — giữ nghiệp vụ C2 | Không cần — không đổi DB; C2 | Không cần — consume contract hiện hành C2 | Không cần — wire giữ nguyên C2 | Cần cập nhật — plan-activity-ui-follow-up + screen-contracts, phản ánh GatewayPlanPanel.ActivityForm | Không cần — thay Web, wire không đổi; C2 |
| PLAN-03 | Cần cập nhật — phụ lục truy vết ngày-only C2; DOCX giữ nguyên | Không cần — dùng V003/C2 đã có, không migration Web | Không cần — consume contract hiện hành C2 | Không cần — wire giữ nguyên C2 | Cần cập nhật — plan-activity-ui-follow-up + screen-contracts, phản ánh plan.ts; plan.gateway-repository; plan-command-intent | Cần xác minh thêm — decoder additive C2, NOT RUN |
| PLAN-04 | Không cần — giữ nghiệp vụ C2 | Không cần — không đổi DB; C2 | Không cần — consume contract hiện hành C2 | Không cần — wire giữ nguyên C2 | Cần cập nhật — plan-activity-ui-follow-up + screen-contracts, phản ánh GatewayPlanPanel | Không cần — thay Web, wire không đổi; C2 |
| PLAN-05 | Không cần — giữ nghiệp vụ C2 | Không cần — không đổi DB; C2 | Không cần — consume contract hiện hành C2 | Không cần — wire giữ nguyên C2 | Cần cập nhật — plan-activity-ui-follow-up + screen-contracts, phản ánh use-plan-commands; GatewayPlanPanel | Không cần — thay Web, wire không đổi; C2 |
| MEM-01 | Không cần — giữ nghiệp vụ C3 | Không cần — không đổi DB; C3 | Không cần — consume contract hiện hành C3 | Không cần — wire giữ nguyên C3 | Cần cập nhật — flow-map + screen-inventory, phản ánh membership.gateway-repository; GatewayMembersPage | Cần xác minh thêm — decoder additive C3, NOT RUN |
| MEM-02 | Không cần — giữ nghiệp vụ C1,C3 | Không cần — không đổi DB; C1,C3 | Không cần — consume contract hiện hành C1,C3 | Không cần — wire giữ nguyên C1,C3 | Cần cập nhật — flow-map + screen-inventory, phản ánh GatewayMembersPage; trip.gateway-repository | Cần xác minh thêm — decoder additive C1,C3, NOT RUN |
| MEM-03 | Không cần — giữ nghiệp vụ C3 | Không cần — không đổi DB; C3 | Không cần — consume contract hiện hành C3 | Không cần — wire giữ nguyên C3 | Cần cập nhật — flow-map + screen-inventory, phản ánh InvitationManagement; InvitationPage | Không cần — thay Web, wire không đổi; C3 |
| MEM-04 | Không cần — giữ nghiệp vụ C3,C5 | Không cần — không đổi DB; C3,C5 | Không cần — consume contract hiện hành C3,C5 | Không cần — wire giữ nguyên C3,C5 | Cần cập nhật — flow-map + screen-inventory, phản ánh GatewayMembersPage; App.tsx | Không cần — thay Web, wire không đổi; C3,C5 |
| FIN-01 | Không cần — giữ nghiệp vụ C4 | Không cần — không đổi DB; C4 | Không cần — consume contract hiện hành C4 | Không cần — wire giữ nguyên C4 | Cần cập nhật — integration-matrix + state-matrix, phản ánh fund.gateway-repository; finance-decoders | Không cần — thay Web, wire không đổi; C4 |
| FIN-02 | Không cần — giữ nghiệp vụ C4 | Không cần — không đổi DB; C4 | Không cần — consume contract hiện hành C4 | Không cần — wire giữ nguyên C4 | Cần cập nhật — integration-matrix + state-matrix, phản ánh GatewayFundPage | Không cần — thay Web, wire không đổi; C4 |
| FIN-03 | Không cần — giữ nghiệp vụ C4 | Không cần — không đổi DB; C4 | Không cần — consume contract hiện hành C4 | Không cần — wire giữ nguyên C4 | Cần cập nhật — integration-matrix + state-matrix, phản ánh GatewayFundPage.FundCommandForm | Không cần — thay Web, wire không đổi; C4 |
| FIN-04 | Không cần — giữ nghiệp vụ C4,C7 | Không cần — rejected_reason đã có V001/C7 | Cần cập nhật — projection rejection bằng C7, không đổi event | Cần cập nhật — REST nullable/RPC optional15, test; C4/C7 | Cần cập nhật — integration-matrix + state-matrix, phản ánh GatewayFundPage; Backend rejected_reason projection | Cần xác minh thêm — decoder additive C4,C7, NOT RUN |
| FIN-05 | Không cần — giữ nghiệp vụ C4 | Không cần — không đổi DB; C4 | Không cần — consume contract hiện hành C4 | Không cần — wire giữ nguyên C4 | Cần cập nhật — integration-matrix + state-matrix, phản ánh finance-decoders; GatewayFundPage.formatVnd | Không cần — thay Web, wire không đổi; C4 |
| FIN-06 | Không cần — giữ nghiệp vụ C5 | Không cần — không đổi DB; C5 | Không cần — consume contract hiện hành C5 | Không cần — wire giữ nguyên C5 | Cần cập nhật — integration-matrix + state-matrix, phản ánh command-coordinator; OperationStatus | Không cần — thay Web, wire không đổi; C5 |
| SAFE-01 | Không cần — giữ nghiệp vụ C2 | Không cần — không đổi DB; C2 | Không cần — consume contract hiện hành C2 | Không cần — wire giữ nguyên C2 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh PackingPage | Không cần — thay Web, wire không đổi; C2 |
| SAFE-02 | Không cần — giữ nghiệp vụ C2,C8 | Không cần — không đổi DB; C2,C8 | Không cần — consume contract hiện hành C2,C8 | Không cần — wire giữ nguyên C2,C8 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh DeferredReadPage; GatewayOverview | Không cần — thay Web, wire không đổi; C2,C8 |
| UX-01 | Không cần — giữ nghiệp vụ C8 | Không cần — không đổi DB; C8 | Không cần — consume contract hiện hành C8 | Không cần — wire giữ nguyên C8 | Cần cập nhật — screen-contracts + screen-inventory, phản ánh GatewayPlanPanel; DemoWorkspace styles; Drawer | Không cần — thay Web, wire không đổi; C8 |
| QA-01 | Không cần — giữ nghiệp vụ C0 | Không cần — không đổi DB; C0 | Không cần — consume contract hiện hành C0 | Không cần — wire giữ nguyên C0 | Cần cập nhật — runbook + validation, phản ánh scripts/demo1-e2e; playwright.demo1.config | Không cần — thay Web, wire không đổi; C0 |
| DOC-01 | Không cần — giữ nghiệp vụ C8 | Không cần — không đổi DB; C8 | Không cần — consume contract hiện hành C8 | Không cần — wire giữ nguyên C8 | Cần cập nhật — README + addendum + validation, phản ánh README; docs hiện hành | Không cần — thay Web, wire không đổi; C8 |
| DOC-02 | Không cần — giữ nghiệp vụ C1,C2,C3,C4,C5 | Không cần — không đổi DB; C1,C2,C3,C4,C5 | Không cần — consume contract hiện hành C1,C2,C3,C4,C5 | Không cần — wire giữ nguyên C1,C2,C3,C4,C5 | Cần cập nhật — gateway-integration-matrix, phản ánh http/envelope; adapters; integration matrix | Không cần — thay Web, wire không đổi; C1,C2,C3,C4,C5 |
| LATER-TRIP | Cần xác minh thêm — mở lại Date-change batch/duplicate/Owner transfer/lifecycle; audit4.9 | Không cần — đợt này không đổi DB; C1 | Cần xác minh thêm — scope tương lai; C1 | Không cần — chưa đổi wire; C1 | Cần cập nhật — inventory/matrix ghi hoãn LATER-TRIP | Cần xác minh thêm — nếu mở shared flow; C1, NOT RUN |
| LATER-ID | Cần xác minh thêm — mở lại OAuth/đổi email/delete/retention; audit4.9 | Không cần — đợt này không đổi DB; C6 | Cần xác minh thêm — scope tương lai; C6 | Không cần — chưa đổi wire; C6 | Cần cập nhật — inventory/matrix ghi hoãn LATER-ID | Cần xác minh thêm — nếu mở shared flow; C6, NOT RUN |
| LATER-FIN1 | Cần xác minh thêm — mở lại Expense/receipt/note Web; audit4.9 | Không cần — đợt này không đổi DB; C4 | Cần xác minh thêm — scope tương lai; C4 | Không cần — chưa đổi wire; C4 | Cần cập nhật — inventory/matrix ghi hoãn LATER-FIN1 | Cần xác minh thêm — nếu mở shared flow; C4, NOT RUN |
| LATER-FIN2 | Cần xác minh thêm — mở lại Reversal/refund/closure Web; audit4.9 | Không cần — đợt này không đổi DB; C4 | Cần xác minh thêm — scope tương lai; C4 | Không cần — chưa đổi wire; C4 | Cần cập nhật — inventory/matrix ghi hoãn LATER-FIN2 | Cần xác minh thêm — nếu mở shared flow; C4, NOT RUN |
| LATER-PAY | Cần xác minh thêm — mở lại Provider thanh toán thật; audit4.9 | Không cần — đợt này không đổi DB; C4 | Cần xác minh thêm — scope tương lai; C4 | Không cần — chưa đổi wire; C4 | Cần cập nhật — inventory/matrix ghi hoãn LATER-PAY | Cần xác minh thêm — nếu mở shared flow; C4, NOT RUN |
| LATER-AUTO1 | Cần xác minh thêm — mở lại Finance outbox relay/delivery; audit4.9 | Không cần — đợt này không đổi DB; C8 | Cần xác minh thêm — scope tương lai; C8 | Không cần — chưa đổi wire; C8 | Cần cập nhật — inventory/matrix ghi hoãn LATER-AUTO1 | Cần xác minh thêm — nếu mở shared flow; C8, NOT RUN |
| LATER-AUTO2 | Cần xác minh thêm — mở lại Notification/Price Watch Web; audit4.9 | Không cần — đợt này không đổi DB; C8 | Cần xác minh thêm — scope tương lai; C8 | Không cần — chưa đổi wire; C8 | Cần cập nhật — inventory/matrix ghi hoãn LATER-AUTO2 | Cần xác minh thêm — nếu mở shared flow; C8, NOT RUN |
| LATER-AUTO3 | Cần xác minh thêm — mở lại Reminder scheduler/context; audit4.9 | Không cần — đợt này không đổi DB; C8 | Cần xác minh thêm — scope tương lai; C8 | Không cần — chưa đổi wire; C8 | Cần cập nhật — inventory/matrix ghi hoãn LATER-AUTO3 | Cần xác minh thêm — nếu mở shared flow; C8, NOT RUN |
| LATER-MAP | Cần xác minh thêm — mở lại Locations writer/cộng tác Map; audit4.9 | Không cần — đợt này không đổi DB; C2 | Cần xác minh thêm — scope tương lai; C2 | Không cần — chưa đổi wire; C2 | Cần cập nhật — inventory/matrix ghi hoãn LATER-MAP | Cần xác minh thêm — nếu mở shared flow; C2, NOT RUN |
| LATER-PACK | Cần xác minh thêm — mở lại Packing CRUD/assignment/completion; audit4.9 | Không cần — đợt này không đổi DB; C2 | Cần xác minh thêm — scope tương lai; C2 | Không cần — chưa đổi wire; C2 | Cần cập nhật — inventory/matrix ghi hoãn LATER-PACK | Cần xác minh thêm — nếu mở shared flow; C2, NOT RUN |
| LATER-DRESS | Cần xác minh thêm — mở lại Dress writer ba scope; audit4.9 | Không cần — đợt này không đổi DB; C2 | Cần xác minh thêm — scope tương lai; C2 | Không cần — chưa đổi wire; C2 | Cần cập nhật — inventory/matrix ghi hoãn LATER-DRESS | Cần xác minh thêm — nếu mở shared flow; C2, NOT RUN |
| LATER-DSS | Cần xác minh thêm — mở lại Travel providers/DSS Preview-Apply; audit4.9 | Không cần — đợt này không đổi DB; C8 | Cần xác minh thêm — scope tương lai; C8 | Không cần — chưa đổi wire; C8 | Cần cập nhật — inventory/matrix ghi hoãn LATER-DSS | Cần xác minh thêm — nếu mở shared flow; C8, NOT RUN |
| LATER-EX | Cần xác minh thêm — mở lại Export immutable snapshot/Public Share; audit4.9 | Không cần — đợt này không đổi DB; C8 | Cần xác minh thêm — scope tương lai; C8 | Không cần — chưa đổi wire; C8 | Cần cập nhật — inventory/matrix ghi hoãn LATER-EX | Cần xác minh thêm — nếu mở shared flow; C8, NOT RUN |
| LATER-ADMIN | Cần xác minh thêm — mở lại Admin/support/audit portal; audit4.9 | Không cần — đợt này không đổi DB; C8 | Cần xác minh thêm — scope tương lai; C8 | Không cần — chưa đổi wire; C8 | Cần cập nhật — inventory/matrix ghi hoãn LATER-ADMIN | Cần xác minh thêm — nếu mở shared flow; C8, NOT RUN |
| LATER-INF | Cần xác minh thêm — mở lại Containers app/production/domain; audit4.9 | Không cần — đợt này không đổi DB; C0 | Cần xác minh thêm — scope tương lai; C0 | Không cần — chưa đổi wire; C0 | Cần cập nhật — inventory/matrix ghi hoãn LATER-INF | Cần xác minh thêm — nếu mở shared flow; C0, NOT RUN |

## 5. Contract delta và tương thích

Web thêm metadata HTTP status/exportRevision, scheduledDate, displayName/policy snapshot, FundRuntime và CommandCoordinator; không tạo endpoint Backend mới. Năm database/service ownership, gRPC/RabbitMQ/outbox/MinIO private giữ nguyên.

Ngoại lệ C7: DB đã có rejected_reason; Finance SELECT/RETURNING và projections trả field15 optional; REST Contribution thêm nullable string trong command/list/nested requests. UI ghi “Lý do từ chối gần nhất”, giữ sau re-report/confirm, không dùng lý do để suy status. Receipt cũ thiếu field→null; không ghép row live vào receipt cũ. Không expose bank snapshot/evidence, không đổi permission/version/input/idempotency/event. Kiểm trước/sau: old protobuf bytes decode; permission deny/privacy; reject→GET/reload; confirm/replay ledger chỉ một lần. Mobile cũ có thể bỏ qua additive field nhưng strict decoder cần kiểm riêng.

Day-only đã thuộc C2/V003 của đợt Backend: legacy rows NULL; không backfill giả; old client PATCH bỏ field giữ giá trị. Web timed→day-only gửi null hai timestamps; day-only→timed gửi cặp instant và null date. Reorder không đổi giờ; một move không ghép nhiều PATCH giả nguyên tử.

## 6. Vận hành, bằng chứng và giới hạn

- Default Chromium localhost. HTTPS production vẫn bắt buộc, cùng origin SPA/API, cookie Secure và link HTTPS; không tắt production guards Backend. TLS/domain/containers ứng dụng không triển khai trong đợt này.
- Harness dùng Compose/ports/volumes/runID riêng, labels kiểm ownership trước cleanup; giữ dataset cá nhân. Dữ liệu nghiệp vụ main scenario tạo qua UI, không business SQL seed.
- 202 chỉ pending; unknown không cho lệnh thay thế. Finance replay đúng receipt request; journal recipient memory-only; input lại sau reload phải đúng fingerprint. NEEDS_REVIEW giữ guard để operator đối soát, không SQL force-unlock.
- Policy dùng `policy-intent.ts`: yêu cầu actor/Trip/key/body/revision được giữ qua reload; không nạp journal của actor khác. Journal Finance/membership/policy hỏng hoặc bị chặn storage phải fail closed, không tự xóa để mint key mới. Test `policy-intent`, `demo1-finance` và mock `members-policy` kiểm trường hợp này.
- Plan command receipt được đối chiếu Trip/activity UUID, không chấp nhận resource thuộc scope khác. Drawer dùng fixed insets thay chiều cao `100dvh` để footer vẫn cuộn tới được ở document zoom2×; kiểm native browser zoom là lớp riêng tại validation.
- `demo1-snapshot` ghi full-tree và implementation hash (không gồm Markdown/DOCX/docs); harness kiểm code không đổi trong lượt dev/preview. `demo1-redact-artifacts` chỉ che dữ liệu nhạy cảm trong artifact đúng run ID, không đọc `.local` hoặc xóa kết quả lỗi.
- Gateway read failure không fallback fixture. Saved editor assignment trong OWNER_ONLY/ALL_MEMBERS inert; rejoin là membership mới. Leave success vẫn xem operation, không còn đọc dữ liệu Trip.
- Runbook không giả định demo-owner@wolfari.test tồn tại. Seed/password journal cục bộ; không log/token/credentials trong artifact.
- Số ca, runID, snapshot, lỗi đã sửa và NOT RUN phải đọc ở [validation](demo-1-web-validation.md). Không suy production/Mobile/provider thật/CI PASS từ local.

## 7. Tài liệu lịch sử

Flow map/screen inventory/state matrix/screen contracts có phần demo1 mới ở đầu; nội dung phase có ngày phía dưới được đánh dấu lịch sử, không nguồn readiness. Evidence15–23/10 không sửa số liệu cũ. Addendum này không làm thay đổi audit gốc; đối chiếu delta và gate mới thay vì xóa phát hiện lịch sử.
