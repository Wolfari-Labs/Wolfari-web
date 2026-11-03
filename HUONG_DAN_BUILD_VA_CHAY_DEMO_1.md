# Hướng dẫn build và chạy Wolfari demo 1 local

Ngày cập nhật: **03/11/2026**. Runbook cho **localhost trên Windows**, Web `feat/demo-1-readiness-web` (nguồn `draft/demo-ui-ux`) và Backend `feat/demo-1-readiness-backend` (nguồn `feat/demo-1-backend` + `origin/main`). Chỉ hai repo này; không Mobile/LAN/production.

Trạng thái lệnh và readiness hiện hành: [báo cáo nghiệm thu](docs/demo-readiness-validation.md). Phần chưa chạy vẫn **DRAFT/NOT_VERIFIED**, không suy PASS từ tài liệu. [Kịch bản trình bày](docs/HUONG_DAN_DEMO_TRUC_TIEP.md), [quy trình PR/merge](docs/HUONG_DAN_PR_VA_MERGE_MAIN.md). [Validation tháng 10](docs/demo-1-web-validation.md) và [phụ lục cũ](docs/demo-1-web-addendum-v1.0.md) là lịch sử, không thay kiểm chứng cặp phiên bản mới. Không dùng riêng HEAD khi working tree còn thay đổi.

Ngày03/11 người dùng yêu cầu chuyển sang [giai đoạn D](docs/PHASE_D_HANDOFF.md). Các lệnh launcher đã được kiểm chứng; bundle demo đã build lại sau sửa Finance. Live mở rộng cuối FAIL và chưa đủ chuỗi dev1/preview2 trên bản cuối, nên đây chưa là xác nhận `READY_FOR_LOCAL_DEMO` hoặc cho phép merge.

Đã kiểm chứng trên máy này: `demo:init/start/check/accounts`, `demo:build/preview`, `demo:stop` và khởi động lại, Chromium login → Trip → Plan → Fund → reload; dữ liệu giữ nguyên. Edge hai lượt +30 phút còn chờ người dùng, không suy từ smoke automation. `demo:accounts` hiện kiểm journal seed cũ và báoMISSING; bộ TEST mới dùng journal riêng như mục4.

## 1. Điều kiện và kiến trúc

- Windows/PowerShell, Node.js 24.x, Corepack và pnpm 10.34.5; Docker Desktop Linux engine.
- Hai folder `Wolfari-backend` và `Wolfari-web` nằm cạnh nhau. Không đổi tên thư mục khi dùng launcher hiện tại.
- Docker chạy PostgreSQL, RabbitMQ, MinIO private, Mailpit. Gateway và các service Backend chạy Node native; Web dùng Vite. Chưa có Docker image ứng dụng hoặc production deployment.
- Browser → Web proxy `/api/v1` → Gateway → service qua HTTP/gRPC. Mỗi service sở hữu database riêng; Web/Gateway không kết nối SQL thay service.
- Dùng Chromium/Edge hỗ trợ Web Locks và BroadcastChannel; truy cập Web bằng `localhost` để giữ đúng cookie/origin. Không đổi sang `127.0.0.1` tùy tiện.
- Không đặt password, service secret hoặc token vào biến `VITE_*`.

Kiểm công cụ trong PowerShell:

```powershell
node --version
corepack pnpm --version
docker version
```

Máy kiểm tra này dùng `corepack pnpm`; không giả định có lệnh `pnpm.cmd` trong PATH.

## 2. Cài mới hoặc nâng bản cũ

Tại `Wolfari-backend`, terminal thứ nhất:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:init
corepack pnpm demo:start
```

Giữ terminal mở. Launcher kiểm cổng/ownership, bật hạ tầng, áp dụng forward migrations rồi build/start service. Backend mới cần Trip V003 cho `scheduled_date`. Không dùng lệnh migration development để sửa nhầm DB demo.

Với dữ liệu demo đã có: dừng đúng launcher bằng `demo:stop` trước khi nâng cấp; kiểm kê và backup database/volume cùng cấu hình trước migration, ghi SHA hai repo; chạy lại `demo:init` rồi `demo:start`. Backup `.local/demo` chỉ bảo vệ config/journal, **không phải database backup**. Giữ volume và secrets; **không reset hoặc seed lại chỉ để lấy password**. Nếu chưa có cách phục hồi backup đã xác minh, chưa nâng database có dữ liệu quan trọng. Harness kiểm đường nâng cấp bằng database test riêng, không sửa dữ liệu cá nhân để vượt migration.

Tại terminal Backend thứ hai:

```powershell
corepack pnpm demo:check
corepack pnpm demo:accounts
```

Chỉ khi muốn khởi tạo bộ mẫu lần đầu và chưa có journal, chạy `corepack pnpm demo:seed`. Có thể đăng ký tài khoản mới qua UI/Mailpit thay vì dùng mẫu. `health/ready` chỉ kiểm core Identity/Trip; `health/dependencies` kiểm thêm Finance/Automation, không chứng minh giao dịch quỹ hoạt động.

## 3. Chạy Web dev hoặc bản build

Tại `Wolfari-web`:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:dev
```

Mở <http://localhost:5273/>. Để chạy bundle đã build, Ctrl+C terminal Web dev rồi:

```powershell
corepack pnpm demo:build
corepack pnpm demo:preview
```

Không chạy dev và preview đồng thời trên 5273. `dist-demo/` là bản Gateway; `vite preview` chỉ phục vụ local, không phải web server production. Manifest public được đọc từ Backend; không nạp secrets Backend vào bundle.

`corepack pnpm dev` thông thường và `build:preview` phục vụ **fixture UI**, không dùng để chứng minh tích hợp Backend. `build` tạo Gateway bundle ở `dist/`; `build:preview` cũng ghi `dist/`, nên chạy lệnh sau sẽ thay build trước. Dùng `demo:build` cho bản demo riêng.

## 4. Cổng và tài khoản

| Thành phần | Local demo |
| --- | --- |
| Web | localhost:5273 |
| Gateway | 127.0.0.1:13000 |
| Identity HTTP/gRPC | 13101 / 13201 |
| Trip HTTP/gRPC | 13102 / 13202 |
| Finance HTTP/gRPC | 13104 / 13204 |
| Automation HTTP/gRPC | 13105 / 13205 |
| PostgreSQL | 15432 |
| RabbitMQ AMQP/UI | 25672 / 25673 |
| MinIO API/UI | 19000 / 19001 |
| Mailpit SMTP/UI | 11025 / 18025 |

`corepack pnpm demo:accounts` kiểm tra email/trạng thái tài khoản từ journal bằng READ ONLY, **không in password, không tạo session**. Không giả định luôn có `demo-owner@wolfari.test`. Password seed sinh ngẫu nhiên nằm trong `Wolfari-backend/.local/demo/seed.json`; chỉ đọc cục bộ, không dán vào log/issue/chat. Password trong journal có thể cũ sau khi đổi ở UI: dùng Quên mật khẩu và Mailpit <http://127.0.0.1:18025/>. Seed không tự reset tài khoản đã tồn tại. Nếu journal còn nhưng database/volume đã mất và accounts báo `MISSING`, giữ journal/backup, không giả định password reset sẽ tạo lại account; tạo bộ TEST mới bằng UI với email khác.

Bộ nghiệm thu tạo ngày03/11/2026: năm vai trò `owner`, `holder`, `editor`, `member`, `outsider` ở **`.local/demo/readiness-20261102.json` trong Backend**. Mở file riêng tư bằng trình soạn thảo cục bộ, không dùng lệnh in toàn file vào terminal đang ghi log/chia sẻ màn hình. Lấy `accounts.<role>.email/password`; đây là credentials TEST cục bộ, không được commit. Tên file giữ ngày mở đợt nghiệm thu, không là ngày tạo database. `demo:accounts` không đọc journal riêng này, nênMISSING của seed cũ không nói bộ mới bị mất. Cách kiểm bộ mới là đăng nhập và mở Trip theo kịch bản.

Trip `TEST — Readiness smoke 500000` đã xác nhận đủ500000 và hai ledger; chỉ dùng đọc/persistence. Trip `DEMO TEST — sẵn sàng report và confirm` giữ khoản200000/300000 chưa report để diễn tập. Lượt diễn tập thứ hai tạo Trip/đợt thu TEST riêng qua UI; không reset hoặc confirm lại khoản đã xử lý. Nếu ngày trình bày khác ngày chuẩn bị, tạo Trip có ngày phù hợp trước buổi demo.

Token verify/reset/invite được loại khỏi URL sau khi đọc, không lưu để tiện reload. Khi cần mở lại, lấy link từ thư gốc. Mailpit không phải dịch vụ gửi thư production và hộp thư có thể mất khi restart hạ tầng; dùng resend nếu cần.

## 5. Kiểm tra build và phạm vi bằng chứng

Tại Web:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --maxWorkers=2
corepack pnpm build
corepack pnpm build:preview
corepack pnpm exec playwright install chromium
```

Các suite sẵn có: `test:e2e` là fixture; `test:e2e:gateway` dùng HTTP mock; `test:e2e:live` dùng Backend demo đã start/seed, cần cổng 5273 trống và có ghi dữ liệu test. Không chạy suite live lên instance đang dùng để trình diễn mà không hiểu tác động. Suite live cũ chưa bao phủ các yêu cầu mới của demo1.

Để kiểm thử tích hợp an toàn, ưu tiên bộ mới do Web quản lý:

```powershell
corepack pnpm test:e2e
corepack pnpm test:e2e:gateway
corepack pnpm test:e2e:built
corepack pnpm test:e2e:gateway:built
corepack pnpm test:e2e:demo1 --runtime=dev
corepack pnpm test:e2e:demo1 --runtime=preview
corepack pnpm test:e2e:demo1 --runtime=preview
```

`test:e2e:demo1` tự build Backend/Web, cấp ports ngẫu nhiên, Compose project/volumes riêng, áp dụng migrations của từng service, tạo năm tài khoản và dữ liệu nghiệp vụ qua UI rồi chạy Chromium trên **dev và build/preview**. Không cần `demo:start` hoặc `demo:seed`, không reset dữ liệu đang trình diễn. Dùng Docker cùng Node native, không container hóa ứng dụng.

- Snapshot/manifest/kết quả: `test-results/demo1/<runId>/`; `dev/results.json`, `preview/results.json` và business-proof. Đọc exit code cùng báo cáo, không chỉ health.
- `snapshot.json` và `final-source.json` có SHA/branch/full working tree và implementation hash; harness từ chối PASS nếu code đổi giữa dev và preview. Docs cập nhật sau lượt test không đổi implementation hash.
- Secrets test trong `.local/demo1/<runId>/` đã ignored; không commit hoặc chia sẻ thư mục này.
- Cleanup chỉ dừng PID con và tài nguyên có project/label đúng run ID. Mặc định xóa volumes **của lần test**; dữ liệu test này không được giữ để trình diễn. `corepack pnpm test:e2e:demo1 --keep` giữ volumes test, vẫn dừng container/app; không áp dụng cho dữ liệu demo cá nhân.
- Không chạy hai bộ Playwright vào cùng output directory. Fixture và HTTP mock đã tách `test-results/fixture` / `test-results/gateway`.
- `test:e2e:built` tự build fixture vào `test-results/build/fixture`; `test:e2e:gateway:built` tự build Gateway vào `test-results/build/gateway`. Reports tương ứng `fixture-preview` / `gateway-preview`; không dùng `build:preview` fixture để tuyên bố Backend PASS. Các lệnh này cũng được cấu hình thành job CI riêng; chưa có CI hiện hành trước push.
- Sau sửa implementation cuối: cần dev1 và preview2 liên tiếp không retry trên cùng implementation hai repo. Business proof chỉ được ghi sau toàn bộ scenario thành công; vẫn phải đọc exit code, Playwright results và final source consistency. Không cộng các phần PASS của nhiều run thất bại thành một full PASS.
- Bộ `test:e2e:live` cũ không thay gate demo1: bốn bài Auth/Invitations/Trip-Plan/Members dùng seed và ghi thêm dữ liệu vào instance demo; không có quỹ/fault/restart cô lập. Selector đã cập nhật nhưng lượt bàn giao này không chạy lên dữ liệu cá nhân; không lấy kết quả lịch sử làm bằng chứng hiện hành.

Không bật trace/HAR/video cho luồng có token/password. Không chuyển tiền thật, không tự tải QR có dữ liệu ngân hàng ra provider ngoài.

Trên máy ít RAM, chạy các suite **lần lượt**, không chạy Backend unit cùng browser/hạ tầng. Unit tối đa2 worker, live1; không tăng heap hoặc dừng ứng dụng khác tự động. Launcher tắt DOM failure snapshot; Playwright vẫn có thể ghi source excerpt trong `error-context.md`. Redactor không thay review an toàn trước chia sẻ artifact. Raw logs, signed URLs và `.local` không đưa vào Git.

## 6. Dừng, chạy lại và xử lý lỗi

Trong Backend, `corepack pnpm demo:stop` dừng đúng Web demo/Backend/hạ tầng và giữ volumes. Khởi động lại bằng `demo:start`, rồi `demo:dev` hoặc `demo:preview`. Không kill toàn bộ Node/Docker theo tên hoặc cổng.

- Port bận: kiểm tra launcher đang chạy; không dừng tiến trình không thuộc demo.
- Manifest thiếu/sai: kiểm layout hai repo và chạy `demo:init` đúng Backend.
- 401/CSRF: giữ hostname/origin đúng, đăng nhập lại; không đưa refresh/access token vào storage.
- 409: tải dữ liệu mới và đối chiếu draft; không tự overwrite.
- Timeout/503/202: chưa chắc request chưa commit; giữ nguyên key/body, không tạo lệnh mới để thử vận may.
- `NEEDS_REVIEW`: giữ operation ID, phục hồi dependency rồi theo runbook operator Backend; không sửa ledger/receipt/guard bằng SQL.
- Finance unavailable: không diễn giải là số dư 0 hoặc chưa có quỹ.
- Finance notification không xuất hiện: kiểm đúng môi trường/actor/preferences. Hai flag `FINANCE_OUTBOX_ENABLED` và `AUTOMATION_FINANCE_NOTIFICATION_ENABLED` mặc định tắt trong demo cá nhân. Isolated acceptance bật chúng cho request/Holder review; không tự bật shared/development broker. Bật trên dataset trình diễn cần review bindings/consumer và nghiệm thu riêng theo [runbook inbox](../Wolfari-backend/docs/architecture/finance-notification-inbox.md).
- Không lưu được sessionStorage: không gửi mutation mới cần nhật ký phục hồi. Bật quyền lưu trữ cho origin, không xóa journal đang pending để vượt chặn.
- Journal hỏng/quá lớn hoặc sai actor/scope: chặn ghi và giữ dữ liệu để đối soát. Policy cũng giữ key/body/revision qua reload. Không xóa journal rồi tạo request mới khi kết quả chưa biết.
- Rời Trip thành công: trang Members vẫn cho kiểm tra operation của chính actor; mất quyền đọc Trip không có nghĩa leave thất bại.
- Policy OWNER_ONLY/ALL_MEMBERS: saved Editor assignments vẫn được giữ nhưng không cấp quyền theo danh sách; SELECTED_MEMBERS mới kích hoạt chúng. Rejoin không phục hồi assignment membership cũ.

Reset demo xóa dữ liệu, không phải thao tác sửa lỗi thông thường. Hướng dẫn này không chạy/reset tự động; chỉ cân nhắc sau khi sao lưu và chủ động chấp nhận mất bộ demo theo runbook Backend.

## 7. Kịch bản trình diễn ngắn

1. Đăng ký/verify năm account A Owner, B Holder, C Editor, D Member và X outsider (các browser context riêng). Mở lại link từ Mailpit nếu đã reload trang token.
2. A tạo Trip với tên/mô tả/ngày/timezone, mời B qua EMAIL, C/D qua LINK; Owner chọn SELECTED_MEMBERS và cấp C. B là Holder không có quyền sửa lịch chỉ vì vai trò giữ quỹ.
3. C thêm activity chỉ có ngày, sửa sang cặp giờ hoặc qua đêm; thêm item chưa có ngày, reorder/completion. A reload thấy cùng dữ liệu. X không đọc được Trip.
4. A bật quỹ VND TEST, chọn B, ngân sách/đích nhận; B xác nhận đúng phiên bản đích. A tạo khoản C=200000, D=300000.
5. C báo chuyển → B từ chối có lý do → C reload đọc lại lý do → báo lại → B xác nhận. D báo → B xác nhận. Balance **500000**, đúng **2 IN**. Không chuyển tiền thật.
6. Kiểm leave/remove theo nghĩa vụ, restart không reset rồi đọc lại. Fund kết thúc **OPEN**; không gọi đây là quyết toán.

Inbox/read/preferences và Price Watch đã có UI Gateway. Khi trình bày observation phải nói rõ provider `MOCK_FLIGHT`; không khẳng định vé/giá thực. Delivery Finance trong harness không chứng minh demo cá nhân đã bật delivery. Không dùng expense/refund/closure/payment thật, DSS/provider thật, Export/Share/Admin CRUD hoặc Packing/Dress/Map writer làm chức năng đã hoàn thành. Dữ liệu fixture ở cổng 5173 không phải dữ liệu Gateway ở 5273.

## 8. HTTPS khi đưa lên production

**Web production phải dùng HTTPS.** HTTP localhost ở hướng dẫn này chỉ dành cho demo local, không phải lựa chọn kiến trúc production. Web gọi relative `/api/v1`; không hardcode HTTP public vào adapter. Production phải phục vụ SPA và `/api/v1` cùng HTTPS origin qua reverse proxy/TLS, với cookie Secure, Origin/CSRF đúng và link verify/reset/invitation HTTPS. Không expose database, MinIO, RabbitMQ hoặc các cổng RPC ra Internet.

Web Locks cần secure context ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)); localhost là chế độ thử local đang nghiệm thu. Không tắt cơ chế phối hợp phiên khi đem lên HTTP LAN/domain. `vite preview` chỉ dùng xem build local, **không phải server production** ([Vite](https://vite.dev/guide/static-deploy.html)).

Backend còn production transport guards; đây **không phải** hướng dẫn triển khai domain chỉ bằng đổi `NODE_ENV`/URL. Cần kế hoạch TLS/internal transport, secrets, backups, migration rollout và deployment riêng; không bỏ guard để chạy tạm. TLS/domain/production, Mobile, provider thật và CI sau push: **NOT RUN**.

Nguồn contract/runtime: [runbook Backend](../Wolfari-backend/docs/architecture/local-demo.md), [handoff](../Wolfari-backend/docs/architecture/demo-1-web-handoff.md), [rejection feedback](../Wolfari-backend/docs/architecture/demo-1-rejection-feedback.md). Ba DOCX chính thức không bị chỉnh sửa bởi đợt Web.
