# Kiến trúc Web thuận tiện cho tích hợp Backend về sau

## Mục tiêu

Web có thể dựng và review độc lập theo Figma, nhưng khi Backend sẵn sàng chỉ cần thay adapter dữ liệu, không phải viết lại route, component hoặc trạng thái UI.

## Mô hình chính

```text
Figma
  ↓
Route/page
  ↓
Feature hooks/use-cases
  ↓
Domain view models + result states
  ↓
Repository interface
      ├── Fixture repository     (UI preview)
      └── Gateway repository     (API integration)
```

UI không được biết dữ liệu đến từ fixture hay HTTP. `Gateway repository` là nơi duy nhất biết `/api/v1`, Bearer token, cookie, CSRF, envelope, correlation id, timeout và mapping lỗi.

## Cấu trúc thư mục khuyến nghị

```text
src/
├─ app/
│  ├─ router.tsx
│  ├─ providers.tsx
│  ├─ query-client.ts
│  └─ route-paths.ts
├─ infrastructure/
│  ├─ http/
│  │  ├─ http-client.ts
│  │  ├─ api-error.ts
│  │  └─ envelope.ts
│  ├─ session/
│  ├─ fixtures/
│  └─ repositories/
├─ features/
│  ├─ auth/
│  ├─ profile/
│  ├─ trips/
│  ├─ invitations/
│  ├─ members/
│  └─ plan/
│     ├─ model/
│     ├─ repositories/
│     │  ├─ plan.repository.ts
│     │  ├─ plan.fixture-repository.ts
│     │  └─ plan.gateway-repository.ts
│     ├─ hooks/
│     ├─ routes/
│     └─ components/
├─ shared/
│  ├─ components/
│  ├─ styles/
│  └─ lib/
└─ mocks/
   ├─ scenarios/
   └─ preview-only.ts
```

Khi feature lớn dần, repository interface và hai adapter đặt cạnh feature đó. Không tạo một `mockApi.ts` toàn cục chứa mọi miền vì nó dễ trở thành contract giả và khó thay từng miền.

## Quy tắc contract

1. Component chỉ nhận domain view model; không nhận raw database shape hoặc raw Gateway envelope.
2. Repository interface mô tả use-case mà UI cần, ví dụ `listTrips`, `updateTrip`, `completeActivity`, không mô phỏng tên bảng/database.
3. Gateway adapter ánh xạ DTO HTTP sang domain view model và chuẩn hóa lỗi tại một nơi.
4. Fixture adapter phải trả cùng shape, permission và các trạng thái lỗi chính như Gateway adapter.
5. Các field kiểm soát cạnh tranh như `plan_version`, `membership_revision`, `export_revision` luôn có trong model từ đầu, kể cả fixture.
6. Mutation phải trả trạng thái `pending`, `succeeded`, `failed` hoặc `unknown`; không tự kết luận thành công khi timeout.
7. Không retry mutation nếu không có idempotency key hoặc contract cho phép retry.
8. Không import package nguồn từ Backend vào Web; hai repository giữ lockfile và release độc lập. Khi contract ổn định, có thể generate type từ OpenAPI/proto vào Web hoặc kiểm tra compatibility trong CI.

## Chế độ chạy

### UI preview

- `VITE_DATA_MODE=fixture`.
- Chỉ dùng fixture trong development/preview.
- Có scenario cố định: success, empty, loading, forbidden, not-found, conflict, unavailable.
- Không gửi request thật và không hiển thị kết quả mutation như dữ liệu đã lưu trên server.

### Integrated Web

- `VITE_DATA_MODE=gateway` hoặc cấu hình tương đương trong build environment.
- Browser chỉ gọi same-origin `/api/v1` qua Gateway.
- Access token ở memory; refresh token HttpOnly cookie; CSRF và `X-Client-Type: web` theo Backend.
- Feature chỉ bật khi route, handler, permission, error mapping, version và idempotency đã được xác nhận.

## Thứ tự triển khai tối ưu

1. App shell, tokens, router, shared components và repository interfaces.
2. Fixture scenarios cho các trạng thái của Figma.
3. Auth/Profile với session boundary đúng ngay từ đầu.
4. Trip → Members/Invitations → Plan Activity theo vertical slice.
5. Mỗi lát cắt thay fixture adapter bằng Gateway adapter và giữ nguyên component.
6. Packing, Travel, DSS, Finance, Price Watch, Export/Share và Admin chỉ mở khi Backend gate tương ứng đạt.

## Điều kiện hoàn tất một feature

- Có frame Figma và screen map.
- Có domain model/view model độc lập transport.
- Có fixture scenarios cho success/loading/empty/error/permission/conflict.
- Có repository interface và fixture adapter.
- Có Gateway adapter hoặc ghi rõ Backend dependency chưa sẵn sàng.
- Có mapping permission, error, version và idempotency.
- Có test để chứng minh fixture adapter và Gateway adapter cùng thỏa interface.
- Component không import trực tiếp `fetch`, URL, token hoặc fixture.

## Những điều không nên làm

- Không đặt `fetch` trong component.
- Không để component kiểm tra `VITE_DATA_MODE`.
- Không dùng database entity làm TypeScript model của UI.
- Không copy toàn bộ API catalog vào Web khi chưa có runtime.
- Không tạo mock mutation làm thay đổi dữ liệu như server thật.
- Không dùng `localStorage` để giữ access token hoặc dữ liệu riêng tư.
