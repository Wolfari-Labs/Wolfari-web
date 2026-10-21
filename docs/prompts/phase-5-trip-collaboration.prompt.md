# Prompt copy-paste — Phase 5: Trip và collaboration

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: tích hợp Trip list/detail/update, Invitations và Members theo vertical slice khi Gateway runtime đã được xác minh.

Đọc toàn bộ docs nền và screen/flow/state/Figma docs. Đọc Gateway Trip/invitation/membership proxy, service handler, OpenAPI và permission docs; không sửa Backend.

Task:
- Phase: 5
- Flow: [Trip List / Trip Overview / Invitations / Members]
- Routes: /trips, /trips/:tripId, /trips/:tripId/members hoặc deep link invitation
- Data mode: gateway
- Actor: User/Member/Owner
- Figma frame/node: [điền]
- Screen contract: [điền]

Preflight:
1. Tạo Issue, branch gắn số Issue từ develop, PR target develop.
2. Đối chiếu route/handler/request/response/projection/permission/error/version/idempotency.
3. Nếu capability chỉ partial/unknown, giữ unavailable hoặc fixture-only; không bịa endpoint.

Implement theo thứ tự phù hợp:
Trip list → select/detail → create/update nếu runtime đủ → invitation create/preview/accept/decline/revoke/resend → member projection/policy.

Giữ membership_revision, trip version, permission và idempotency. 403/404/409/503 phải map đúng UI state. Timeout mutation không báo success và không tạo intent mới mù. Member projection thiếu display name/avatar thì dùng fallback rõ ràng, không gọi /me cho người khác và không suy luận database.

Mobile dùng drawer trái/logo giữa/avatar phải/title trong content. Component không gọi fetch. Chạy lint, typecheck, test, build và E2E/browser. Báo cáo API evidence, state matrix, Figma mapping và gaps.
```
