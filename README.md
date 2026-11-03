# Wolfari Web

Web React/TypeScript/Vite. Bản nghiệm thu localhost ở `feat/demo-1-readiness-web` (nguồn `draft/demo-ui-ux`), ghép với Backend `feat/demo-1-readiness-backend`. Chỉ Web và Backend; không Mobile.

[Hướng dẫn build/chạy demo1](HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md) là runbook chuẩn. Đọc [nghiệm thu hiện hành](docs/demo-readiness-validation.md), [kịch bản demo trực tiếp](docs/HUONG_DAN_DEMO_TRUC_TIEP.md) và [quy trình PR/merge](docs/HUONG_DAN_PR_VA_MERGE_MAIN.md) trước khi trình diễn hoặc đưa lên `main`.

Đợt nghiệm thu mở ngày02/11, chuyển **PHASE_D_DRAFT / NOT_READY_TO_MERGE** ngày03/11 theo yêu cầu người dùng. [Bàn giao D](docs/PHASE_D_HANDOFF.md) ghi trạng thái commit/PR và gate còn thiếu. [Validation cũ](docs/demo-1-web-validation.md), [phụ lục v1.0](docs/demo-1-web-addendum-v1.0.md) và hồ sơ CP giữ nguyên lịch sử; CI/reviewer không được suy từ test local.

Cập nhật03/11: bản trước sửa Finance refresh đạt full fixture208, Gateway127 (dev và built), live dev1 + preview2 và personal restart smoke. Bản cuối đạt lint/typecheck/demo build, **586 unit**, **3 Finance HTTP-mock regressions**. Live mở rộng cuối FAIL tại Delete/reload Plan; test đã chỉnh thứ tự chờ nhưng chưa rerun. Chưa có chuỗi live đầy đủ sau sửa Finance hoặc báo cáo Edge2 lượt/30 phút; giữ Draft đến khi các gate đạt.

## Phạm vi Gateway thật

Auth/verify/reset/logout, Profile/avatar/Sessions; Trip create/list/overview/settings; một timeline Activity server (pool/ngày-only/timed/overnight, reorder/completion); Members/SELECTED_MEMBERS/EMAIL-LINK/leave-remove; quỹ đóng góp thủ công TEST (setup, Holder consent, budget, destination, request, report/reject/confirm, balance/ledger).

Packing/Map/Dress chỉ đọc server. Notification inbox/read/preferences và Price Watch đã có Web Gateway; Price Watch dùng provider `MOCK_FLIGHT`. Finance outbox/inbox mới được nghiệm thu trong stack cô lập; launcher demo cá nhân vẫn giữ mặc định tắt, không mặc định có delivery Finance. DSS/provider thật, Share/Export/Admin CRUD, expense/refund/closure writer trên Web và thanh toán thật chưa thuộc demo. Fixture không thay thế lỗi Backend.

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
corepack pnpm demo:build
corepack pnpm demo:preview
```

Mở <http://localhost:5273/>. Mailpit <http://127.0.0.1:18025/>. Không mặc định có `demo-owner@wolfari.test`. Password mẫu sinh ngẫu nhiên ở Backend `.local/demo/seed.json`, không đưa vào chat/log/commit. Đã đổi password thì dùng Quên mật khẩu/Mailpit.

Bộ TEST mới của đợt này dùng Backend `.local/demo/readiness-20261102.json`, tách khỏi seed journal cũ đang báo `MISSING`. Xem mục tài khoản trong runbook; không reset/reseed để đổi mật khẩu. Trip trình diễn đang chờ report, Trip smoke đã có 500.000 VND và hai ledger để kiểm persistence.

Khi phát triển có thể dùng `demo:dev` thay preview, không chạy đồng thời trên 5273. Backend `demo:stop` giữ volumes, không prune/kill toàn bộ.

## Kiểm thử phân lớp

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --maxWorkers=2
corepack pnpm build
corepack pnpm build:preview
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm test:e2e:gateway
corepack pnpm test:e2e:built
corepack pnpm test:e2e:gateway:built
corepack pnpm test:e2e:demo1 --runtime=dev
corepack pnpm test:e2e:demo1 --runtime=preview
```

| Suite | Bằng chứng |
| --- | --- |
| test | Unit/jsdom |
| test:e2e | Browser fixture, không Backend |
| test:e2e:gateway | Browser HTTP mock, gồm lỗi/202/NEEDS_REVIEW |
| test:e2e:built / test:e2e:gateway:built | Toàn bộ fixture / HTTP mock trên hai bundle riêng; không Backend thật |
| test:e2e:demo1 | Backend thật, Docker infra riêng, UI dev + build/preview; không business SQL seed |
| test:e2e:live | Legacy dùng demo đã seed; không thay gate demo1 |

Snapshot và kết quả: `test-results/demo1/<runId>/`. Đọc SHA kèm tree hash của cả hai repo, không dùng HEAD một mình. Cleanup chỉ tài nguyên test có manifest/label; không reset dữ liệu người dùng.

`dev` ở5173 / `build:preview` là fixture; `demo:*` là Gateway thật. `build` / `build:preview` cùng output dist; demo dùng dist-demo riêng.

Access token giữ memory, refresh cookie HttpOnly. Web Locks phối hợp phiên; broadcast chỉ epoch. Draft/journal theo actor; recipient ngân hàng không persist. 202/timeout chưa xác nhận hoàn tất; retry giữ key/body/version.

**Production phải HTTPS cùng origin SPA + /api/v1.** Local HTTP không phải kiến trúc production. Không deploy Vite preview hoặc bỏ guards Backend. Domain/TLS, Mobile/provider thật và CI sau push chưa nghiệm thu.

Ba DOCX chính thức và audit gốc giữ nguyên. Ngoại lệ Backend đã được duyệt: `rejected_reason` additive qua RPC/REST + contract/test/docs, không migration mới. Các thay đổi Backend rộng hơn là phần công việc Backend đã có trước đợt Web.

Tài liệu: [matrix](docs/gateway-integration-matrix.md), [flow](docs/flow-map.md), [inventory](docs/screen-inventory.md), [states](docs/state-matrix.md), [contracts](docs/screen-contracts.md). Báo cáo phase có ngày là lịch sử.
