# Hướng dẫn build và chạy Wolfari demo 1 local

Ngày cập nhật: **29/10/2026**. Hướng dẫn chuẩn cho **demo local**, Web `feat/demo-1-web` và Backend `feat/demo-1-backend`, bao gồm các thay đổi chưa commit. Core, lịch trình cộng tác, selected editors, leave/remove và quỹ đóng góp thủ công đã có giao diện Gateway thật. Kết luận nghiệm thu, snapshot và giới hạn nằm trong [validation](docs/demo-1-web-validation.md); truy vết 49 tác vụ ở [phụ lục](docs/demo-1-web-addendum-v1.0.md). Không dùng riêng HEAD để xác định bản cần chạy.

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

Với dữ liệu demo đã có: dừng đúng launcher bằng `demo:stop` trước khi nâng cấp, chạy lại `demo:init` rồi `demo:start`. Giữ volume và secrets; **không reset hoặc seed lại chỉ để lấy password**.

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

Xem email thực tế bằng `corepack pnpm demo:accounts` trong Backend. Không giả định luôn có `demo-owner@wolfari.test`. Password sinh ngẫu nhiên nằm trong `Wolfari-backend/.local/demo/seed.json`; chỉ đọc cục bộ, không dán vào log/issue/chat. Password trong journal có thể cũ sau khi đổi ở UI: dùng Quên mật khẩu và Mailpit <http://127.0.0.1:18025/>. Seed không tự reset tài khoản đã tồn tại.

Token verify/reset/invite được loại khỏi URL sau khi đọc, không lưu để tiện reload. Khi cần mở lại, lấy link từ thư gốc. Mailpit không phải dịch vụ gửi thư production và hộp thư có thể mất khi restart hạ tầng; dùng resend nếu cần.

## 5. Kiểm tra build và phạm vi bằng chứng

Tại Web:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm build:preview
corepack pnpm exec playwright install chromium
```

Các suite sẵn có: `test:e2e` là fixture; `test:e2e:gateway` dùng HTTP mock; `test:e2e:live` dùng Backend demo đã start/seed, cần cổng 5273 trống và có ghi dữ liệu test. Không chạy suite live lên instance đang dùng để trình diễn mà không hiểu tác động. Suite live cũ chưa bao phủ các yêu cầu mới của demo1.

Để kiểm thử tích hợp an toàn, ưu tiên bộ mới do Web quản lý:

```powershell
corepack pnpm test:e2e
corepack pnpm test:e2e:gateway
corepack pnpm test:e2e:demo1
```

`test:e2e:demo1` tự build Backend/Web, cấp ports ngẫu nhiên, Compose project/volumes riêng, áp dụng migrations của từng service, tạo năm tài khoản và dữ liệu nghiệp vụ qua UI rồi chạy Chromium trên **dev và build/preview**. Không cần `demo:start` hoặc `demo:seed`, không reset dữ liệu đang trình diễn. Dùng Docker cùng Node native, không container hóa ứng dụng.

- Snapshot/manifest/kết quả: `test-results/demo1/<runId>/`; `dev/results.json`, `preview/results.json` và business-proof. Đọc exit code cùng báo cáo, không chỉ health.
- `snapshot.json` và `final-source.json` có SHA/branch/full working tree và implementation hash; harness từ chối PASS nếu code đổi giữa dev và preview. Docs cập nhật sau lượt test không đổi implementation hash.
- Secrets test trong `.local/demo1/<runId>/` đã ignored; không commit hoặc chia sẻ thư mục này.
- Cleanup chỉ dừng PID con và tài nguyên có project/label đúng run ID. Mặc định xóa volumes **của lần test**; dữ liệu test này không được giữ để trình diễn. `corepack pnpm test:e2e:demo1 --keep` giữ volumes test, vẫn dừng container/app; không áp dụng cho dữ liệu demo cá nhân.
- Không chạy hai bộ Playwright vào cùng output directory. Fixture và HTTP mock đã tách `test-results/fixture` / `test-results/gateway`.
- Bộ `test:e2e:live` cũ không thay gate demo1: bốn bài Auth/Invitations/Trip-Plan/Members dùng seed và ghi thêm dữ liệu vào instance demo; không có quỹ/fault/restart cô lập. Selector đã cập nhật nhưng lượt bàn giao này không chạy lên dữ liệu cá nhân; không lấy kết quả lịch sử làm bằng chứng hiện hành.

Không bật trace/HAR/video cho luồng có token/password. Không chuyển tiền thật, không tự tải QR có dữ liệu ngân hàng ra provider ngoài.

Trên máy ít RAM, chạy các suite **lần lượt**, không chạy Backend unit cùng browser/hạ tầng. Có thể dùng `corepack pnpm test --maxWorkers=2` ở từng repo; không tăng heap hoặc dừng ứng dụng khác một cách tự động. Các launcher test cũng tắt DOM failure snapshot của bản Playwright đang khóa để không ghi form nhạy cảm vào artifact.

## 6. Dừng, chạy lại và xử lý lỗi

Trong Backend, `corepack pnpm demo:stop` dừng đúng Web demo/Backend/hạ tầng và giữ volumes. Khởi động lại bằng `demo:start`, rồi `demo:dev` hoặc `demo:preview`. Không kill toàn bộ Node/Docker theo tên hoặc cổng.

- Port bận: kiểm tra launcher đang chạy; không dừng tiến trình không thuộc demo.
- Manifest thiếu/sai: kiểm layout hai repo và chạy `demo:init` đúng Backend.
- 401/CSRF: giữ hostname/origin đúng, đăng nhập lại; không đưa refresh/access token vào storage.
- 409: tải dữ liệu mới và đối chiếu draft; không tự overwrite.
- Timeout/503/202: chưa chắc request chưa commit; giữ nguyên key/body, không tạo lệnh mới để thử vận may.
- `NEEDS_REVIEW`: giữ operation ID, phục hồi dependency rồi theo runbook operator Backend; không sửa ledger/receipt/guard bằng SQL.
- Finance unavailable: không diễn giải là số dư 0 hoặc chưa có quỹ.
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

Không dùng expense/refund/closure/payment thật, DSS/provider, Export/Share/Admin hoặc Packing/Dress/Map writer làm chức năng đã hoàn thành. Dữ liệu fixture ở cổng 5173 không phải dữ liệu Gateway ở 5273.

## 8. HTTPS khi đưa lên production

**Web production phải dùng HTTPS.** HTTP localhost ở hướng dẫn này chỉ dành cho demo local, không phải lựa chọn kiến trúc production. Web gọi relative `/api/v1`; không hardcode HTTP public vào adapter. Production phải phục vụ SPA và `/api/v1` cùng HTTPS origin qua reverse proxy/TLS, với cookie Secure, Origin/CSRF đúng và link verify/reset/invitation HTTPS. Không expose database, MinIO, RabbitMQ hoặc các cổng RPC ra Internet.

Web Locks cần secure context ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)); localhost là chế độ thử local đang nghiệm thu. Không tắt cơ chế phối hợp phiên khi đem lên HTTP LAN/domain. `vite preview` chỉ dùng xem build local, **không phải server production** ([Vite](https://vite.dev/guide/static-deploy.html)).

Backend còn production transport guards; đây **không phải** hướng dẫn triển khai domain chỉ bằng đổi `NODE_ENV`/URL. Cần kế hoạch TLS/internal transport, secrets, backups, migration rollout và deployment riêng; không bỏ guard để chạy tạm. TLS/domain/production, Mobile, provider thật và CI sau push: **NOT RUN**.

Nguồn contract/runtime: [runbook Backend](../Wolfari-backend/docs/architecture/local-demo.md), [handoff](../Wolfari-backend/docs/architecture/demo-1-web-handoff.md), [rejection feedback](../Wolfari-backend/docs/architecture/demo-1-rejection-feedback.md). Ba DOCX chính thức không bị chỉnh sửa bởi đợt Web.
