# Wolfari Web — thiết kế kỹ thuật và baseline tích hợp

Cập nhật: 14/10/2026. Đây là tài liệu thiết kế kỹ thuật cho Web, không phải thiết kế giao diện. Các công nghệ/cấu trúc phía Web dưới đây là đề xuất; repository Web hiện chưa có mã nguồn, package hay cấu hình build. Mọi thay đổi tiếp theo chỉ nằm trong `Wolfari-web`.

Để xem thiết kế toàn bộ miền sản phẩm theo SRS/ERD/API — gồm các module còn thiếu, service owner, luồng tích hợp và gate mở feature — đọc thêm [domain architecture](domain-architecture.md).

## Nhận xét cấu trúc hiện tại

Ở thời điểm rà soát, `Wolfari-web` mới có `README.md`, `LICENSE` và tài liệu trong `docs/`; chưa có `src/`, `package.json`, lockfile, `.gitignore`, cấu hình môi trường, test, CI hay quy trình build/deploy. Vì vậy chưa có giao diện hoặc kiến trúc frontend hiện hữu để đánh giá chất lượng. README chỉ chốt React và TypeScript; thiết kế dưới đây cụ thể hóa cách triển khai phù hợp với backend hiện tại.

Workspace gồm ba repository độc lập: `Wolfari-backend`, `Wolfari-web` và `Wolfari-mobile`. Thiết kế Web không đòi hỏi chia sẻ package hoặc gọi trực tiếp mã nguồn giữa các repository.

## Đọc tài liệu và thứ tự đối chiếu backend

Backend có bộ tài liệu chính thức SRS v2.3, ERD Database v1.2 và DDL/API/Event v1.1; bộ này được chốt ngày 02/10/2026. Bộ tài liệu xác định yêu cầu và hợp đồng mục tiêu, nhưng không chứng minh mọi API đã có handler. Các tài liệu kiến trúc, OpenAPI và mã Gateway/service bổ sung trạng thái triển khai.

Khi Web tích hợp, dùng thứ tự sau:

1. Mã Gateway và service tại HEAD hiện tại để xác định route và hành vi đang chạy.
2. OpenAPI trong `Wolfari-backend/docs/api/` để tra schema/HTTP contract đã mô tả.
3. Tài liệu kiến trúc và kiểm chứng trong `Wolfari-backend/docs/architecture/` để hiểu quyền, lifecycle và các giới hạn đã biết.
4. SRS/ERD/DDL chính thức để hiểu phạm vi sản phẩm và mục tiêu chưa chắc đã chạy được.

Các điểm đọc chính: [mục lục backend](../../Wolfari-backend/docs/README.md), [baseline kiến trúc](../../Wolfari-backend/docs/architecture/design-baseline.md), [môi trường phát triển](../../Wolfari-backend/docs/architecture/development-environment.md), [Identity](../../Wolfari-backend/docs/architecture/identity-phase1.md), [Trip core](../../Wolfari-backend/docs/architecture/trip-core.md), [Plan access](../../Wolfari-backend/docs/architecture/trip-plan-access-control.md), [Invitations](../../Wolfari-backend/docs/architecture/trip-invitations.md), [Membership lifecycle](../../Wolfari-backend/docs/architecture/trip-member-lifecycle.md), [contracts](../../Wolfari-backend/docs/architecture/contracts.md), và [bộ tài liệu chính thức](../../Wolfari-backend/docs/releases/2026-10-02-documentation-baseline.md).

## Cấu trúc backend liên quan đến Web

Backend là monorepo Node.js 24/pnpm 10 với bảy ứng dụng NestJS: API Gateway (3000), Identity (3101), Trip (3102), Travel (3103), Finance (3104), Automation (3105) và Export Worker (3106). Các package dùng chung gồm `common`, `database`, `contracts`; repository còn có `infrastructure/` cho Compose/PostgreSQL, `scripts/` cho cấu hình môi trường và `docs/` cho kiến trúc, API, database/ERD, kiểm chứng và lịch sử.

```text
Wolfari-backend/
├─ apps/          # api-gateway, identity, trip-workspace, travel-intelligence,
│                 # finance, automation, export-worker
├─ packages/      # common, database, contracts (Protobuf/events)
├─ infrastructure/# Compose, PostgreSQL, MinIO
├─ scripts/       # env, migrations, local development, integration checks
├─ docs/          # api, architecture, database, erd, history, releases
├─ .github/       # workflows
└─ pnpm workspace/config/lockfiles
```

Năm database nghiệp vụ là Identity, Trip, Travel, Finance và Automation; Export Worker chưa có database nghiệp vụ riêng. PostgreSQL, RabbitMQ và MinIO là hạ tầng nội bộ. Service gọi nhau bằng gRPC, phát/nhận event qua RabbitMQ; Web không tham gia các giao thức nội bộ này. API Gateway là entry point REST của Web và xác thực session qua Identity trước các route cần bảo vệ.

Tình trạng API quan sát được trong mã hiện tại:

| Miền | Có thể dùng trong phạm vi Web hiện tại | Giới hạn cần giữ |
| --- | --- | --- |
| Identity | Auth, refresh/logout Web, profile, avatar, password, sessions | Access token ở memory; refresh token qua HttpOnly cookie. |
| Trip core | Trip list/create/get/update và quyền sửa Plan | Optimistic concurrency bằng revision/version; không giả lập field thiếu. |
| Plan | Snapshot và Activity CRUD/reorder/completion | Location/Dress/Packing mới là projection nếu có dữ liệu; chưa có CRUD Web. |
| Invitations | Tạo/list/preview/accept/decline/revoke/resend | LINK trả token một lần; EMAIL cần email đã xác minh và khớp. |
| Members | List thành viên | Projection không có tên/avatar người dùng. |
| Leave/remove member | Handler có trong slice lifecycle | Intent mới mặc định bị khóa bởi `TRIP_MEMBERSHIP_LIFECYCLE_ENABLED=false` do Finance/shared guard chưa hoàn thành. |
| Travel, Finance, DSS, export | Chưa có đủ REST runtime để Web tích hợp | Tài liệu/schema/contract không đồng nghĩa API đã hoạt động. |

OpenAPI cần đối chiếu là [Identity](../../Wolfari-backend/docs/api/identity.openapi.yaml), [Trip core](../../Wolfari-backend/docs/api/trip-core.openapi.yaml), [Invitations](../../Wolfari-backend/docs/api/trip-invitations.openapi.json) và [Membership lifecycle](../../Wolfari-backend/docs/api/trip-member-lifecycle.openapi.json). Khi có khác biệt, kiểm tra route ở Gateway và handler service thay vì suy luận từ SRS/ERD.

## Phạm vi dựng được ngay

Web hiện chưa có mã nguồn, package hay cấu hình build. MVP đầu tiên chỉ nên dùng các API đã có runtime:

1. Identity: đăng ký, đăng nhập, xác minh email, quên/đổi mật khẩu, hồ sơ, avatar và session.
2. Trip: danh sách, tạo, chi tiết, sửa metadata, cấu hình quyền sửa Plan.
3. Collaboration: mời thành viên, xem danh sách member, accept/decline invitation.
4. Timeline: xem Plan; tạo, sửa, xóa, đổi thứ tự và hoàn thành Activity.

Không gọi API hay làm mutation cho Finance, Travel/map/weather, DSS, export, share link, Admin, template, archive/delete/duplicate/transfer Owner, Location, Dress code hoặc Packing. Các module này mới có schema, contract hay code nền, chưa có REST runtime để Web dùng.

## Kiến trúc Web đề xuất

Chọn SPA React/TypeScript, build thành static assets. Backend hiện cung cấp REST qua API Gateway; không có yêu cầu Web phải render dữ liệu trên server. Máy chạy Web chỉ phục vụ static files và proxy API ở local; môi trường triển khai sẽ đặt reverse proxy cùng origin trước Gateway.

```text
Browser
  ├─ tải static Web (local: Vite :5173)
  └─ /api/v1/* (same-origin)
        -> local Vite proxy hoặc production reverse proxy
        -> API Gateway (local: 127.0.0.1:3000)
        -> Identity / Trip / service nội bộ khi runtime sẵn sàng
```

Browser chỉ gọi API Gateway. Không gọi trực tiếp cổng Identity/Trip, gRPC, PostgreSQL, RabbitMQ, MinIO hay worker. Quyền ở route phía Web chỉ phục vụ điều hướng; Gateway/service vẫn là nơi quyết định xác thực và phân quyền.

### Công nghệ, công cụ và vai trò

| Lựa chọn | Dùng cho |
| --- | --- |
| Node.js 24 + Corepack/pnpm 10.34.5 | Đồng bộ toolchain với backend. Web vẫn giữ package và lockfile riêng. |
| React + TypeScript strict | Ứng dụng SPA có kiểu cho API và miền nghiệp vụ. |
| Vite | Dev server, build static files và proxy `/api/v1` trong local. |
| React Router | Routing phía trình duyệt, route lồng nhau và lazy loading theo module. |
| TanStack Query | Cache server state, truy vấn phân trang, mutation và invalidate/refetch sau thay đổi. |
| `fetch` bọc trong API client nội bộ | Giữ một nơi xử lý token, envelope, correlation ID, timeout và lỗi; chưa cần thêm HTTP client. |
| React Hook Form + Zod | Quản lý dữ liệu form và kiểm tra input/schema ở client. Backend vẫn phải validate lại. |
| CSS Modules + CSS custom properties | Tổ chức style theo module và chia sẻ token kỹ thuật; chưa chọn UI kit. |
| Vitest + Testing Library | Unit/component tests cho parser, API client và tương tác component. |
| Playwright | E2E trên browser cho các luồng tích hợp quan trọng khi có môi trường chạy. |
| ESLint + Prettier | Kiểm tra chất lượng và định dạng mã. |

Chưa cần Redux/Zustand cho server state: TanStack Query giữ dữ liệu từ API, còn access token và state tạm được giữ trong React context/module memory. Không bật persistence cho cache chứa dữ liệu riêng tư. Không chốt số phiên bản dependency trong tài liệu này; chọn phiên bản tương thích tại lúc khởi tạo và commit lockfile.

Tham khảo tài liệu chính thức: [Vite server proxy](https://vite.dev/config/server-options#server-proxy), [React Router Route](https://reactrouter.com/api/components/Route), [TanStack Query quick start](https://tanstack.com/query/latest/docs/framework/react/quick-start), [React Hook Form](https://www.react-hook-form.com/), [Zod](https://zod.dev/), [Vitest](https://vitest.dev/guide/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) và [Playwright](https://playwright.dev/docs/intro).

### Cấu trúc thư mục Web đề xuất

```text
Wolfari-web/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx          # route tree; không chứa logic API
│  │  ├─ route-paths.ts      # URL constants
│  │  ├─ providers.tsx       # QueryClientProvider, SessionProvider
│  │  ├─ query-client.ts
│  │  ├─ guards/             # authenticated/guest route guards
│  │  └─ error-boundary.tsx
│  ├─ api/
│  │  ├─ http-client.ts      # fetch, base path, auth, CSRF, timeout
│  │  ├─ envelope.ts         # parse success/error envelope
│  │  ├─ api-error.ts        # lỗi chuẩn hóa + correlation_id
│  │  ├─ access-token-store.ts # access token in-memory
│  │  ├─ csrf.ts             # lấy CSRF token theo luồng Web
│  │  └─ contracts/
│  │     └─ common.ts        # envelope, pagination, shared primitives
│  ├─ features/
│  │  ├─ auth/               # API, schemas, session hooks, auth routes
│  │  ├─ profile/            # profile, avatar, password, sessions
│  │  ├─ trips/              # Trip list/create/detail/policy
│  │  ├─ members/            # member projection + lifecycle (nếu được bật)
│  │  ├─ invitations/        # manage, preview, accept/decline
│  │  └─ plan/               # plan snapshot + Activity
│  ├─ shared/
│  │  ├─ components/         # primitive dùng chung, không chứa nghiệp vụ
│  │  ├─ hooks/              # hook dùng chung
│  │  ├─ lib/                # date/timezone, UUID, blob URL
│  │  └─ types/
│  ├─ styles/
│  │  ├─ global.css
│  │  └─ tokens.css          # map token từ Figma khi triển khai
│  ├─ main.tsx
│  └─ vite-env.d.ts
├─ tests/                     # unit/component tests colocated cạnh source
│  └─ e2e/
├─ docs/
├─ .node-version
├─ .env.example
├─ .gitignore
├─ eslint.config.js
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
├─ prettier.config.js
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
└─ playwright.config.ts       # thêm khi E2E được thiết lập
```

Feature giữ endpoint module, types/schema, query/mutation hooks, route modules và component của chính miền đó. API transport chỉ ở `src/api`; component không ghép URL, gắn Bearer header hoặc tự gọi `fetch`. Types DTO đặt cạnh feature tương ứng; không lấy ERD/database entity làm model frontend.

Ví dụ quy ước cho một feature:

```text
features/trips/
├─ api/trips.api.ts          # chỉ endpoint Trip
├─ model/trip.types.ts       # DTO và type miền
├─ model/trip.schemas.ts     # input validation ở client
├─ hooks/queries.ts          # query keys + read
├─ hooks/mutations.ts        # write + invalidate
├─ routes/                   # route-level modules
├─ components/               # component thuộc miền Trip
└─ index.ts                  # public exports
```

| Lớp | Trách nhiệm |
| --- | --- |
| `app/` | Kết nối route/provider/guard với public exports của feature; không chứa endpoint cụ thể. |
| `api/` | HTTP, token, CSRF, envelope, correlation ID và lỗi chuẩn hóa; không import feature. |
| `features/<domain>/api` | Endpoint đúng miền; không gọi service port nội bộ. |
| `features/<domain>/model` | DTO, schema và quy tắc client; backend vẫn là nguồn kiểm tra cuối. |
| `features/<domain>/hooks` | TanStack Query keys, truy vấn, mutation và cache invalidation. |
| `features/<domain>/routes,components` | Kết nối routing và component với hooks của miền. |
| `shared/` | Primitive/component/hook tổng quát, không import feature hoặc API cụ thể. |

Quy tắc import: `features` được dùng `api` và `shared`, không import file nội bộ feature khác; `api` và `shared` không phụ thuộc feature. Luồng liên miền được điều phối ở route/use-case cấp ứng dụng. Server state ở TanStack Query, session token và state tạm ở memory, form state nằm trong feature. Không bật persistence cho cache có dữ liệu riêng tư.

Feature map kỹ thuật: `auth` (session, verify/reset), `profile` (me/avatar/password/sessions), `trips` (Trip CRUD cơ bản/policy), `members` (projection và lifecycle nếu backend bật), `invitations` (manage/preview/accept/decline), `plan` (snapshot/Activity). Không thêm feature/API cho Finance, Travel, DSS, export hoặc CRUD Location/Dress/Packing cho tới khi Gateway có runtime.

Route map đề xuất là URL kỹ thuật, không phải thiết kế màn hình: `/login`, `/register`, `/auth/verify`, `/auth/reset-password`, `/trips`, `/trips/:tripId`, `/trips/:tripId/plan`, `/trips/:tripId/members`, `/trips/:tripId/invitations`, `/invitations/local`, `/profile`. Guard chỉ kiểm soát điều hướng; quyền thật luôn lấy từ backend. Với component thuộc nghiệp vụ, đặt trong feature; chỉ đưa vào `shared/components` khi được nhiều feature dùng. Nếu Web nhận email verify/reset trực tiếp, các path helper backend phát dưới `/api/v1/auth/local/*` cần được map về route auth của SPA trước rule proxy API.

Dùng query keys có cấu trúc như `['trips', filters]`, `['trip', tripId]`, `['trip-plan', tripId]`; sau mutation invalidate đúng Trip/Plan/member/invitation queries. Chỉ tạo API types từ OpenAPI sau khi spec và runtime khớp ổn định.

## Thông số kết nối và môi trường

| Thành phần | Local (giá trị đề xuất cho Web) | Web có dùng trực tiếp? |
| --- | --- | --- |
| Vite dev server | `http://127.0.0.1:5173` | Có, để phục vụ Web và làm proxy. |
| API Gateway REST | `http://127.0.0.1:3000` | Chỉ là đích proxy; trình duyệt gọi `/api/v1` cùng origin. |
| Identity / Trip app | `:3101` / `:3102` | Không. Chỉ Gateway gọi service nội bộ. |
| Travel / Finance / Automation / Export Worker | `:3103`–`:3106` | Không; nhiều nghiệp vụ còn chưa có runtime REST. |
| PostgreSQL / RabbitMQ / MinIO / Mailpit | `:5432`, `:5672`, `:9000`, `:1025` (UI riêng) | Không gọi từ browser. |

Vite config dự kiến:

```ts
server: {
  host: '127.0.0.1',
  port: 5173,
  strictPort: true,
  proxy: {
    '/api/v1': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
    },
  },
}
```

Giữ nguyên path `/api/v1`, không proxy thẳng sang Identity/Trip. Gateway hiện không bật CORS cho Web; proxy giúp trình duyệt gửi request same-origin. Cookie Web local được đặt theo cấu hình Gateway.

Frontend chỉ cần biến công khai, ví dụ `VITE_API_BASE=/api/v1`. Mọi biến `VITE_*` được đóng gói và người dùng có thể đọc; tuyệt đối không đặt secret, database URL, service URL nội bộ, JWT signing key hay credential vào đó. Backend giữ cấu hình riêng trong môi trường backend.

Identity kiểm tra `Origin` cho refresh/logout bằng cookie. Khi Web chạy ở cổng 5173, cấu hình runtime hiện có của backend phải cho phép chính xác `WEB_ORIGIN=http://127.0.0.1:5173` (hoặc origin thực tế đang dùng); tài liệu Identity mặc định cùng origin Gateway ở cổng 3000. Trình duyệt tự gửi `Origin`; Web chỉ cần gửi CSRF header theo contract, không cố tự đặt header bị browser kiểm soát.

Production chưa có domain/cấu hình triển khai được chốt. Thiết kế đích là phục vụ static Web qua HTTPS và reverse-proxy `/api/v1/*` tới Gateway cùng origin, với cookie Secure và `WEB_ORIGIN` khớp chính xác domain Web. Gateway/Trip hiện còn giới hạn transport nội bộ loopback và thiếu TLS/mTLS production; vì vậy không coi cấu hình local là cấu hình production. Route SPA cần fallback về `index.html`, còn `/api/v1/*` phải được giữ nguyên và chuyển tới Gateway.

### Email và invitation deep links

Backend hiện cấu hình `IDENTITY_LINK_BASE_URL` và `TRIP_INVITATION_LINK_BASE_URL`; local mặc định là origin Gateway `http://127.0.0.1:3000`. Identity sinh đường dẫn verify/reset dạng `/api/v1/auth/local/verify|reset?token=...`; invitation LINK sinh `/invitations/local#token=...`. Gateway hiện có helper route local cho các link này.

Khi chuyển các link sang Web, cần cấu hình các base URL theo môi trường và định tuyến chính xác những path helper tới Web. Riêng Identity link nằm dưới `/api/v1`, nên reverse proxy không được gửi path helper đó vào API upstream nếu Web chịu trách nhiệm xử lý; cần route ngoại lệ trước rule proxy API. Chưa có domain hoặc routing production được chốt. Token từ query/fragment chỉ nên đọc trong memory, xóa khỏi URL ngay sau khi lấy và không đưa vào log, analytics hay persistent storage.

## Quy ước HTTP

Response thành công:

```json
{ "data": {}, "meta": { "correlation_id": "uuid" } }
```

Response lỗi:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Không thể hoàn tất yêu cầu",
    "details": { "plan_version": 3 },
    "retryable": false
  },
  "meta": { "correlation_id": "uuid" }
}
```

Gửi `Content-Type: application/json` cho JSON và `Authorization: Bearer <access_token>` cho route bảo vệ. Gateway tự tạo/trả `X-Correlation-Id`; HTTP client nên giữ correlation ID trong lỗi để hỗ trợ debug.

Đặt logic giao thức trong một client duy nhất: ghép base path, serialize JSON, kiểm tra envelope, phân tích error envelope và gắn correlation ID vào lỗi chuẩn hóa. Dùng `AbortController` để hủy request khi rời context; timeout không được xem là bằng chứng mutation thất bại. Request upload avatar dùng `FormData` và không tự đặt `Content-Type` để browser thêm multipart boundary. Chỉ bật `credentials: 'include'` cho các route Auth Web cần cookie.

Các mutation có quy định trong OpenAPI dùng `Idempotency-Key` dạng UUID. Tạo key một lần cho một intent; nếu timeout/503 có kết quả chưa rõ, retry với **cùng key và cùng payload**. Không tự tạo key mới khi chưa biết mutation trước đã commit hay chưa. Riêng `POST /trips` bắt buộc `client_request_id`; header `Idempotency-Key` là tùy chọn nhưng nếu gửi phải bằng `client_request_id`.

| Lỗi | Cách xử lý phía client |
| --- | --- |
| `UNAUTHENTICATED` (401) | Refresh một lần, sau đó về login nếu vẫn lỗi. |
| `PERMISSION_DENIED` (403) | Invalidate dữ liệu Trip/Plan và ẩn action không còn quyền. |
| `RESOURCE_NOT_FOUND` (404) | Điều hướng danh sách; không suy đoán Trip có tồn tại. |
| `VERSION_CONFLICT` (409) | Không ghi đè; tải lại dữ liệu và thông báo xung đột. |
| `STATE_CONFLICT` (409) | Hiển thị state mới rồi tải lại. |
| `IDEMPOTENCY_CONFLICT` (409) | Dừng retry key hiện tại, tạo intent mới sau khi tải lại. |
| `SERVICE_UNAVAILABLE` (503, retryable) | Cho phép retry cùng key/payload; không báo thành công. |

## Xác thực Web

Access token phải chỉ nằm trong memory ứng dụng, không lưu localStorage, sessionStorage hoặc URL. Refresh token Web là cookie HttpOnly `wolfari_refresh` ở path `/api/v1/auth`.

Luồng khởi tạo:

1. Login bằng `POST /api/v1/auth/login`, header `X-Client-Type: web`; lưu `data.access_token` vào memory. Gateway đặt refresh cookie HttpOnly `wolfari_refresh`, SameSite=Lax, Path=`/api/v1/auth`; production cần Secure/HTTPS.
2. Khi reload mà có refresh cookie: gọi `GET /api/v1/auth/csrf` với `credentials: 'include'`, sau đó `POST /api/v1/auth/refresh` cũng với `credentials: 'include'`, `X-CSRF-Token`, `X-Client-Type: web` và body `{}`. Browser tự gửi cookie và `Origin`.
3. Access token sống 15 phút. Khi 401, chỉ thử refresh một lần theo single-flight. Chỉ replay mutation khi endpoint có idempotency key và request được gửi lại đúng key/body; nếu không, báo kết quả chưa rõ và tải lại trạng thái trước khi cho gửi lại.
4. Logout cũng cần CSRF, cookie, Bearer và body `{ "session_id": "uuid" }`; xoá state memory sau response.

Không gửi đồng thời refresh cookie và `refresh_token` JSON. Web không cần, và không nên dùng, client mode `mobile`.

### Identity routes

Các path dưới đây là hậu tố của `/api/v1`.

| Route | Body/chú ý |
| --- | --- |
| `POST /auth/register` | `{email,password,full_name}`; password 15–128 ký tự; 202 |
| `POST /auth/login` | `{email,password}`; Web nhận refresh cookie |
| `GET /auth/csrf` | cần refresh cookie |
| `POST /auth/refresh` | Web gửi body `{}` và CSRF |
| `POST /auth/email-verifications` | Bearer, body `{}` |
| `POST /auth/email-verifications/confirm` | `{token}` |
| `POST /auth/password-reset-requests` | `{email}` |
| `POST /auth/password-resets` | `{token,new_password}` |
| `GET /me`; `PATCH /me` | PATCH: `{full_name?,avatar_object_key?,expected_version}` |
| `POST /me/avatar` | multipart field `file`, JPEG/PNG <= 10 MiB; sau đó PATCH `/me` để gắn key |
| `GET /me/avatar` | Bearer, ảnh PNG private; dùng blob URL và thu hồi URL khi thay ảnh/rời context |
| `POST /me/password-change` | `{current_password,new_password}` |
| `GET /me/sessions` | `limit` 1–100, `cursor?` |
| `DELETE /me/sessions/{sessionId}` | Thu hồi cả refresh family |

Profile gồm `id,email,full_name,avatar,system_role,status,email_verified_at,version`. `PATCH /me` dùng optimistic locking với `version`; khi 409 cần GET `/me` lại.

## Trip và quyền

Trip trả về:

```ts
type Trip = {
  id: string; name: string; description: string | null;
  start_at: string; end_at: string; timezone: string;
  lifecycle: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';
  archived_at: string | null;
  public_description: string | null;
  plan_edit_policy: 'OWNER_ONLY' | 'SELECTED_MEMBERS' | 'ALL_MEMBERS';
  plan_version: number; membership_revision: number; export_revision: number;
  current_membership: Membership;
  permissions: { can_read: boolean; can_update: boolean };
};
```

| Route | Input chính |
| --- | --- |
| `GET /trips?limit=1..100&cursor?&lifecycle?` | Lifecycle `UPCOMING`, `ONGOING`, `COMPLETED`, `ARCHIVED` |
| `POST /trips` | `{name,description?,start_at,end_at,timezone?,client_request_id}`; RFC3339; `end_at > start_at`; header Idempotency-Key nếu gửi phải bằng client_request_id |
| `GET /trips/{tripId}` | Owner/Member active |
| `PATCH /trips/{tripId}` | key + `{name?,description?:string|null,public_description?:string|null,expected_plan_version,expected_export_revision}` |
| `PUT /trips/{tripId}/plan-policy` | Owner + key + `{policy,editor_member_ids,expected_membership_revision}` |

Owner mới sửa metadata/policy. Owner và Member active đọc Trip/Plan. Trip archived chỉ đọc. Luôn lấy `plan_version`, `membership_revision`, `export_revision` mới nhất từ backend; client không tự tăng chúng.

Với policy `SELECTED_MEMBERS`, gửi toàn bộ danh sách `trip_members.id` active được chọn. Với `OWNER_ONLY`/`ALL_MEMBERS`, bắt buộc gửi `editor_member_ids: []`.

## Members và invitations

| Route | Trạng thái |
| --- | --- |
| `GET /trips/{tripId}/members?limit&cursor&include_left=false` | Dùng được; item gồm id, trip_id, user_id, role, joined_at, left_at. |
| `POST /trips/{tripId}/leave` | Idempotency-Key + `{reason,expected_membership_revision}`; reason 1–1000 ký tự. Intent mới bị khóa mặc định bởi `TRIP_MEMBERSHIP_LIFECYCLE_ENABLED=false` cho đến khi Finance/shared guard hoàn tất. |
| `DELETE /trips/{tripId}/members/{memberId}` | Cùng body/header/điều kiện khóa lifecycle như leave; chỉ Owner active có thể remove Member. |
| `GET /operations/{operationId}` | Chỉ poll receipt lifecycle của chính initiator; không phải API polling operation tổng quát. Trạng thái gồm PROCESSING, PENDING_RECOVERY, SUCCEEDED, FAILED, NEEDS_REVIEW. |

Member API không có display name/avatar. Không dựng tên giả hoặc gọi `/me` để lấy profile của người khác. Để hiển thị thông tin thành viên đầy đủ, backend cần bổ sung projection/API riêng trong một công việc sau.

| Route | Input |
| --- | --- |
| `GET /trips/{tripId}/invitations?limit&cursor?&status?` | Owner; status `PENDING|ACCEPTED|DECLINED|REVOKED|EXPIRED` |
| `POST /trips/{tripId}/invitations` | Owner + key; `{invitation_type:"EMAIL"|"LINK",email?,expires_at?,expected_membership_revision}` |
| `POST /invitations/preview` | Bearer; `{token}`, không cần key/không consume |
| `POST /invitations/accept`, `decline` | Bearer + key; `{token}` |
| `POST /trips/{tripId}/invitations/{id}/revoke`, `resend` | Owner + key; `{expected_version}` |

EMAIL yêu cầu email đăng nhập đã verified và trùng invitation. LINK yêu cầu account ACTIVE. Secret link chỉ xuất hiện ở response tạo đầu tiên; client không ghi token vào log, analytics, localStorage hay cache dùng chung. API preview không consume token; accept/decline mới là mutation.

## Plan và Activity

`GET /trips/{tripId}/plan` trả snapshot `activities`, `selected_locations`, `dress_codes`, `packing_items`, `plan_version`, `export_revision` và `permissions`.

Hiện chỉ Activity có mutation. Location/Dress/Packing chỉ đọc nếu trong response đã có dữ liệu.

| Route | Body |
| --- | --- |
| `POST /trips/{tripId}/activities` | key; `{expected_plan_version,title,activity_type,position,description?,public_description?,selected_location_id?,starts_at?,ends_at?}` |
| `PATCH /trips/{tripId}/activities/{activityId}` | key; `expected_plan_version` + fields thay đổi; gửi `null` để clear nullable field |
| `DELETE /trips/{tripId}/activities/{activityId}` | key; `{expected_plan_version,confirmed:true}` |
| `PUT /trips/{tripId}/activities/order` | key; `{expected_plan_version,activity_ids}` phải là hoán vị của toàn bộ list |
| `PATCH /trips/{tripId}/activities/{activityId}/completion` | key; `{expected_plan_version,status:"TODO"|"COMPLETED"}` |

`title` tối đa 255, `activity_type` tối đa 40, `position` >= 0. Thời gian cần có cả start/end hoặc cùng null; khi có phải tăng dần và nằm trong Trip. Create/update/delete/reorder cần Owner hoặc Plan Editor. Member active cũng có thể set `COMPLETED`; chỉ chính người đã complete hoặc Editor được set lại `TODO`.

Mỗi thay đổi thực tăng `plan_version` và `export_revision`. Khi 409, GET `/plan` trước khi để người dùng lưu/reorder lại.

## Ranh giới module Web

Các module kỹ thuật cần triển khai theo thứ tự phụ thuộc: `api/http-client` và session; `auth`/profile; `trips`; `members`/invitations; `plan`. Đây là phân chia mã nguồn, không phải bản thiết kế màn hình.

Thời gian API là RFC3339 instant; ngày/giờ nghiệp vụ cần diễn giải theo IANA timezone của Trip, không suy ra ngày đi từ timezone máy. Nếu sau này tích hợp Finance, amount theo contract là chuỗi integer VND, không dùng JavaScript `number`.

## Kiểm chứng backend đã đọc

Backend có test `identity:test`, `trip:test`, `trip:invitations:test`, `trip:members:test` cùng unit/contract tests. Web chưa có test/build pipeline. Khi khởi tạo Web, scripts tối thiểu nên gồm `typecheck`, `lint`, `test`, `build`; bổ sung `test:e2e` với Playwright khi có môi trường API ổn định. Backend chưa sẵn sàng production TLS/mTLS; cũng chưa hoàn tất full Finance closure.

Nguồn đối chiếu: API runtime trong `Wolfari-backend/apps/api-gateway/src/*-proxy.ts`; nghiệp vụ ở Identity/Trip services; OpenAPI trong `Wolfari-backend/docs/api/`; SRS/ERD/DDL official là baseline phạm vi chưa triển khai.
