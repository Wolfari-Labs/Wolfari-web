# Wolfari Web — thiết kế cấu trúc các miền nghiệp vụ

Cập nhật: 14/10/2026. Tài liệu này thiết kế **cấu trúc kỹ thuật Web cho toàn bộ phạm vi nghiệp vụ trong SRS**, tập trung vào các miền chưa có luồng Web hoàn chỉnh. Đây không phải thiết kế giao diện: Figma tiếp tục là nguồn thiết kế giao diện. Tài liệu chỉ sửa đổi trong repository `Wolfari-web`.

## Kết luận đọc bộ DOCX

Có thể thiết kế phần còn thiếu ở mức phân rã module, quyền sở hữu dữ liệu, luồng tích hợp, hợp đồng Web cần tiêu thụ và thứ tự triển khai. Ba DOCX chính thức đã đủ để làm baseline cho thiết kế này:

- [SRS v2.3](../../Wolfari-backend/docs/Wolfari_SRS_v2.3_ChinhThuc.docx) xác định yêu cầu, quyền, trạng thái nghiệp vụ, ngoài phạm vi và tiêu chí nghiệm thu.
- [ERD v1.2](../../Wolfari-backend/docs/Wolfari_ERD_Database_v1.2_ChinhThuc.docx) xác định service sở hữu dữ liệu và mô hình lưu trữ.
- [DDL/API/Event v1.1](../../Wolfari-backend/docs/Wolfari_DDL_API_Event_Specification_v1.1_ChinhThuc.docx) xác định catalog API, kiểu dữ liệu, version, idempotency và event.

Các DOCX cho phép **thiết kế Web mục tiêu**, nhưng không chứng minh endpoint hoặc handler đã chạy. Theo trạng thái ghi trong bộ tài liệu, catalog có 173 REST nghiệp vụ, trong đó 28 được ghi nhận có runtime/contract tại mốc review; 145 là mục tiêu. SRS cũng ghi nhiều miền chưa triển khai. Khi viết code, trạng thái runtime hiện tại trong [implementation baseline](implementation-baseline.md) và mã Gateway/service phải được kiểm tra lại. Baseline đó ghi nhận các luồng hiện Web có thể tích hợp như Identity, Trip core, invitation, membership projection và Activity; có thể có chênh lệch vì được rà soát ở mốc khác với bảng trạng thái trong DOCX.

Quy tắc đọc trạng thái trong tài liệu này:

| Nhãn | Ý nghĩa |
| --- | --- |
| Đang tích hợp | Có luồng REST runtime được ghi trong implementation baseline; vẫn phải kiểm tra mã tại thời điểm coding. |
| Một phần | Có một phần API/handler hoặc nền tảng, nhưng chưa đủ để hoàn tất luồng sản phẩm. |
| Mục tiêu | Yêu cầu/catalog/schema đã mô tả; chưa có bằng chứng đủ về REST runtime để Web phụ thuộc. |
| Đề xuất Web | Cách tổ chức mã/luồng phía Web; không có nghĩa backend đã cam kết thêm API ngoài contract. |

## Ranh giới hệ thống và quyền sở hữu

Web là client của API Gateway. Browser không kết nối trực tiếp với PostgreSQL, MinIO, RabbitMQ, gRPC hay cổng của từng service. Gateway định tuyến REST và xác thực; service sở hữu dữ liệu nghiệp vụ, quyết định quyền và thực hiện transition. Backend là nguồn sự thật về thành viên, role, policy, số dư, version và trạng thái job.

| Năng lực Web | Backend owner | Dữ liệu/trách nhiệm thuộc owner |
| --- | --- | --- |
| Auth, hồ sơ, session, avatar | Identity | User, credential, OAuth identity, refresh/session, xác minh/xóa tài khoản. |
| Trip, thành viên, invitation, Plan, audit Trip | Trip Workspace | Trip, membership, policy, Activity, selected location snapshot, dress code, packing, revisions, share/export metadata. |
| Search place, route, weather, recommendation | Travel Intelligence phối hợp Trip Workspace | Travel sở hữu provider/cache/observation; Trip sở hữu Plan đã lưu và quyết định Apply. |
| Quỹ và dòng tiền | Finance | Fund, Holder, contribution, payment attempt, expense, note ngoài quỹ, refund, closure, ledger append-only. |
| Notifications, reminders, price watch | Automation | Preferences, in-app delivery, reminder schedule, watch/query group/observation. |
| Tạo file | Trip Workspace + Export Worker | Trip sở hữu job/quyền/snapshot; Worker tạo file và lưu object private. Worker không có DB nghiệp vụ riêng. |
| Admin | Service sở hữu cấu hình/tài nguyên | Không có Admin service riêng; request đi tới đúng service owner, support access có lý do và audit. |

Ranh giới này là ranh giới dữ liệu, không yêu cầu tạo một React app cho mỗi backend service. Web được phép tổng hợp dữ liệu bằng các API công khai của Gateway; không tự ghép dữ liệu từ DB hoặc bắt chước quyền service ở client.

## Cấu trúc module Web mục tiêu

Đây là cây đích để mở rộng cấu trúc đã nêu trong [implementation baseline](implementation-baseline.md). Thư mục của capability chưa có backend runtime là kế hoạch, chưa phải chỉ dẫn tạo API giả hoặc UI hoạt động bằng dữ liệu giả trong production.

```text
src/
├─ app/
│  ├─ router.tsx
│  ├─ route-paths.ts
│  ├─ providers.tsx
│  ├─ guards/
│  └─ error-boundary.tsx
├─ api/
│  ├─ http-client.ts
│  ├─ envelope.ts
│  ├─ api-error.ts
│  ├─ access-token-store.ts
│  └─ contracts/                 # kiểu dùng chung, không chứa entity DB
├─ features/
│  ├─ auth/                       # login, register, verify, reset
│  ├─ profile/                    # profile, avatar, password, sessions
│  ├─ dashboard/                  # tổng hợp từ API owner; không có DB dashboard
│  ├─ trips/                      # Trip list/detail, lifecycle, metadata
│  ├─ templates/                  # tạo Trip từ template
│  ├─ members/                    # membership, policy, transfer/lifecycle
│  ├─ invitations/                # create, preview, accept, decline, revoke
│  ├─ plan/
│  │  ├─ activities/
│  │  ├─ locations/               # selected location snapshot thuộc Trip
│  │  ├─ dress-code/
│  │  └─ packing/
│  ├─ travel/                     # place search, route, weather
│  ├─ recommendations/            # preview, apply, ignore, conflict notices
│  ├─ finance/
│  │  ├─ fund/                    # budget, destinations, holder
│  │  ├─ contributions/           # requests, instructions, confirmation
│  │  ├─ payments/                # VietQR/MoMo Sandbox, exceptions
│  │  ├─ expenses/               # draft, submit, Holder decision, reversal
│  │  ├─ notes/                   # chi ngoài quỹ, không tác động ledger
│  │  ├─ refunds/
│  │  ├─ closure/
│  │  └─ ledger/
│  ├─ notifications/              # inbox, preferences, devices nếu Web cần
│  ├─ reminders/
│  ├─ price-watch/
│  ├─ exports/                    # request, progress, private download
│  ├─ shares/                     # Owner management, guest projection
│  ├─ history/                    # Trip/Finance history theo quyền
│  └─ admin/                      # route group, guard và audit support
├─ shared/                        # primitive không biết nghiệp vụ
├─ styles/
└─ main.tsx
```

**Quy ước bên trong mỗi feature:** `api/` gọi endpoint thuộc đúng miền; `model/` giữ DTO, schema và type; `hooks/` giữ TanStack Query keys/read/write; `routes/` và `components/` triển khai route theo Figma. Có thể thêm thư mục con theo workflow khi miền lớn dần. Không nhân bản toàn bộ 173 route trong Web: chỉ khai báo kiểu và hàm cho endpoint runtime đang tích hợp.

**Quy tắc phụ thuộc:** `app` điều phối route/use-case; feature dùng `api` và `shared`; feature không import nội bộ feature khác; `api` và `shared` không import feature. Luồng liên miền đi qua API Gateway và được ghép tại cấp route/use-case. Dữ liệu server nằm trong TanStack Query; token chỉ ở memory; không lưu cache dữ liệu riêng tư bền vững. Feature Admin cùng repository/bundle ban đầu nhưng tách route, layout và permission gate; tách deploy riêng chỉ khi có quyết định hosting/vận hành. Guard trình duyệt chỉ phục vụ điều hướng, không phải biện pháp phân quyền.

## Ma trận phạm vi theo yêu cầu

Mã FR giữ nguyên mã trong SRS để UI, API, test và tài liệu có thể truy vết. Trạng thái dưới đây là tình trạng thiết kế cho Web; “mục tiêu” cần chờ backend runtime/contract được xác nhận.

| Mã SRS | Module Web | Năng lực cần thiết kế | Trạng thái theo baseline Web |
| --- | --- | --- | --- |
| FR-ID01–02 | `auth`, `profile` | Email auth, xác minh/reset, session, profile/avatar/password; OAuth/linking và xóa tài khoản theo handler thực tế. | Đang tích hợp một phần; OAuth/linking, email change/deletion còn thiếu. |
| FR-TR01–02 | `dashboard`, `trips`, `templates` | Trip list/create/detail/update; dashboard tổng hợp và tạo từ template. | Đang tích hợp một phần; template/dashboard/duplicate còn thiếu. |
| FR-TR03 | `invitations` | Tạo/lấy link mời, preview, phản hồi, resend/revoke; xử lý deep link một lần. | Invitation runtime có trong baseline; chưa đồng nghĩa notification push hay toàn bộ collaboration đã xong. |
| FR-TR04–05 | `members` | Member projection, Plan policy, Owner transfer, leave/remove có guard Finance. | Một phần; API member list còn projection tối thiểu; lifecycle bị tắt mặc định theo baseline. |
| FR-TR06 | `trips` | Archive/reopen/delete theo lifecycle và điều kiện Fund; reload trạng thái sau conflict. | Mục tiêu. |
| FR-PL01 | `plan/activities` | Timeline CRUD/reorder/completion, quyền Plan Editor, version conflict. | Baseline hiện ghi Activity CRUD runtime; đối chiếu handler tại thời điểm code vì DOCX mốc review cũ đánh dấu FR chưa triển khai. |
| FR-PL02–04 | `plan/locations`, `dress-code`, `packing` | Search/save place snapshot; CRUD theo scope; item packing, assignee Self và completion. | Mục tiêu; snapshot Plan có thể có projection nhưng không tự suy ra CRUD runtime. |
| FR-TI01 | `travel` | Place/map/route/weather, provider source/time/stale, fallback thủ công. | Mục tiêu. |
| FR-DS01–04 | `recommendations` | Preview không ghi Plan; Apply nguyên tử theo version/idempotency; reason/source; route/packing/dress suggestions và conflict. | Mục tiêu. |
| FR-FN01–08 | `finance` | Fund, contributions, sandbox payment, expense/note/refund, ledger và closure. | Chưa có REST runtime đủ để Web tích hợp theo baseline. |
| FR-AU01–02 | `notifications`, `reminders` | Preferences, in-app inbox, read state, lịch reminder và quyền hiện tại trước dispatch. | Một phần event/email nền; API/UI preferences/inbox/reminders chưa đủ. |
| FR-AU03 | `price-watch` | Trip-bound watch riêng từng người, lịch sử giá, pause/resume và cảnh báo có cooldown. | Mục tiêu. |
| FR-EX01–02 | `exports` | Chọn scope/format, theo dõi job, xem captured versions và tải qua kiểm tra quyền. | Mục tiêu. |
| FR-SH01 | `shares` | Owner quản lý/revoke; Guest chỉ nhận public projection theo allowlist, password/expiry. | Mục tiêu. |
| FR-AD01 | `admin` | Account/provider/config/job/quota, catalog tiện ích, template/theme; support read có reason/audit. | Mục tiêu. |
| FR-AD02 | `history` | Xem lịch sử theo Trip/Finance; không sửa audit. | Audit một phần; History API/runtime chưa đủ. |

## Luồng liên miền cần được giữ nguyên

### Plan, Travel và recommendation

1. Web đọc/ghi Plan qua Trip Workspace; Trip quyết định Owner/Plan Editor và tăng `plan_version`/`export_revision`.
2. Web gọi place/route/weather qua Gateway. Travel sở hữu dữ liệu provider/cache; mỗi kết quả có nguồn, `fetched_at`, trạng thái cũ/thiếu. Provider lỗi không làm mất Plan đã lưu và không được thay dữ liệu bằng kết quả bịa.
3. Recommendation trả preview có `input_plan_version`, lý do, nguồn và thời hạn. Preview/Ignore không ghi Plan. Khi Apply, Trip kiểm tra lại quyền, version, proposal và `apply_request_id`, rồi ghi các item được chọn nguyên tử. Client không tự áp dụng preview cũ hoặc tự ghi các item rời rạc để giả transaction.
4. Selected location là snapshot thuộc Trip; thay đổi provider không ghi đè chỉnh sửa của người dùng. Activity tham chiếu location cùng Trip; không xóa location đang được activity dùng.

### Finance, membership và lifecycle Trip

Finance là sổ ghi nhận nghiệp vụ, không phải ví hay dịch vụ giữ tiền. Mọi nội dung Web phải chỉ rõ `TEST`/sandbox ở các luồng VietQR/MoMo; QR/instruction không chứng minh đã nhận tiền. Người giữ quỹ (Holder), Owner, Member và Plan Editor là quyền riêng; action được hiển thị từ projection server nhưng luôn được backend kiểm tra lại.

Luồng đóng góp, xác nhận nhận, chi, reversal/refund, và closure đều dựa trên state machine của Finance. Ledger là append-only; không sửa giao dịch đã xác nhận như một form thông thường. Note chi ngoài quỹ hiển thị riêng và không đổi số dư. Closure chỉ hoàn tất sau đủ xác nhận và số dư/điều kiện nghiệp vụ hợp lệ. Leave/remove/archive/transfer có thể bị chặn bởi trách nhiệm Finance; Web phải hiển thị lỗi/blocking IDs mà caller được phép xem và đưa người dùng về trạng thái mới, không tự triển khai “bù trừ” ở client.

Các write Finance dùng key idempotency theo operation và cần version/receipt theo contract. Nếu request timeout hoặc 503, trạng thái có thể chưa rõ: retry đúng key + payload theo hỗ trợ runtime, hoặc đọc trạng thái operation nếu endpoint lifecycle cụ thể đã có; không báo thành công sớm, không tạo key mới cho cùng ý định. Không giả định generic `/operations` đã tồn tại cho Finance.

### Automation và notifications

In-app inbox là nguồn để Web đọc trạng thái thông báo; email/push là delivery ngoài hệ thống và có thể trễ. Khi mở notification, Web tải dữ liệu nguồn hiện tại qua API bảo vệ thay vì tin payload push cũ. `read` idempotent; preferences thuộc Self. Web không cần WebSocket hoặc offline sync để đáp ứng baseline; dùng query/refetch theo chính sách sau khi API được xác nhận.

Reminder phụ thuộc revision, occurrence, trạng thái Trip, membership hiện tại và preference. UI không tự tính lịch nền từ đồng hồ máy. Archive dừng reminder và tạm dừng watch theo SRS; Reopen không tự bật lại watch/link.

### Price watch

Watch thuộc một User và Trip; người tạo quản lý điều kiện của watch mình, Owner có quyền xóa watch người khác theo contract. Provider query có thể được chia sẻ nội bộ khi mọi tham số đã chuẩn hóa giống nhau; threshold và notification vẫn riêng từng watch. Giá luôn kèm nguồn/thời điểm. Provider lỗi giữ lịch sử với trạng thái lỗi/cũ, không ghi giá 0 hay phát cảnh báo giả. Watch là tham khảo, không đặt vé.

### Export, public share và Admin

- Export là job nền. Hiển thị trạng thái rõ (queued/processing/succeeded/failed/expired) và thời điểm/version snapshot. Job snapshot nhất quán theo contract, không trộn Plan/Finance version. Tải qua backend kiểm tra membership hiện tại, chủ job, Trip và hạn file; object storage luôn private. Finance đưa vào export chỉ theo quyền và lựa chọn scope. Worker không được gọi trực tiếp từ Web.
- Public share trả projection whitelist từ server, không serialize Trip DTO rồi lọc ở trình duyệt. MVP không công khai Finance, PII thành viên, audit, hóa đơn, QR hay private file. Kiểm tra expiry/password/revocation mỗi lần đọc; revoke phải có hiệu lực với request mới và cache không được vượt qua revoke.
- Admin là system role, không tự thành Owner/Holder/Editor. Route Admin cần `support_reason` ở thao tác support-view và audit tương ứng. Cấm action sửa ledger hoặc xác nhận thay Holder. Secret provider không được trả về UI hoặc ghi thành config có thể đọc.

## Hợp đồng dữ liệu và cách Web xử lý

| Quy ước | Cách dùng ở Web |
| --- | --- |
| JSON API | Base `/api/v1`; success `{data, meta}`; lỗi `{error, meta}`; giữ `correlation_id` trong lỗi phục vụ hỗ trợ. |
| ID và thời gian | UUID dạng string; instant RFC3339 có timezone; date `YYYY-MM-DD`; Trip hiển thị theo IANA timezone của Trip. |
| Money | Chuỗi số nguyên thập phân không dấu phân cách; không parse sang JavaScript `number` để tính tiền. |
| Pagination | Cursor opaque, page size mặc định 20/tối đa 100; không tự tạo offset hoặc sort tùy ý. |
| PATCH | Trường vắng mặt nghĩa là giữ nguyên; `null` chỉ dùng cho trường nullable; không gửi field ngoài allowlist. |
| Revisions | Dùng `plan_version`, `membership_revision`, `export_revision`, `finance_version` từ server; không tự tăng và không tự retry với version cũ. |
| Idempotency | Key UUID gắn với một ý định. Retry chỉ giữ nguyên key và payload theo endpoint contract; lỗi key/hash khác thì dừng và tải lại trạng thái. |
| Envelope | Không giả định response là entity ORM/ERD. DTO chỉ gồm projection được endpoint cho phép. |
| File | Upload/download qua endpoint bảo vệ, xác minh quyền và MIME/size; không lưu URL/object key nhạy cảm trong public state. |

API client chung xử lý base path, Bearer access token, CSRF/cookie theo Identity Web flow, timeout/AbortSignal, envelope, error code và correlation ID. Chỉ bật `credentials: include` cho endpoint cookie. Token/link một lần không ghi vào local/session storage, query cache dùng chung, analytics hoặc log; link token được lấy vào memory rồi xóa khỏi URL. Quy tắc xác thực hiện có chi tiết hơn trong [implementation baseline](implementation-baseline.md).

Không sinh frontend model từ database schema như thể mọi bảng đều có API. Khi một miền được mở runtime, đối chiếu API catalog với OpenAPI, Gateway route, service handler, permission, error mapping, idempotency và version trước khi bật feature. Nếu thiếu endpoint phục vụ projection Web, ghi contract gap để backend xử lý; không gọi service port nội bộ.

## Công nghệ, cấu hình và môi trường

Giữ toolchain đề xuất ở implementation baseline: React + TypeScript strict, Vite, React Router, TanStack Query, `fetch` client nội bộ, React Hook Form + Zod, CSS Modules, Vitest/Testing Library; Playwright cho E2E. Figma cung cấp tokens/asset/behavior khi bắt đầu triển khai UI. Không thêm WebSocket, Redux hoặc offline layer chỉ vì SRS có event/mobile push.

Local: Web ở `127.0.0.1:5173`, proxy `/api/v1` tới Gateway `127.0.0.1:3000`; browser chỉ thấy same-origin API. `WEB_ORIGIN` backend phải khớp chính xác origin Web cho refresh/logout. Production: static Web qua HTTPS và reverse proxy same-origin tới Gateway; domain, TLS/mTLS Gateway và routing email-link production còn phải chốt. Biến `VITE_*` là public, không chứa secret hoặc địa chỉ service nội bộ. Cấu hình kết nối đầy đủ ở [implementation baseline](implementation-baseline.md).

Không chốt provider bản đồ giữa Google Maps và MapLibre/OSM/OSRM thay nhóm. Dùng provider adapter ở backend; nếu SDK bản đồ cần key browser thì key chỉ được giới hạn domain/quota, secret luôn ở server. OpenWeather, MoMo Sandbox, VietQR, ExcelJS và Playwright/Chromium là các lựa chọn được SRS ghi; provider/credential thật phải được bật theo môi trường và contract.

## Thứ tự triển khai Web và điều kiện mở feature

Lộ trình Figma → source chi tiết, gồm đầu ra từng giai đoạn, điều kiện hoàn tất và cách điều chỉnh các đề xuất trong đoạn chat, nằm trong [web implementation roadmap](web-implementation-roadmap.md). Thứ tự cốt lõi là: Figma/API inventory → nền tảng trong repo hiện có → tokens/components → Identity → Trip/collaboration → Plan → các miền còn lại khi API runtime sẵn sàng → nghiệm thu.

Mở feature chỉ khi có: (a) endpoint trong Gateway và handler service, (b) request/response/error contract, (c) authorization/projection, (d) version/idempotency/retry behavior nếu ghi dữ liệu, (e) integration test cho luồng quan trọng, (f) staging configuration nếu cần provider. Khi mới chỉ có một phần, giao diện phải thể hiện phần chưa khả dụng và không mô phỏng thành công từ dữ liệu giả.

## Yêu cầu nghiệm thu ảnh hưởng trực tiếp đến Web

- Xung đột quyền/version hiển thị trạng thái mới và yêu cầu người dùng tải lại; không ghi đè hoặc tự retry version cũ.
- Các trạng thái pending/recovery/closing khác với success; lỗi provider để người dùng tiếp tục với dữ liệu Plan đã lưu.
- Mọi màn hình tài chính ghi nhận sandbox/test và phân biệt khoản ngoài quỹ, khoản trong quỹ, khoản chưa xác nhận.
- Lịch, ngày và tiền hiển thị locale Việt Nam; mọi gợi ý cho phép xem lý do và lựa chọn áp dụng theo quyền.
- E2E web cần bao phủ ít nhất auth, tạo Trip, invitation, quyền Plan, version conflict, Activity, và khi các miền có runtime: packing Self, DSS apply, Finance duplicate/callback race, share revoke, export sau member leave, Admin reason/audit.
- Các chỉ tiêu NFR được duyệt là mục tiêu cần đo, không phải kết quả đã đạt: API thường p95 dưới 2 giây tại 50 người dùng đồng thời (loại latency provider); map thử 200 marker có clustering; request export trả job trong 2 giây và file mẫu 4 ngày/40 Activity hoàn thành trong 60 giây khi worker rảnh. Web phải đo thời gian tải/render và phân biệt provider latency với API nội bộ.
- Bộ SRS yêu cầu kiểm nghiệm AT01–AT18 và NFR; test local hoặc Web E2E riêng không thay bằng chứng end-to-end toàn hệ thống.

## Điểm còn mở cần chốt trước khi triển khai phần tương ứng

1. OAuth Google cho Web và cách link account phải theo Identity runtime/contract; SRS yêu cầu chung account nhưng baseline hiện ghi email auth là phần khả dụng.
2. Domain production, HTTPS/TLS nội bộ, same-origin routing và đường dẫn verify/reset/invitation cần được cấu hình nhất quán.
3. Provider map/route và quy định quota/giấy phép; OpenWeather key; môi trường MoMo Sandbox/VietQR.
4. Chính sách retention cần một quyết định thống nhất: ERD/contract nêu nhiều mốc (ví dụ 30/90 ngày) và ghi rõ một số còn xung đột/chưa chốt. Web không tự xóa hoặc hiển thị retention như cam kết đã vận hành.
5. Admin có thể nằm cùng repo Web ở giai đoạn đầu; nếu cần tách domain/deploy, cần quyết định SSO, cookie, proxy và chia sẻ package trước khi cấu hình production.
6. Member profile projection, Finance history, operation polling, export download, share preview/public routes và Admin projections phải được xác minh ở Gateway trước khi thiết kế API client cụ thể.

Các điểm mở không cản trở tạo cấu trúc module và triển khai luồng runtime hiện tại; chúng là gate cho từng miền phụ thuộc, không phải lý do để giả định contract chưa có.
