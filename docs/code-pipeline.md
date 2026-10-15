# Wolfari Web — Code Pipeline theo logic giao diện

Cập nhật: 15/10/2026

## 1. Kết luận kiến trúc hiện tại

Web là SPA React 19 + TypeScript + Vite. Luồng khởi động nằm ở `src/main.tsx`: chọn `fixture` hoặc `gateway`, tạo repository theo từng domain, bọc các repository bằng provider và khởi tạo router. UI không nên gọi Gateway trực tiếp từ component.

Hiện tại các màn hình đã có route và giao diện preview gồm Home, Login, Register, Trip List, Trip Overview, Plan, Members và Profile. Fixture repository đã cung cấp các trạng thái để duyệt UI; các Gateway repository mới trả `SERVICE_UNAVAILABLE` nếu chưa được truyền reader thật. Vì vậy pipeline phải tách rõ hai chế độ:

- `fixture/preview`: duyệt layout, tương tác, loading/empty/error/unavailable và responsive.
- `gateway/runtime`: gọi cùng-origin `/api/v1`, đọc envelope, map DTO thành view model và không giả lập mutation thành công.

## 2. Pipeline chuẩn của một flow

```text
Figma / screen contract
        ↓
route + actor + permission gate
        ↓
feature page / route controller
        ↓
TanStack Query: key, loading, error, retry, cache
        ↓
repository interface (domain model)
        ↓
Gateway adapter (DTO + request mapping)
        ↓
HTTP client (same-origin, token, CSRF, timeout, envelope)
        ↓
API Gateway → service runtime
        ↓
domain result → view state → UI
        ↓
Vitest/Testing Library → Playwright → visual/browser review
```

Mỗi flow chỉ được mở runtime sau khi có đủ: route, actor/permission, request/response/error contract, repository method, Gateway adapter, state matrix và test. Tên frame Figma chỉ là bằng chứng giao diện, không phải bằng chứng API.

## 3. Trách nhiệm theo lớp

| Lớp | Trách nhiệm | Không được làm |
| --- | --- | --- |
| `src/app` | router, shell, provider, guard điều hướng, route context | ghép endpoint hoặc chứa nghiệp vụ domain |
| `src/infrastructure/http` | `/api/v1`, header, credentials, timeout, envelope, `ApiError`, access token/CSRF | biết component hoặc quyết định UI |
| `src/infrastructure/repositories` | map Gateway DTO ↔ domain repository; chọn fixture/gateway | trả dữ liệu giả trong production path |
| `src/features/<domain>/model` | view model, input schema, result/error type, query key contract | import database entity hoặc phụ thuộc feature khác |
| `src/features/<domain>/hooks` | query/mutation, cache key, invalidate/refetch | gọi `fetch` trực tiếp |
| `src/features/<domain>/routes` hoặc Page | phối hợp route params, query và state presentation | tự gắn Bearer, tự retry write, tự suy quyền |
| `src/features/<domain>/components` | render trạng thái và phát intent của người dùng | báo “đã lưu” khi server chưa xác nhận |
| `src/shared` | primitive UI, state presentation, format dùng chung | chứa logic riêng của Trip/Auth/Plan |

## 4. Quy tắc chuyển UI thành code

Với mỗi frame hoặc flow, ghi một screen contract trước khi code:

1. Route và actor: Guest, User, Member, Owner hoặc Plan Editor.
2. Dữ liệu cần hiển thị và nguồn projection tương ứng.
3. Hành động người dùng: navigation, filter, form submit, retry, mutation.
4. State bắt buộc: loading, empty, error, unavailable, permission denied, conflict, pending.
5. API readiness: `runtime-ready`, `runtime-candidate`, `partial-runtime`, `mock-only` hoặc `unknown`.
6. Ràng buộc version/idempotency/token và hành vi khi timeout.
7. Selector kiểm thử: accessible role/name trước, `data-flow`/`data-node-id` khi cần đối chiếu Figma.

Component chỉ nhận domain model và callback intent. Luồng dữ liệu phải đi từ repository vào Query, rồi từ Query vào Page/View; không đặt fixture hoặc transport logic trong component.

## 5. Pipeline triển khai theo từng lát cắt

### Stage A — Freeze UI contract

Đọc [screen inventory](screen-inventory.md), [screen contracts](screen-contracts.md), [state matrix](state-matrix.md), [flow map](flow-map.md) và mapping Figma. Chốt một flow nhỏ, không chốt cả product trong một branch.

Output: route, actor, states, component tree, API gap và acceptance checklist.

### Stage B — Build/repair presentation path

Triển khai hoặc sửa `Page` và component bằng fixture repository. Kiểm tra desktop/mobile, keyboard/focus, loading/empty/error/unavailable. Các nút chưa có contract phải disabled hoặc gắn nhãn preview; không tạo success giả.

Output: UI khớp screen contract, test component và fixture scenario.

### Stage C — Define domain boundary

Tạo hoặc hoàn thiện model/repository interface trước adapter. Ví dụ Plan phải có `tripId`, `planVersion`, activity ordering, permission và các write intent có `expected_plan_version`.

Output: interface ổn định để fixture và Gateway cùng implement; component không đổi khi thay data source.

### Stage D — Implement Gateway adapter

Adapter dùng `createGatewayHttpClient`, gọi đúng `/api/v1`, map envelope và DTO có kiểm tra runtime. Không gọi service port nội bộ. Với write, truyền `X-Idempotency-Key`/expected revision theo contract; không retry mù các thao tác có side effect.

Output: adapter test với success, invalid envelope, 401/403/404/409/429/503, timeout và correlation id.

### Stage E — Wire session and permissions

Access token chỉ ở memory. Refresh token do HttpOnly cookie giữ; refresh/logout cần credentials, `Origin` và CSRF theo Gateway contract. Route guard chỉ hỗ trợ navigation; quyền cuối cùng lấy từ projection backend. Token trong query/fragment chỉ đọc một lần trong memory, xóa khỏi URL và không ghi log/storage.

### Stage F — Runtime verification

Chạy lint, typecheck, unit/component, build production. Khi Gateway và service sẵn sàng, chạy Playwright trên flow thật: load, refresh session, success, permission denied, not found, conflict, timeout và retry. Chỉ chuyển capability từ preview sang runtime khi test chứng minh contract.

## 6. Thứ tự code đề xuất bám UI hiện tại

| Thứ tự | Flow | Việc cần làm | Gate mở |
| --- | --- | --- | --- |
| 1 | Auth/session | memory access token, refresh cookie, CSRF, login/register/refresh/logout | không lưu token; reload/refresh/logout đúng |
| 2 | Profile | `GET/PATCH /me`, avatar, sessions, password | 401/validation và version hiển thị đúng |
| 3 | Trip List | list projection, filter/sort local, loading/empty/error | không báo create thành công khi chưa có mutation |
| 4 | Trip Overview | trip projection + plan summary + permission | 404/403/503 và revision không bị mất |
| 5 | Members/invitations | member projection, invitation lifecycle, one-time link | thiếu display name/avatar phải hiện rõ; token memory-only |
| 6 | Plan | snapshot, activity CRUD/reorder/completion | expected plan version, idempotency, 409 recovery |
| 7 | Deferred domains | Travel, Finance, DSS, export/share, Admin | chỉ mở khi Gateway handler/schema/quyền/error contract đã verified |

## 7. Quy tắc fixture → Gateway

`VITE_DATA_MODE=fixture` chỉ hợp lệ trong dev/preview. Production mặc định là `gateway`. Hai adapter phải cùng implement một repository interface và trả cùng `ReadResult`/domain model; fixture không được mở thêm hành động mà Gateway chưa hỗ trợ.

Khi thay fixture bằng Gateway:

- giữ nguyên Page, component và route nếu screen contract không đổi;
- thay factory/adapter, không import fixture vào Gateway adapter;
- map server permission thành capability UI, không suy ra từ actor label;
- invalidate đúng query sau mutation, không reset toàn bộ cache;
- khi `409`, giữ draft và hiển thị conflict/reload action;
- khi timeout sau write, không tạo operation mới tự động nếu idempotency chưa được chứng minh.

## 8. Definition of Done cho mỗi flow

- Screen contract và state matrix đã cập nhật.
- Route và actor đúng; không có route production cho capability `target-only`.
- Component không gọi transport trực tiếp.
- Fixture và Gateway dùng cùng repository interface.
- Success/error/loading/empty/unavailable/permission/conflict đã có xử lý phù hợp.
- API adapter có test envelope, mapping, status và correlation id.
- Có test tương tác cho hành động chính và Playwright khi runtime đã mở.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đạt; `pnpm build:preview` vẫn hoạt động.
- Đối chiếu browser ở viewport desktop/tablet/mobile và ghi lại gap còn lại.

## 9. Các điểm không được làm trong pipeline

- Không gọi Identity, Trip, gRPC, PostgreSQL, RabbitMQ hoặc MinIO trực tiếp từ browser.
- Không lấy SRS/ERD hoặc tên frame làm bằng chứng API runtime.
- Không dùng fixture để giả lập payment, export, email, invitation accept hoặc mutation chưa có contract.
- Không cho phép UI quyết định quyền Owner/Member/Plan Editor.
- Không thêm Redux/Zustand chỉ để giữ server state đã thuộc TanStack Query.
- Không gom tất cả domain vào một Page hoặc một “API service” lớn; giữ boundary theo flow và repository.
