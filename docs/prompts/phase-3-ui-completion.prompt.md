# Prompt copy-paste — Phase 3-UI-COMPLETE: Hoàn thiện Web độc lập bằng fixture

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: hoàn thiện trải nghiệm Web độc lập theo Figma bằng fixture deterministic, không chờ Backend, nhưng giữ nguyên domain model, repository interface, permission, revision, idempotency và error contract để sau này thay fixture adapter bằng Gateway adapter mà không viết lại UI.

Phase 3 Trip List đã hoàn thành. Không chuyển sang tích hợp Gateway ở task này.

Đọc trước khi sửa:
1. README.md
2. docs/implementation-baseline.md
3. docs/domain-architecture.md
4. docs/web-implementation-roadmap.md
5. docs/integration-first-architecture.md
6. docs/screen-inventory.md
7. docs/flow-map.md
8. docs/screen-contracts.md
9. docs/state-matrix.md
10. docs/figma-implementation-matrix.md
11. Figma file Wolfari · Travel Workspace và các node đã ghi trong Figma implementation matrix
12. Backend trong ../Wolfari-backend chỉ để đối chiếu capability; tuyệt đối không sửa

Mục tiêu hoàn thiện theo thứ tự, mỗi flow là một work unit và một branch riêng:
- `auth-fixture`: `/`, `/login`, `/register`, `/profile`; Guest/User fixture, form validation và session states, không gọi Identity thật.
- `trip-overview`: `/trips/:tripId`; Member/Owner fixture, metadata, permission, revision, forbidden/not-found/error.
- `plan-preview`: `/trips/:tripId/plan`; Member/Owner/Plan Editor fixture, timeline, activity preview, loading/empty/error/conflict/pending/unknown.
- `members-preview`: `/trips/:tripId/members`; Member/Owner fixture, member projection và invitation preview; không bịa display name/avatar hoặc mutation success.
- Các frame Figma chưa có route Web được chốt: chỉ đưa vào preview/sandbox hoặc documentation mapping; không tự tạo production route.

Git/branch:
- Tạo branch từ `develop` mới nhất sau khi dependency trước đã được commit và merge.
- Dùng tên `ui/auth-fixture`, `ui/trip-overview`, `ui/plan-preview`, `ui/members-preview`.
- Phase 3-UI-COMPLETE chưa cần Issue/PR; không commit trực tiếp `main` hoặc `develop`.
- Nếu flow phụ thuộc code chưa merge, merge dependency trước hoặc ghi rõ stacked branch; không branch từ `develop` thiếu dependency.
- Không tạo branch mới cho mỗi commit, bug nhỏ hoặc chỉnh CSS trong cùng flow.

Luật độc lập với Backend:
- Component chỉ nhận domain view model/props; không gọi fetch, không ghép URL, không đọc raw HTTP envelope.
- Fixture repository và Gateway repository phải cùng implement interface.
- Fixture chỉ mô phỏng read/presentation state; không tuyên bố mutation đã lưu trên server.
- Write action chưa có runtime phải disabled, preview-only hoặc unavailable.
- Không dùng access token thật và không lưu token vào localStorage/sessionStorage.
- Không bịa API, field, permission, route hoặc behavior. Capability chưa có bằng chứng phải ghi `mock-only`, `partial-runtime` hoặc `unavailable`.

Quy trình cho từng flow:
1. Đọc git status, branch hiện tại và kiểm tra thay đổi chưa rõ nguồn gốc.
2. Xác định Figma frame/node, route hiện có, actor, screen contract, view model, repository interface và fixture scenario.
3. Liệt kê file dự kiến sửa trước khi sửa.
4. Đối chiếu desktop 1440px, short laptop 1366×600/520, tablet 1024/820/768 và mobile 402/320.
5. Implement vertical slice: route → view model → repository interface → fixture → success → loading/empty/error/forbidden/not-found/conflict/pending/unknown/unavailable → responsive → tests.
6. Chỉ tạo route nếu route đã có trong screen contract; frame `not-yet-routed` phải giữ ở preview/documentation.
7. Cập nhật screen contract, flow map, state matrix hoặc Figma matrix nếu implementation làm rõ behavior mới.
8. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` và E2E/browser nếu có.
9. Kiểm tra `git diff` và `git status`; không sửa Backend/Mobile.

Responsive bắt buộc:
- Desktop workspace giữ trong viewport; chỉ main/nav/timeline/list có boundary cuộn được chỉ định.
- Short laptop giảm spacing/kích thước component con; không dùng `overflow: hidden` để che nội dung.
- Public/auth/form dùng document flow tự nhiên và được cuộn khi chiều cao thấp.
- Mobile trip dùng drawer/sidebar ẩn hiện từ góc trái, logo ở giữa, avatar/user icon ở góc phải, tiêu đề trong content; không dùng bottom tab kiểu native app.
- Nội dung nhỏ như timeline/list có thể cuộn trong component khi Figma/screen contract yêu cầu; không biến toàn bộ Web thành app canvas.

Definition of Done:
- Flow chạy độc lập bằng fixture deterministic.
- UI đối chiếu được với Figma ở desktop, short laptop, tablet và mobile.
- Có loading/empty/error/permission/conflict/pending/unknown state phù hợp.
- Không có transport logic trong component và không có API giả trong production path.
- Read-only preview không báo saved giả; write chưa có Backend hiển thị unavailable/preview-only/disabled.
- Lint, typecheck, test và build đạt hoặc blocker đã được ghi rõ.

Báo cáo cuối cùng gồm:
- Summary và flow đã hoàn thiện.
- Files changed.
- Figma frame/node → route → actor → component mapping.
- Domain view model → repository interface → fixture mapping.
- State coverage và responsive/scroll boundary.
- Commands run và kết quả.
- Branch/base branch/git status.
- Backend capability gaps và việc cần làm khi mở Phase 4+.
```
