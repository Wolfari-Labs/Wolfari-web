# Audit Web và tích hợp

Ngày 12/11/2026. Quét tĩnh repo hiện tại và đọc nội dung SRS v1.2 qua OOXML; không kiểm tra layout Word. SHA256 nguồn: `5630360029ED882FDC77E23AEE524446ABD3DB842C92D88BD12A263A8A437EAA`. Source inventory ghi commit; worktree ban đầu sạch. Không sửa Backend hoặc frontend để test đạt.

## Kết quả chính

| Nhóm | Route/component | Hiện trạng qua mã nguồn | Suite cũ đáng tái sử dụng |
|---|---|---|---|
| Authentication | login/register/forgot-password/verify-email/reset-password; AuthPage/IdentityActionPage | Session, CSRF, register/verify/recovery/logout đã có consumer; chưa kiểm chứng live lần này | identity.spec.ts; e2e-live/demo.spec.mjs |
| Profile | /profile; ProfilePage | GET/PATCH me, avatar/password/sessions/preferences; version và conflict | identity.spec.ts |
| Dashboard | / và /trips; HomeRoute/TripListPage | Home editorial không phải DSS thật; Trips phân trang dữ liệu đã tải | trip-overview/trips |
| Trip | /trips/new, /trips/:tripId, settings | Create/update/read có consumer; lifecycle/clone/transfer chưa đủ UI integration | trips/cp05-create |
| Membership | /invitations, /invitations/local, trips/:id/members | Roster, invite, accept/decline/revoke, remove/leave; guard trạng thái và revision | invitations/members-policy/cp08-lifecycle |
| PlanEditPolicy | members | OWNER_ONLY/ALL_MEMBERS/SELECTED_MEMBERS, membership revision; Owner không đồng nghĩa Holder | members-policy |
| Timeline | trips/:id/plan | CRUD/order/completion, shared version, dirty/conflict/unknown, keyboard reorder | plan/gateway-plan-dnd/timeline-interaction |
| Location/Map | trips/:id/map | Plan projection và consumer capability-gated; provider/write chưa chứng minh qua Gateway thật | preparation-srs12/cp07-projections |
| Dress | trips/:id/dress-code | DAY/ACTIVITY consumer capability-gated; không suy từ Preview ra server save | preparation-srs12 |
| Packing | trips/:id/packing | Item/assignment/completion consumer capability-gated, preview riêng | preparation-srs12 |
| DSS | Map/Plan/Preparation panels | Consumer travel/recommendation; cần provider/capability/runtime thật | preparation-srs12 |
| Finance | trips/:id/fund | Consumer cấu hình, contribution, ledger, notes, reversal, expense/refund/closure/history; nhiều giới hạn Backend | finance-* |
| Price Watch | trips/:id/price-watch | Runtime lifecycle/observations; MOCK_FLIGHT không phải giá thương mại | price-observations-cp10 |
| Notification | Shell và Profile | In-app read/preferences có consumer; delivery/reminder chưa chứng minh | ui-acceptance và tests liên quan |
| Export | Chưa có route riêng/luồng hoàn chỉnh | Chưa có E2E export thật; không tạo download giả | Chưa có live đủ scope |
| Public Share | Chưa có route public-share | Chưa có E2E allowlist/password/revoke thật | Chưa có live đủ scope |
| Admin | /admin; AdminPlaceholder | Hiển thị rõ chưa triển khai; navigation không phải CRUD | admin-placeholder |
| UI/UX/Security | 22 route gồm wildcard | Accessible primitives, route guards, error boundaries, loading/empty/error states; cần runtime validation | cp11/cp08/cp07/native-zoom/ui-* |

## API và invariants

`inventory.json` giữ 68 dòng tham chiếu endpoint từ infrastructure/model (không phải 68 endpoint duy nhất). API động có thể nằm trên nhiều dòng; phải đọc method/body cạnh từng vị trí trước khi viết thêm test.

- Auth: `/api/v1/auth/csrf`, login/refresh/logout/register; session và CSRF không được giả bằng storage state tùy ý. Me/profile dùng expected_version.
- Trips: POST có client_request_id và Idempotency-Key; PATCH giữ expected_plan_version/expected_export_revision; plan-policy dùng expected_membership_revision.
- Plan: GET snapshot; Activity POST/PATCH/DELETE và PUT order; order giữ đầy đủ ID; version cũ không ghi đè.
- Membership/Invitation: recipient, token, membership và lifecycle checks tại Backend; token không được public trong report.
- Finance: ledger và balance phải đối chiếu theo tiền VND; report transfer không phải credit; command coordinator giữ intent/receipt khi kết quả unknown.
- Watch: mỗi watch có version/threshold/creator riêng; nhóm query không cấp quyền; verify fetch dedup cần log/inspection được cấp, không chỉ cùng giá.
- Notification: accepted event/read/preferences không chứng minh email/push delivery.

Đã đọc `Wolfari-backend/apps/api-gateway/src/gateway-router.ts`, `plan-proxy.ts` và contract frontend. Router phân phối Identity, Trip, Membership, Invitation, Plan, Finance, PriceWatch, Notification. PlanProxy hiện match `(plan|activities)` và chỉ read projection Location/Dress/Packing; chưa thấy route writes preparation/travel trong router này. Do đó consumer Web mới và HTTP mock không chứng minh backend deployed hỗ trợ. Không sửa Backend, không chạy script seed/reset/database.

## Lệch yêu cầu và phụ thuộc

- Admin placeholder và thiếu Export/Public Share không thể coi đáp ứng FR-AD-01/FR-EX/FR-TR-08…10.
- FR-FIN-06 handover chưa có route tương ứng. Giữ nguyên BE-01…04 trong `../backend-integration-gaps.md`: receipt retrieval, refund self-verification, handover, reversal reason. Đây là phát hiện tĩnh, không kết quả E2E hiện tại.
- SRS có AT-25 Web–Android: suite này chỉ kiểm chứng phần Web, không thay Android bằng browser context.
- Các tiêu chí OQ chưa chốt giữ SPEC_BLOCKED; tiêu chí rõ vẫn có thể thiết kế/test kỹ thuật mà không tuyên bố baseline đã phê duyệt.
- Môi trường demo được manifest chỉ tới Web localhost:5273, Gateway 127.0.0.1:13000. Read-only probe trong lượt này: cả hai UNREACHABLE. Không có biến WOLFARI_QA_* được cung cấp. Không tự lấy credential từ seed để kích hoạt writes.

## Giới hạn audit

Inventory quét toàn bộ file/route/spec và đọc các entry/contract trọng yếu; chưa phải review từng dòng của mọi component. 69 spec cũ được giữ nguyên, không chạy lại hay chuyển kết quả cũ thành Passed mới. Chưa kiểm tra Figma trực tiếp trong đợt này; dùng UI contract/route matrix hiện có và không sửa visual. Không kết luận Visual Regression Passed. Chưa có audit độc lập đầy đủ cho toàn bộ mapping method/request/response/error của Backend; cần tiếp tục khi triển khai từng module.
