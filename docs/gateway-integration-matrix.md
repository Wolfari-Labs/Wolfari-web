# Gateway integration matrix — demo1

Cập nhật 28/10/2026, thay trạng thái Feature #2–#8 cũ. Browser chỉ gọi relative /api/v1; không RPC/database/service secret.

| Năng lực | Gateway (bỏ prefix /api/v1) | Web / giới hạn |
| --- | --- | --- |
| Auth | /auth/register, login, csrf, refresh, logout | HTTP thật; register202 không login; Web Locks; token memory; epoch không nhạy cảm |
| Verify/reset | /auth/email-verifications, confirm, password-reset-requests, password-resets | Token scrub khỏi URL/storage; mở lại thư sau reload; send accepted không phải delivered |
| Profile/avatar/sessions | /me, /me/avatar, /me/password-change, /me/sessions | PATCH version; binary private; upload và attach hai bước; revoke204 |
| Trips | /trips; /trips/:id | Chỉ field lưu thật; actor draft/intent; [start,end), timezone; metadata PATCH giữ instant cũ |
| Plan | /trips/:id/plan; activities CRUD/order/completion | Một timeline server + drawer; day-only/overnight; full permutation giữ giờ; 409 giữ draft, đối chiếu trong drawer |
| Policy | GET/PUT /trips/:id/plan-policy | Owner, 3mode, membership ID/revision; non-SELECTED request[] nhưng saved assignments còn inert |
| Members | /trips/:id/members | Tên nullable, include_left/cursor; không suy email/avatar; lỗi trang sau giữ trang trước |
| Invitations | /trips/:id/invitations, revoke/resend; token preview/accept/decline | EMAIL/LINK, version/key; link memory-only; error không tiết lộ wrong-account/expired |
| Leave/remove | /trips/:id/leave; /trips/:id/members/:id | Operation/Finance nghĩa vụ; terminal mới rời; recovery screen sau mất quyền Trip |
| Fund | /trips/:id/fund; /funds/:id/budget | GET/setup/budget VND TEST;403/503 không thành0; Owner/Holder độc lập |
| Destination | /funds/:id/destinations; :id/confirm | Owner config, Holder consent version (kể cả cùng người); bank memory-only |
| Requests/contributions | /funds/:id/contribution-requests, contributions; /contributions/:id | Create/read/edit/amount/waive/cancel; cursor, version; metadata không tạo tiền |
| Manual | /contributions/:id/report-transfer, reject-transfer, confirm-received, vietqr | Self report, Holder reject/confirm; lý do gần nhất; text TEST, không fetch QR ngoài |
| Ledger | /funds/:id/transactions | Int64/sequence chuỗi; balance server, không tổng một trang |
| Operation | /operations/:id | PROCESSING/PENDING_RECOVERY/SUCCEEDED/FAILED/NEEDS_REVIEW; poll backoff hữu hạn, explicit retry đúng intent |
| Packing/Map/Dress | Plan read projection | Chỉ đọc Gateway; writer/local draft nằm ngoài demo |
| Finance nâng cao | Expense/receipt/note/refund/reversal/closure/payment API | Backend có phần runtime; Web writers sau demo |
| Notification/Price Watch | Runtime Backend, MOCK_FLIGHT | Web chưa mở; không gọi mô phỏng là delivery/giá thật |
| Travel/DSS/Export/Share/Admin | Chưa nghiệm thu trọn luồng | Hoãn, không fake success |

Nguồn chuẩn Backend: [Trip/policy](../../Wolfari-backend/docs/api/trip-core.openapi.yaml), [Plan](../../Wolfari-backend/docs/api/plan.openapi.json), [Members](../../Wolfari-backend/docs/api/trip-member-lifecycle.openapi.json), [Fund](../../Wolfari-backend/docs/api/finance-fund.openapi.json), [Contributions](../../Wolfari-backend/docs/api/finance-contributions.openapi.json), [inventory](../../Wolfari-backend/docs/api/runtime-inventory.json). Không tạo OpenAPI cạnh tranh ở Web.

## Transport, recovery, privacy

HTTP giữ status/correlation/details/meta.export_revision; decoder sai kiểu/scope/enum/version không dựng quyền hoặc empty giả. Transport không retry mutation;204 không parse JSON;202 không receipt hoàn tất.

Finance/membership journal sessionStorage theo actor/Trip được kiểm định. Bank input chỉ memory; reload poll/refetch, cần replay thì nhập lại so fingerprint. Không lưu được journal thì chặn ghi. Không đổi key khi unknown/409/NEEDS_REVIEW. Finance operation không trả resourceID; success lấy lại receipt đúng request nếu có body rồi refetch.

Policy read-back so với receipt thay vì request[]; saved assignments không đồng nghĩa quyền. Recovery route sau leave chỉ cho actor xem kết quả thao tác, không bypass guard dữ liệu Trip.

Demo localhost5273 proxy Gateway13000; production HTTPS cùng origin, không secrets VITE_*. [Runbook](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md).

Fixture/mock/live là ba lớp riêng: xem [validation](demo-1-web-validation.md), [49task/addendum](demo-1-web-addendum-v1.0.md). Health PASS không thay nghiệp vụ. Evidence cũ giữ ngày trong các báo cáo phase.
