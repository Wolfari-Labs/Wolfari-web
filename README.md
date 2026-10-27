# Wolfari Web

Ứng dụng React/TypeScript/Vite cho Wolfari. Web đã kết nối Gateway cho Auth, Profile, Sessions, Trip, Members read/policy, Invitations và Activity. Finance, Notification và Price Watch có Backend API nhưng Web chưa tích hợp; Travel/Export và một số phần lập kế hoạch còn chưa hoàn thiện.

## Chạy demo với backend thật

Yêu cầu Node.js 24, Corepack/pnpm 10.34.5, Docker Desktop và hai repository `Wolfari-backend`, `Wolfari-web` nằm cạnh nhau. Chạy lệnh trong đúng repository.

Terminal Backend:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:init
corepack pnpm demo:start
```

Terminal Backend thứ hai, chờ build/start hoàn tất:

```powershell
corepack pnpm demo:check
corepack pnpm demo:seed
```

Terminal Web:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:dev
```

Mở **http://localhost:5273/login?returnTo=%2Ftrips**. Tài khoản `demo-owner@wolfari.test`, `demo-holder@wolfari.test`, `demo-member@wolfari.test`, `demo-outsider@wolfari.test` có mật khẩu sinh ngẫu nhiên trong `Wolfari-backend/.local/demo/seed.json`. Đọc file cục bộ để đăng nhập; không commit hoặc chia sẻ file này. Mailpit: http://127.0.0.1:18025.

Để trình diễn bản build, dừng terminal Web dev bằng Ctrl+C rồi chạy:

```powershell
corepack pnpm demo:build
corepack pnpm demo:preview
```

Cả hai chế độ dùng Gateway thật ở cổng 13000 và bắt buộc `VITE_DATA_MODE=gateway`. Bản build nằm trong `dist-demo/`, không chứa tài khoản fixture. Preview phục vụ local, không phải server production. `demo:stop` trong Backend dừng cả Web demo, Backend demo và hạ tầng; giữ nguyên volumes.

[Runbook chuẩn: topology, cổng, dữ liệu, reset và troubleshooting](../Wolfari-backend/docs/architecture/local-demo.md). [Báo cáo nghiệm thu](../Wolfari-backend/docs/architecture/local-demo-acceptance.md).

## Kiểm thử

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm test:e2e:gateway
corepack pnpm test:e2e:live
```

| Lệnh | Bằng chứng |
| --- | --- |
| `test:e2e` | Giao diện fixture, không gọi Backend thật |
| `test:e2e:gateway` | Adapter Web và HTTP API bị mock; không phải tích hợp Backend |
| `test:e2e:live` | Backend demo thật, Mailpit và browser; chạy tuần tự dev và bản build |

Suite live cần Backend đã start/seed và cổng Web 5273 còn trống. Nó tạo dữ liệu có nhãn riêng, không xóa dữ liệu trình diễn. Báo cáo ở `test-results/live-dev/results.json` và `test-results/live-preview/results.json`. Không bật trace/HAR/video vì chúng có thể chứa mật khẩu, cookie và token.

## Fixture preview và giới hạn

`corepack pnpm dev` tại http://127.0.0.1:5173 mặc định dùng fixture; `build:preview` tạo bản UI minh họa. Tài khoản fixture công khai chỉ hoạt động trong các chế độ này, không xác thực với Backend. `build` thông thường dùng Gateway và không chứa fixture catalog.

Các phần Packing, Dress Code, Map và lập lịch bằng bản nháp trên thiết bị không được xem là dữ liệu chia sẻ đã lưu Backend. Plan có một panel riêng thao tác Activity trên server. Members hỗ trợ đọc danh sách, chính sách cơ bản và lời mời; nút rời/xóa thành viên chưa nối Backend. Chính sách `SELECTED_MEMBERS` chỉ đọc. Không tự thay dữ liệu lỗi bằng fixture.

Session giữ access token/session ID trong bộ nhớ, refresh token trong HttpOnly cookie. Logout gọi API thu hồi session family, lấy CSRF mới và xóa cache riêng tư sau thành công. Login/refresh cần Backend trả `session_id`; không suy ra ID từ JWT `sid`.

Tài liệu kỹ thuật: [ma trận tích hợp](docs/gateway-integration-matrix.md), [baseline](docs/implementation-baseline.md), [kiến trúc miền](docs/domain-architecture.md), [screen contracts](docs/screen-contracts.md). Các tài liệu phase/fixture cũ giữ giá trị lịch sử; không dùng chúng để kết luận runtime hiện tại.
