# Wolfari Web

Web React/TypeScript/Vite. Demo1 trên nhánh `feat/demo-1-web`, chưa commit/push.

[Hướng dẫn build/chạy demo1](HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md) là runbook chuẩn; [validation](docs/demo-1-web-validation.md) ghi bằng chứng và giới hạn; [phụ lục v1.0](docs/demo-1-web-addendum-v1.0.md) truy vết 49 tác vụ SRS/ERD/API/Mobile.

Trạng thái bàn giao 29/10/2026: luồng core + quỹ TEST đã PASS trên Backend thật ở dev và build/preview (500.000 VND, 2 ledger IN, Fund OPEN). Native browser zoom 200%, production HTTPS/domain, Mobile, provider thật và CI sau push vẫn **NOT RUN**; xem validation trước khi kết luận readiness.

## Phạm vi Gateway thật

Auth/verify/reset/logout, Profile/avatar/Sessions; Trip create/list/overview/settings; một timeline Activity server (pool/ngày-only/timed/overnight, reorder/completion); Members/SELECTED_MEMBERS/EMAIL-LINK/leave-remove; quỹ đóng góp thủ công TEST (setup, Holder consent, budget, destination, request, report/reject/confirm, balance/ledger).

Packing/Map/Dress chỉ đọc server. Notification/Price Watch Web, DSS/provider, Share/Export/Admin, expense/refund/closure writer và thanh toán thật ở giai đoạn sau. Fixture không thay thế lỗi Backend.

## Khởi động

Node24, Corepack/pnpm10.34.5, Docker Desktop Linux engine; Backend/Web đặt cạnh nhau.

Terminal Backend:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:init
corepack pnpm demo:start
```

Terminal Backend khác: `corepack pnpm demo:check`, `corepack pnpm demo:accounts`. Seed chỉ khi tạo bộ mẫu lần đầu; không reset/reseed để tìm password.

Terminal Web:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:dev
```

Mở <http://localhost:5273/>. Mailpit <http://127.0.0.1:18025/>. Không mặc định có `demo-owner@wolfari.test`. Password mẫu sinh ngẫu nhiên ở Backend `.local/demo/seed.json`, không đưa vào chat/log/commit. Đã đổi password thì dùng Quên mật khẩu/Mailpit.

Dừng Web dev rồi `corepack pnpm demo:build`, `corepack pnpm demo:preview` để chạy bundle. Backend `demo:stop` giữ volumes, không prune/kill toàn bộ.

## Kiểm thử phân lớp

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm build:preview
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm test:e2e:gateway
corepack pnpm test:e2e:demo1
```

| Suite | Bằng chứng |
| --- | --- |
| test | Unit/jsdom |
| test:e2e | Browser fixture, không Backend |
| test:e2e:gateway | Browser HTTP mock, gồm lỗi/202/NEEDS_REVIEW |
| test:e2e:demo1 | Backend thật, Docker infra riêng, UI dev + build/preview; không business SQL seed |
| test:e2e:live | Legacy dùng demo đã seed; không thay gate demo1 |

Snapshot và kết quả: `test-results/demo1/<runId>/`. Đọc SHA kèm tree hash của cả hai repo, không dùng HEAD một mình. Cleanup chỉ tài nguyên test có manifest/label; không reset dữ liệu người dùng.

`dev` ở5173 / `build:preview` là fixture; `demo:*` là Gateway thật. `build` / `build:preview` cùng output dist; demo dùng dist-demo riêng.

Access token giữ memory, refresh cookie HttpOnly. Web Locks phối hợp phiên; broadcast chỉ epoch. Draft/journal theo actor; recipient ngân hàng không persist. 202/timeout chưa xác nhận hoàn tất; retry giữ key/body/version.

**Production phải HTTPS cùng origin SPA + /api/v1.** Local HTTP không phải kiến trúc production. Không deploy Vite preview hoặc bỏ guards Backend. Domain/TLS, Mobile/provider thật và CI sau push chưa nghiệm thu.

Ba DOCX chính thức và audit gốc giữ nguyên. Ngoại lệ Backend đã được duyệt: `rejected_reason` additive qua RPC/REST + contract/test/docs, không migration mới. Các thay đổi Backend rộng hơn là phần công việc Backend đã có trước đợt Web.

Tài liệu: [matrix](docs/gateway-integration-matrix.md), [flow](docs/flow-map.md), [inventory](docs/screen-inventory.md), [states](docs/state-matrix.md), [contracts](docs/screen-contracts.md). Báo cáo phase có ngày là lịch sử.
