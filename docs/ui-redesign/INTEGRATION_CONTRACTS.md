# Backend compatibility boundary

Snapshot CP-01 29/10/2026. Audit read-only: Frontend repositories/decoders/intents/session, đối chiếu endpoint inventories trong `../Wolfari-backend/docs/api/`. Không sửa Backend. **Không phải xác nhận full schema parity hoặc live Backend acceptance**. Source Figma không được ghi đè contract.

## 1. Nguồn và endpoint map

Prefix `/api/v1` áp dụng mọi path dưới đây. `{id}`/`{tripId}` là identifier đã validate/encode, không được dùng display name làm key.

| Flow | Method / paths đang dùng | Frontend boundary | Backend document |
|---|---|---|---|
| Session | GET `/auth/csrf`; POST `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` | `session/session-manager.ts`, access-token-store, coordinated-session | identity.openapi.yaml |
| Profile/security | GET/PATCH `/me`; GET `/me/sessions`; DELETE `/me/sessions/{id}`; GET/POST `/me/avatar`; POST `/me/password-change` | identity.gateway-repository | identity.openapi.yaml |
| Verification/recovery | POST `/auth/email-verifications`, `/auth/email-verifications/confirm`, `/auth/password-reset-requests`, `/auth/password-resets` | identity gateway + IdentityActionPage | identity.openapi.yaml |
| Trip | GET/POST `/trips`; GET/PATCH `/trips/{tripId}`; GET/PUT `/trips/{tripId}/plan-policy` | trip.gateway-repository; shell also reads Trip/me | trip-core.openapi.yaml |
| Plan | GET `/trips/{tripId}/plan`; POST `/trips/{tripId}/activities`; PATCH/DELETE `/trips/{tripId}/activities/{id}`; PATCH `/trips/{tripId}/activities/{id}/completion`; PUT `/trips/{tripId}/activities/order` | plan.gateway-repository, Plan validators/intent | plan.openapi.json |
| Members | GET `/trips/{tripId}/members`; POST `/trips/{tripId}/leave`; DELETE `/trips/{tripId}/members/{id}` | membership gateway + command-coordinator | trip-member-lifecycle.openapi.json |
| Invitations | GET/POST `/trips/{tripId}/invitations`; POST `/trips/{tripId}/invitations/{id}/resend` or `/revoke`; POST `/invitations/preview`, `/accept`, `/decline` | invitation.gateway-repository | trip-invitations.openapi.json |
| Fund setup/read | GET/POST `/trips/{tripId}/fund`; PATCH `/funds/{id}/budget`; GET/POST `/funds/{id}/destinations`; PATCH `/funds/{id}/destinations/{destinationId}`; POST same + `/confirm` | fund gateway + finance-decoders + coordinator | finance-fund.openapi.json |
| Contributions | GET/POST `/funds/{id}/contribution-requests`; PATCH same + `/{requestId}`; GET `/funds/{id}/contributions`; PATCH `/contributions/{id}`; POST same + `/waive`, `/cancel`, `/report-transfer`, `/reject-transfer`, `/confirm-received` | GatewayFundPage, runtime-fund, coordinator | finance-contributions.openapi.json |
| Ledger/instruction | GET `/funds/{id}/transactions`; GET `/contributions/{id}/vietqr` | fund gateway/decoders | finance-fund / finance-contributions / finance-payments contracts |
| Operation recovery | GET `/operations/{key}`; bounded poll and reconciliation | command-coordinator | Operation schemas in Finance/member lifecycle contracts |
| Notifications | GET `/me/notifications`; PATCH `/me/notifications/{id}/read`; GET/PUT `/me/notification-preferences` | notification.gateway-repository, inbox/preferences | notification.openapi.yaml |
| Price Watch | GET/POST `/trips/{tripId}/price-watches`; PATCH `/price-watches/{id}`; POST same + `/pause`, `/resume`, `/stop`; GET same + `/observations` | runtime-price-watch gateway, RuntimePriceWatchPage/model | price-watch.openapi.yaml |
| Map/Dress/Packing | Plan read projections, no independent Gateway mutations wired | DeferredReadPage / PackingPage | plan.openapi.json; không suy ra CRUD từ Figma |
| Home | Gateway editorial landing local content, không remote recommendation API | HomeRoute/editorial-landing | Không có endpoint recommendation đang wired ở route này |
| Admin/export/public share | Không có current workflow integration | guarded placeholder/deferred UI | Contract Backend khác tồn tại không tự cấp scope |

Backend còn có Finance expenses/refunds/closures/notes/receipts contracts; không đồng nghĩa Frontend đã thực hiện các nghiệp vụ đó. Không thêm controls gọi endpoint chỉ vì nó có trong specification. Không tự đổi `stop` thành DELETE hoặc phân quyền theo label Figma “xóa”.

## 2. Invariants phải giữ

1. HTTP client chỉ gọi same-origin `/api/v1/`, giữ envelope/status/correlation IDs, bytes/204 handling. Không unwrap bằng truthiness làm mất zero/false/null hợp lệ. GET refresh/retry401 có giới hạn; không auto retry mutation gây double-write.
2. Access token ở memory; refresh/CSRF cookie flow, Web Locks và actor invalidation vẫn hoạt động. Logout/actor change phải clear đúng query/operation state; không đưa tokens vào storage tùy tiện, telemetry hoặc docs.
3. Auth register202 là accepted/verification, không authenticated. Recovery neutral response không tiết lộ account existence. Giữ password như contract, không tự trim password. Avatar bytes/multipart khác JSON form thông thường.
4. Mutation idempotency key, expected versions và intent payload là cùng một transaction intent. Retry/recover dùng đúng key/body; không tạo key mới sau response ambiguous. Thay UI không làm serialize dates/money khác.
5. Command states PROCESSING/PENDING_RECOVERY/UNKNOWN/NEEDS_REVIEW/SUCCEEDED/FAILED và bounded polling không được thay bằng optimistic success/toast. `202` không phải đã hoàn tất. Unknown cần recovery, không mời người dùng submit lại vô hạn.
6. Cursors opaque, được encode một lần; không biến thành page number hoặc parse nội dung. Counts là loaded/total theo dữ liệu thật, không suy đoán.
7. Integer-string money/VND phải giữ chính xác (int64), không chuyển qua floating Number để xử lý nghiệp vụ. Format chỉ ở presentation. Fund not-enabled404 hợp lệ phải phân biệt403/503; không biến mọi lỗi thành quỹ0đ.
8. Ngày theo timezone của Trip, date-only khác instant. Preserve overnight activity, unassigned activity, date boundaries và full reorder ID list. Price Watch flight dates/UTC normalization theo model hiện có, không theo timezone browser tự phát.
9. Owner, Member, Plan Editor policy và FundHolder là trách nhiệm độc lập. Admin không tự có quyền Trip/Finance. Hide/disable controls chỉ là UX; server checks vẫn là authority.
10. Invitation token được capture/scrub, safe returnTo nội bộ; expired/revoked/wrong recipient không được bypass bằng UI. Session revocation khác xóa push device.
11. Notifications: unread marker/read receipt không chứng minh email/push delivery. Preferences update có expected_version; không giả bulk mark-read chưa wired.
12. Price Watch hiện provider MOCK_FLIGHT, không có booking/payment. Preserve source/observedAt/fetchedAt và stale data; provider failure không tạo giá0/“rẻ nhất”.

## 3. Test protection và rủi ro redesign

CP03/D21: shared foundations + native required Auth metadata; không sửa serializers/repositories/guards/session/query/command logic. [CP03 verification](CP03_VERIFICATION.md) ghi unit và HTTP-mock payload checks hiện tại. Mock invitation link lấy request origin để giữ đúng same-origin invariant khi đổi cổng test; production decoder không đổi. Đây vẫn không phải live Backend acceptance.

Characterization coverage: HTTP client/session/decode/commands/policy/Plan/Finance/notifications/price-watch unit tests; Gateway suite dùng HTTP mocks; fixture suite xác minh preview behaviors. Chỉ [CP-01](checkpoints/CP-01.md) có số liệu hiện tại. Không dùng historical Demo1 PASS để khẳng định lần này Backend thật đã chạy.

Mỗi checkpoint feature phải thêm/giữ tests cho permission denial, malformed envelope, cursor exhaustion, version conflict, pending/ambiguous mutation, actor change và dữ liệu mất/tải lỗi. UI refactor không sửa API adapter cùng một lượt nếu không bắt buộc; nếu có, cần focused contract tests và payload before/after diff.

Live Backend E2E CP-01 **NOT_RUN**; không chạy legacy `test:e2e:live` trên seeded personal demo. Nếu được thực hiện gate live sau này, ưu tiên isolated `test:e2e:demo1`, kiểm tra ownership/ports/snapshot/data boundaries trước khi chạy. Không gọi production mutations để nghiệm thu redesign.

Chưa có kiểm chứng exhaustive từng schema field/client path bằng automated parity report, real-provider behavior, concurrency dưới tải, email/push delivery hay receipt upload runtime. Các mục này không được gán PASS chỉ từ source audit.
