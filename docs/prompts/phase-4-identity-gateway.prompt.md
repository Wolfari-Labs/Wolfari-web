# Prompt copy-paste — Phase 4: Identity/Gateway

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: tích hợp một vertical slice Identity Web qua API Gateway, không gọi trực tiếp Identity service.

Đọc toàn bộ tài liệu nền và các screen/flow/state/Figma docs trước khi code. Đọc Backend runtime: Gateway identity proxy, Identity handler, OpenAPI và environment contract; chỉ đọc, không sửa.

Task:
- Phase: 4
- Flow: Login/Register/Profile/Session
- Routes: /login, /register, /profile và route verify/reset nếu contract đã chốt
- Data mode: gateway
- Figma frames: [điền]
- Screen contract: docs/screen-contracts.md#contract-loginregisterrecovery

Preflight:
1. Kiểm tra git status/branch/commit graph.
2. Tạo Issue có acceptance criteria; branch <type>/<issue-number>-<flow> từ develop; PR target develop nếu remote hỗ trợ.
3. Xác minh Gateway route, handler, request/response, error envelope, CSRF, Origin và X-Client-Type: web.

Implement:
- domain model và repository/Gateway adapter;
- login, register, refresh, logout;
- profile/session nếu nằm trong scope;
- validation, pending, invalid credentials, unverified, rate limit, expired session, service unavailable;
- intended-route redirect;
- one-time verify/reset token trong memory, xóa khỏi URL, không vào log/cache/storage;
- access token memory-only, refresh token HttpOnly cookie.

Không lưu token localStorage/sessionStorage. Component không gọi fetch hoặc đọc raw envelope. Không bật Google OAuth nếu runtime contract chưa xác minh.

Kiểm tra lint, typecheck, test, build và E2E với API nếu môi trường có. Báo cáo API evidence, permission, security, files, tests, PR/Issue và contract gaps.
```
