# Prompt copy-paste — Phase 7: Target domains

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: chỉ mở một domain target khi Backend runtime đã có evidence đầy đủ. Domain: [Travel / DSS / Finance / Export-Share / Price Watch / Notifications / Admin].

Đọc toàn bộ docs nền và screen/flow/state/Figma docs. Đọc Gateway route, service handler, OpenAPI/contract, permission, runtime flag và integration test của domain; chỉ đọc Backend, không sửa.

Task input:
- Phase: 7
- Flow/domain: [điền]
- Route: [điền]
- Actor/capability: [điền]
- Figma frame/node: [điền]
- Screen contract: [điền]
- Data mode: gateway

Không bắt đầu nếu thiếu một trong các bằng chứng: Gateway route, handler, request/response, permission/projection, error mapping, version/idempotency, runtime config và test/evidence. Nếu thiếu, ghi unavailable/partial-runtime và dừng ở contract/documentation; không tạo API giả.

Implement theo vertical slice:
route → query/preview → view model → permission → pending → success/error/conflict/unknown → mutation/job recovery → test.

Giữ nguyên các quy tắc domain:
- Travel/DSS: source, fetched_at, stale/provider error; preview không ghi; Apply kiểm tra proposal/version/idempotency.
- Finance: TEST/sandbox rõ ràng, ledger/receipt/version/idempotency, callback/duplicate/unknown state; không giả báo đã nhận tiền.
- Export/Share: job queued/processing/succeeded/failed/expired, captured versions, private download, revoke/expiry.
- Price Watch: owner/user scope, source/time, pause/resume, cooldown; không coi là đặt vé.
- Admin: admin permission, reason bắt buộc, audit, feature flag và retry state.

Component không gọi fetch hoặc đọc raw envelope. Không lưu secret/token. Tạo Issue/branch/PR từ develop. Chạy lint, typecheck, test, build, E2E và browser review. Báo cáo runtime evidence, Figma mapping, security/permission, state coverage và gaps.
```
