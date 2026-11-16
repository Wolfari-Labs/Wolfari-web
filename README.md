# Wolfari Web

[Mục lục tài liệu](docs/README.md) · [Hồ sơ redesign](docs/ui-redesign/README.md) · [Tài liệu lịch sử](docs/archive/README.md)

Frontend React/TypeScript/Vite cho Wolfari. Web dùng repository Gateway cho dữ liệu Backend và repository fixture riêng để phát triển/kiểm thử giao diện.

## Chạy local

Yêu cầu Node.js 24.x, Corepack và pnpm được pin trong `package.json`. Đặt hai checkout `Wolfari-web` và `Wolfari-backend` cạnh nhau.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

`dev` mặc định ở cổng 5173 dùng fixture. Để chạy Web với Backend thật, làm theo [runbook demo](HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md): Docker Desktop Linux engine chạy hạ tầng, Backend chạy native Node.

```powershell
# Tại Backend
corepack pnpm demo:init
corepack pnpm demo:start
# Terminal Backend khác
corepack pnpm demo:check
corepack pnpm demo:accounts
# Tại Web
corepack pnpm demo:build
corepack pnpm demo:preview
```

Web demo: <http://localhost:5273/>; Mailpit: <http://127.0.0.1:18025/>. `demo:dev` là lựa chọn development cùng cổng 5273. Credentials nằm trong journal ignored của Backend; dùng `demo:accounts` để kiểm tra trạng thái, không suy tài khoản còn tồn tại từ báo cáo cũ. Seed chỉ dùng khi tạo bộ mẫu có chủ đích. `demo:stop` tại Backend giữ volume.

## Runtime và contract

Các module Gateway gồm Identity/Profile/Sessions, Trip/Plan/Members/Invitations, quỹ đóng góp TEST, Notification và Price Watch. Map/Places và provider giá có adapter riêng; khả năng chạy phụ thuộc cấu hình Backend/provider, không suy từ fixture hoặc việc đã build thành công.

- [Gateway matrix](docs/gateway-integration-matrix.md), [screen contracts](docs/screen-contracts.md), [flow](docs/flow-map.md).
- [REST inventory Backend](../Wolfari-backend/docs/api/runtime-inventory.json), [Places](../Wolfari-backend/docs/api/places.openapi.json), [Price Watch](../Wolfari-backend/docs/api/price-watch.openapi.yaml).
- [Profile single-host trial](deployment/README.md): `build:deploy` tạo bundle Gateway trong `dist-deploy`. Nghiệm thu deployment và provider thật là các bước riêng.

Access token giữ trong memory, refresh cookie HttpOnly. Session/CSRF, quyền Backend, actor-scoped draft, idempotency và versions phải được giữ khi refactor. Timeout/202 chưa có nghĩa mutation đã hoàn tất. Fixture không thay thế lỗi Backend.

## Kiểm tra

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --maxWorkers=2
corepack pnpm build
corepack pnpm build:preview
corepack pnpm test:e2e
corepack pnpm test:e2e:gateway
corepack pnpm test:e2e:built
corepack pnpm test:e2e:gateway:built
corepack pnpm test:e2e:demo1 --runtime=dev
corepack pnpm test:e2e:demo1 --runtime=preview
```

| Suite                                        | Phạm vi                                                             |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `test`                                       | Unit/component/jsdom                                                |
| `test:e2e`, `test:e2e:built`                 | Browser fixture, dev/bundle                                         |
| `test:e2e:gateway`, `test:e2e:gateway:built` | Browser Gateway với HTTP mock, dev/bundle                           |
| `test:e2e:demo1`                             | Cặp Web–Backend hiện tại, Docker project cô lập, account tạo qua UI |
| `test:e2e:live`                              | Legacy dùng demo đã seed; đọc runbook trước khi chạy                |

Playwright cần Chromium đã cài. `build`/`build:preview` cùng output `dist`; demo và harness dùng output riêng. Log/report sinh ra dưới `test-results` và `playwright-report` không phải source.

## Tài liệu và lịch sử

[Danh mục tài liệu](docs/README.md) phân biệt hướng dẫn hiện hành, thiết kế và báo cáo theo snapshot. CP01–CP11 và các quyết định/ngoại lệ đã ghi vẫn là lịch sử được bảo toàn; cleanup không mở checkpoint hoặc phê duyệt thay đổi UI.

Các số test, nhánh, tài khoản demo và trạng thái PR trong [readiness tháng 11](docs/demo-readiness-validation.md), [bàn giao D](docs/PHASE_D_HANDOFF.md) và [validation Demo 1](docs/demo-1-web-validation.md) chỉ áp dụng cho mốc ghi nhận. Kết quả mới cần gắn với source của cả hai repo; local PASS không thay CI, provider thật hoặc production acceptance.
