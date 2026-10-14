# Prompt copy-paste — Phase 6: Plan và Activity

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: tích hợp Plan snapshot và Activity theo runtime contract, giữ concurrency, permission và idempotency behavior.

Đọc toàn bộ docs nền và screen/flow/state/Figma docs. Đọc Gateway plan proxy, Trip plan access/service handler, OpenAPI/contract; không sửa Backend.

Task:
- Phase: 6
- Flow: Plan/Activity
- Route: /trips/:tripId/plan
- Data mode: gateway
- Actor: Member/Plan Editor/Owner
- Figma frame/node: [điền]
- Screen contract: docs/screen-contracts.md#contract-plan--activity

Preflight:
1. Tạo Issue/branch từ develop và chuẩn bị PR target develop.
2. Xác minh snapshot fields, permissions, plan_version, export_revision, activity fields và error mapping.
3. Không triển khai locations/dress/packing nếu chỉ có projection hoặc chưa có CRUD runtime.

Implement:
- read Plan snapshot;
- Activity create/edit/delete;
- reorder toàn bộ list;
- completion theo rule Member/Plan Editor;
- validation title/type/time/position;
- pending/duplicate submit handling;
- 403, 404, 409, validation, 503 và unknown state.

Mỗi write gửi expected_plan_version và Idempotency-Key theo contract. Không tự tăng version. Khi 409, refetch snapshot trước khi cho retry. Khi timeout, không hiển thị saved và không tạo key mới cho cùng intent nếu contract cho phép retry.

Timeline desktop có scroll boundary đúng; mobile không biến thành app canvas, content title nằm trong main. Component không gọi fetch. Chạy lint, typecheck, test, build, E2E/browser và báo cáo revision/idempotency evidence.
```
