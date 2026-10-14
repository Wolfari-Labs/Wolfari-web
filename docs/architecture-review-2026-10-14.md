# Đánh giá cấu trúc và thiết kế Web Wolfari

## Kết luận ngắn

Thiết kế kỹ thuật Web hiện tại **phù hợp với hướng đi của dự án**, đặc biệt ở ranh giới Gateway, bảo mật session và cách chia feature theo domain. Tuy nhiên, **chưa thể kết luận giao diện Web đã phù hợp về UI/UX**, vì repository `Wolfari-web` hiện chưa có mã nguồn frontend, package, route triển khai, component hay file Figma được cung cấp trong workspace.

Nói chính xác hơn: Figma đã có một hệ thống thiết kế và phạm vi màn hình khá đầy đủ. Việc Web được triển khai độc lập trước Backend là khả thi, miễn là prototype/fixture và API contract được tách riêng, sau đó thay adapter bằng API Gateway mà không phải viết lại UI.

## Mô hình triển khai độc lập Web trước Backend

Mô hình này phù hợp với tình trạng hiện tại của dự án. Web có thể hoàn thiện shell, layout, responsive, component, navigation và toàn bộ trạng thái UI bằng fixture. Tuy nhiên nên giữ một ranh giới dữ liệu ổn định:

```text
Figma
  -> screen map
  -> feature UI
  -> domain DTO/adapter
       ├─ fixture adapter (giai đoạn độc lập)
       └─ Gateway adapter (giai đoạn tích hợp)
```

Nguyên tắc bắt buộc:

- Component chỉ nhận domain view model; không biết fixture hay API thật.
- Fixture phải có nhãn `preview`/`mock`, không được hiển thị thông báo “đã lưu” nếu chưa có server xác nhận.
- API adapter thật phải giữ đúng envelope, error code, permission, revision/version và idempotency đã mô tả trong baseline.
- Mỗi frame Figma cần được ghi `mock-only`, `partial-runtime` hoặc `runtime-ready` trong screen map.
- Không tạo DTO frontend trực tiếp từ database; DTO nên mô phỏng contract Gateway dự kiến.

## Quan sát trực tiếp từ file Figma

File có ba page chính: `Wolfari · Desktop`, `Wolfari · Mobile` và `Wolfari · Admin`. Qua danh sách frame/layer có thể xác nhận:

- Desktop: 28 frame/layer chính, gồm tài khoản, thành viên, quỹ nhóm/Finance, cài đặt Trip, xuất/chia sẻ, theo dõi giá vé và Admin flow.
- Mobile: 28 frame/layer chính, gồm Trip, Activity, Packing, profile, invitation, export/share, price watch, bottom sheet và component showcase.
- Admin: 18 frame/layer chính, gồm tổng quan, tài khoản, giám sát hệ thống, provider/integration, audit/support, feature flag và các action khóa/mở khóa/retry.

Điểm đáng chú ý là file không chỉ là vài mockup đơn lẻ; nó đã mô hình hóa nhiều trạng thái nghiệp vụ như “đang tạo file”, “link đã tạo”, “Finance CLOSED”, “lời mời đã sẵn sàng”, “liên kết không khả dụng”, “đã thu hồi lời mời” và “đã đổi ảnh”. Đây là hướng tốt vì sản phẩm này có nhiều trạng thái bất đồng bộ và quyền hạn.

## Phạm vi đã kiểm tra

- `Wolfari-web`: README, implementation baseline, domain architecture và web implementation roadmap.
- `Wolfari-backend`: monorepo apps/packages, Gateway routing/proxy, API/OpenAPI/architecture docs và các migration/schema liên quan.
- `Wolfari-mobile`: trạng thái repository hiện có.

## Cấu trúc hiện tại

Workspace gồm ba repository độc lập:

1. Backend monorepo: API Gateway, Identity, Trip Workspace, Travel Intelligence, Finance, Automation, Export Worker; các package chung là contracts, common, database và testing.
2. Web: hiện chỉ có tài liệu và license.
3. Mobile: hiện chỉ có README và license.

Gateway là ranh giới đúng cho browser. Browser nên chỉ gọi `/api/v1`, còn Gateway chịu trách nhiệm session, CSRF, rate limit, error envelope và gọi service nội bộ qua HTTP/gRPC phù hợp.

## Điểm phù hợp

| Hạng mục | Đánh giá | Lý do |
| --- | --- | --- |
| React + TypeScript strict + Vite SPA | Phù hợp | Backend hiện cung cấp REST qua Gateway; chưa có nhu cầu SSR trong baseline. |
| Chia `features/<domain>` | Phù hợp | Khớp các miền Identity, Trip, Plan, Invitations và Members; tránh component biết service nội bộ. |
| TanStack Query cho server state | Phù hợp | Trip/Plan dùng revision/version và cần invalidate/refetch sau mutation. |
| Một API client `fetch` dùng chung | Phù hợp | Tập trung envelope, timeout, correlation id, Bearer, CSRF và cookie flow. |
| Access token memory + refresh HttpOnly cookie | Phù hợp và cần giữ | Khớp trực tiếp với Gateway Web flow; tránh localStorage/sessionStorage. |
| CSS Modules + CSS variables | Phù hợp giai đoạn đầu | Cho phép chuyển token từ Figma mà chưa kéo theo UI kit lớn. |
| Route guard phía Web | Phù hợp nếu giới hạn đúng vai trò | Chỉ điều hướng; quyền thật vẫn phải do Gateway/service quyết định. |
| Tách Desktop/Mobile/Admin | Phù hợp về tổ chức sản phẩm | Ba page giúp phân biệt trải nghiệm người dùng, mobile interaction và vận hành; khi code vẫn nên dùng chung domain/API contract, không nhân bản nghiệp vụ. |
| Bottom sheet và mobile action flows | Phù hợp mobile | Các frame M28–M33 cho thấy thiết kế đã quan tâm đến thao tác ngắn, chi tiết Activity và hành lý; cần ánh xạ sang Activity/Packing contract thực tế. |
| Trạng thái Finance/export/share/price watch | Tốt về UX intent, chưa sẵn sàng tích hợp | Figma đã thể hiện state, nhưng backend hiện chưa cung cấp đủ runtime API cho toàn bộ các miền này. |

## Khoảng cách và rủi ro hiện tại

### 0. Figma đang rộng hơn phạm vi backend runtime

Các page Desktop/Mobile đã bao phủ Finance, Price Watch, Export/Share, Packing, Travel/tiện ích và nhiều cài đặt Trip. Trong giai đoạn Web độc lập, các màn hình này có thể triển khai bằng fixture; khi tích hợp, chúng vẫn phải chờ contract runtime tương ứng. Không được để fixture che khuất khoảng cách giữa product target và API đã sẵn sàng.

### 1. Chưa có sản phẩm Web để đánh giá trực quan

Chưa có `src/`, `index.html`, `package.json`, lockfile, build config, test, CI hay runtime preview. Do đó chưa thể đánh giá typography, spacing, responsive, accessibility, loading/empty/error states, navigation usability hoặc mức khớp Figma.

### 2. Phạm vi UI dễ vượt quá phạm vi API runtime

Tài liệu sản phẩm có nhiều miền như Finance, Travel, DSS, export/share và Admin, nhưng runtime Gateway hiện chưa chứng minh đủ REST handler cho tất cả. Những màn hình này chỉ nên ở trạng thái `target/unavailable` cho đến khi có contract và handler thật; không được dùng mock như thể đã tích hợp.

### 3. Dữ liệu member còn thiếu cho UI giàu thông tin

Projection member hiện có thể thiếu display name/avatar. Nếu Figma thiết kế danh sách thành viên có avatar/tên, cần xác định contract bổ sung hoặc thiết kế fallback rõ ràng; không suy ra dữ liệu từ database.

### 4. Các mutation có trạng thái nghiệp vụ phức tạp

Trip/Plan cần xử lý version conflict, permission, timeout và idempotency. UI phải có trạng thái conflict/pending/unknown rõ ràng, không hiển thị “đã lưu” trước khi server xác nhận và không retry mù một mutation.

### 5. Link một lần và routing production còn cần chốt

Verify/reset/invitation token phải được đọc trong memory, xóa khỏi URL và không đi vào log/cache. Production còn cần chốt domain, HTTPS, reverse proxy, SPA fallback và `WEB_ORIGIN` khớp chính xác.

### 6. Admin cần được tách như một capability boundary

Page Admin có các thao tác khóa/mở khóa tài khoản, retry job, cấu hình provider, feature flag và audit/support. Đây không nên chỉ là thêm vài route vào user Web; cần có admin role, permission matrix, reason bắt buộc cho thao tác hỗ trợ và audit trail ở backend. Figma đang đi đúng hướng khi có các frame “Lý do truy cập hỗ trợ” và “Admin Action”, nhưng implementation phải chờ contract Admin được xác nhận.

## Đánh giá thiết kế theo mức sẵn sàng

- Kiến trúc tích hợp: **phù hợp**.
- Phân chia domain/feature: **phù hợp**, nhưng cần giữ giới hạn không import chéo nội bộ feature.
- Bảo mật session: **phù hợp và có yêu cầu bắt buộc**.
- Phạm vi MVP: **phù hợp nếu chỉ bắt đầu từ Identity, Trip, Invitations/Members và Plan Activity**.
- UI/UX thực tế: **chưa đủ bằng chứng để đánh giá**.
- Figma information architecture: **khá tốt**, đã tách Desktop/Mobile/Admin và biểu diễn nhiều trạng thái nghiệp vụ.
- Khả năng build/chạy độc lập: **phù hợp để bắt đầu**, sau khi scaffold source/config và fixture adapter.
- Khả năng tích hợp Backend: **cần kiểm soát contract**, đặc biệt với Finance, Price Watch, Export/Share, Travel và Admin.

## Thứ tự nên làm tiếp

1. Lập screen map từ Figma: frame → actor → route → feature → mock/runtime status → loading/empty/error/responsive state.
2. Scaffold React/Vite/TypeScript strict, app shell, router, design tokens, shared components và fixture adapter.
3. Hoàn thiện độc lập Desktop/Mobile/Admin bằng fixture; kiểm tra desktop/tablet/mobile, keyboard/focus và trạng thái lỗi.
4. Chốt domain DTO/adapter trước khi tích hợp; không để component gọi trực tiếp mock hoặc `fetch`.
5. Thay từng fixture adapter bằng Gateway adapter theo lát cắt: Auth → Trip → Invitations/Members → Plan Activity.
6. Chỉ tích hợp Travel, Finance, DSS, export/share và Admin khi Gateway/service có contract runtime được kiểm tra.
7. Bổ sung lint, typecheck, unit/component test, E2E và browser review ở cả chế độ mock và integrated.

## Tài liệu phân tích và triển khai

Bộ tài liệu giao diện/luồng hiện được duy trì trong cùng thư mục `Wolfari-web/docs`: [screen inventory](screen-inventory.md), [flow map](flow-map.md), [screen contracts](screen-contracts.md), [state matrix](state-matrix.md) và [Figma implementation matrix](figma-implementation-matrix.md). Các tài liệu này bổ sung cho baseline/domain architecture; chúng không thay thế việc xác minh Gateway runtime trước khi tích hợp.
