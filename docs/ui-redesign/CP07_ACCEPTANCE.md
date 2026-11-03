# CP-07 — nghiệm thu Map / Dress / Packing Web

Status: **APPROVED/DONE** theo user D38, 01/11/2026. Người dùng đã xem xét và chấp thuận CP07 sau W01–W06 trong phạm vi D35 và ba quyết định riêng CP07-M01/D01/P01 của D36. Toàn bộ kết quả READY_FOR_REVIEW và giới hạn verification dưới đây được giữ nguyên. D38 mở CP08 Members/invitations/policy; không duyệt các design delta pending.

## Bàn giao

- Gateway Map dùng `selectedLocations` và activity thật từ Trip+Plan snapshot; danh sách/tìm kiếm/lọc theo source `20:386`, chi tiết chữ và trạng thái không khả dụng khi thiếu map provider. Không hiện thao tác chọn/lưu/xóa khi Gateway không có API.
- Gateway Dress dùng `dressCodes` thật theo TRIP/DAY/ACTIVITY, card và panel phải “Chỉ xem” theo source `20:565`; không gán ảnh/outfit mẫu hoặc upload/apply/save giả.
- Gateway Packing dùng `packingItems` authoritative cho tiến độ/category/status/quantity/assignee/due, kể cả ở 402/320px. Gateway chỉ xem; Preview giữ add/edit/toggle cục bộ và disabled controls khi thiếu quyền theo source `23:312`.
- Giữ `useTripPlanSnapshot`, route/permission/session và repository contracts; không thêm endpoint, schema, dependency hay Backend mutation. XRT04 chỉ được triển khai đúng ba phần duyệt D36, các delta còn lại giữ pending.

## Definition of Done và bằng chứng

| Gate CP07 | Kết quả |
|---|---|
| Ba route và truthful loading/empty/error/permission/read-only states | Gateway projection HTTP-mock 11/11 PASS; không có Trip writes. |
| Gateway/Preview boundary | Preview fixture28/28 PASS và Packing permission regression4/4 PASS; Gateway không hiển thị local write controls. |
| Responsive, keyboard/focus, motion, contrast, zoom | Gateway composition15/15 PASS ở năm viewport; sáu full-page và sáu route axe scans0; native Chrome zoom200% 1/1 PASS. [Ảnh trước/sau và số đo](evidence/cp07/README.md). |
| Code/build/test gates | Lint/typecheck, Vitest47 files/571 tests, production và Preview builds PASS. [Lệnh, mode và failure history](CP07_VERIFICATION.md). |
| Hồ sơ và dừng | [Record](checkpoints/CP-07.md), [STATE](STATE.md), [route matrix](ROUTE_MATRIX.md), [decision log](DECISIONS.md) và [delta register](DESIGN_DELTAS.md) đồng bộ; đã STOP tại D37, user duyệt CP07/mở CP08 theo D38. |

## Giới hạn còn giữ

Live Backend/production, configured Google Maps provider success/failure, manual screen reader, thiết bị vật lý, Web Vitals và CI **NOT_RUN**. E2E Gateway dùng HTTP mocks trên Vite dev; Preview Map dùng Places mock. Native zoom là Chrome thật với HTTP-mock data, không chứng minh Backend/provider thật. Ảnh trước CP07 được dựng trong bản app cô lập từ đúng file Gateway trước sửa, cùng Plan mock; không phải ảnh production. [Verification](CP07_VERIFICATION.md) lưu lịch sử W04 7/8 rồi 11/11 sau sửa, và giới hạn screenshot desktop Dress. CP06 Plan native zoom cùng các giới hạn/PLN06 của checkpoint trước vẫn không thay đổi.

## Stop

CP-07 đã được đóng theo D38. CP-08 tiếp tục theo [record riêng](checkpoints/CP-08.md) và phải dừng trước CP-09. D36/D38 không là approval cho màu/font/motion/asset hoặc các delta MBR01–MBR05 chưa duyệt.
