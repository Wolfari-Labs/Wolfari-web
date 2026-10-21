# Prompt copy-paste — Phase 3: Trip List bằng fixture

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: triển khai một flow UI hoàn chỉnh theo Figma bằng fixture deterministic, sẵn sàng thay adapter sau này nhưng chưa gọi Backend.

Đọc README, implementation-baseline, domain-architecture, web-roadmap, integration-first-architecture, screen-inventory, flow-map, screen-contracts, state-matrix và figma-implementation-matrix.

Task:
- Phase: 3
- Flow: Trip List — danh sách chuyến đi của người dùng
- Figma frame/node: Desktop `03 · Chuyến đi của tôi` (`3:29`); Mobile `M05 · Chuyến đi của tôi` (`317:2029`); shared header `135:483`; trip sidebar reference `135:1357`
- Route: `/trips`
- Actor: Authenticated User; chỉ hiển thị các trip mà projection/fixture cho phép viewer đọc
- Data mode: fixture
- Screen contract: `Contract: Trip List` trong `docs/screen-contracts.md`

Git/branch bắt buộc:
- Phase 3 là một work unit độc lập theo từng flow. Tạo branch mới từ `develop` mới nhất sau khi Phase 2 đã được commit và merge, ví dụ `ui/trip-list`, `ui/trip-overview` hoặc `ui/plan-preview`.
- Không tạo một branch chung cho toàn bộ Phase 3 nếu các flow có thể triển khai độc lập.
- Nếu Phase 2 chưa merge nhưng flow này bắt buộc dùng code của Phase 2, không branch từ `develop` cũ; phải merge Phase 2 trước hoặc dùng stacked branch từ branch Phase 2 và ghi rõ dependency trong báo cáo.
- Phase 3 chưa cần Issue/PR theo quy ước hiện tại, nhưng không commit trực tiếp vào `main` hoặc `develop`.
- Nếu chỉ sửa tiếp cùng flow đang làm dở, tiếp tục branch hiện tại; không tạo branch mới cho từng commit, bug nhỏ hoặc chỉnh CSS.

Điều kiện trước khi triển khai:
1. Phase 0 đã có screen contract, flow map, state matrix và Figma mapping cho Trip List.
2. Phase 1 đã có App Shell responsive; Phase 2 đã có token, typography, spacing, icon và shared component cần thiết hoặc đã ghi rõ phần còn thiếu.
3. Route và behavior của flow có bằng chứng từ tài liệu/Figma/code hiện tại. Nếu thiếu bằng chứng, dừng và báo blocker thay vì tự bịa.

Trước khi code:
1. Đọc các tài liệu bắt buộc và kiểm tra `git status`, branch hiện tại; liệt kê file dự kiến sửa trước khi sửa.
2. Xác nhận branch đúng dạng `ui/<flow>` và được tạo từ `develop` đúng dependency; không Issue/PR ở Phase 3.
3. Kiểm tra route `/trips`, actor `User`, permission đọc danh sách, view model `TripListViewModel`, repository interface `TripRepository.listTrips` và acceptance criteria của `Contract: Trip List`.
4. Đối chiếu Figma prototype, variants, desktop/short laptop/tablet/mobile và scroll boundary.
5. Đối chiếu Backend chỉ để ghi capability gap; không bịa API, field, permission hoặc behavior.

Implement theo vertical slice:
route → domain/view model → repository interface → deterministic fixture → success → loading/empty/error/forbidden/conflict/pending/unknown/unavailable → responsive → tests.

Component không gọi fetch, không biết fixture và không đọc HTTP envelope. Không báo mutation đã lưu nếu chưa có server. Write action chưa có runtime phải disabled, preview-only hoặc unavailable. Giữ version/revision/permission/idempotency fields trong model nếu contract yêu cầu.

Responsive và interaction bắt buộc:
- Desktop: App Shell cố định trong viewport; chỉ component có nội dung dài mới được cuộn nội bộ theo đúng Figma.
- Short laptop: giảm spacing/kích thước component con theo breakpoint; không dùng `overflow: hidden` để che nội dung.
- Tablet: chuyển layout theo contract, bảo đảm nội dung và thao tác chính vẫn truy cập được.
- Mobile: sidebar thành drawer/slider ẩn hiện từ góc trái; logo ở giữa header; avatar/user icon ở góc phải; tiêu đề nằm trong content, không dùng bottom tab nếu Figma không yêu cầu.
- Login/register và các màn hình có form phải cho phép cuộn trang khi chiều cao nhỏ; không làm mất nội dung bằng `overflow: hidden`.

Chạy các kiểm tra có sẵn: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` và E2E/browser nếu có. Cập nhật tài liệu liên quan khi route, state, responsive behavior hoặc fixture contract thay đổi. Kiểm tra lại `git diff` và `git status`.

Báo cáo cuối cùng phải có:
- Summary và phạm vi flow đã triển khai.
- Files changed.
- Figma mapping và responsive/scroll mapping.
- Domain model, repository interface và fixture mapping.
- Loading/empty/error/permission/conflict/pending state đã xử lý.
- Commands run và kết quả lint/typecheck/test/build.
- Git branch, base branch và git status.
- Remaining gaps/blockers, đặc biệt capability gap chờ Gateway/Backend.
```
