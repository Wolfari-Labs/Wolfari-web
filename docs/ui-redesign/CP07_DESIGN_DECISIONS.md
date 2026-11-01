# CP-07 — quyết định thiết kế Map / Dress / Packing Web

Status: **APPROVED_CP07_SCOPE** theo user D36, 01/11/2026, cho đúng CP07-M01/D01/P01 trong bảng. D35 duyệt CP-06 và mở CP-07; D36 là approval riêng theo D17. Phạm vi chỉ Web, không tạo ứng dụng mobile.

## Nguồn và ranh giới

- Official Figma MCP `get_design_context` đã đọc thành công ba node canonical trong file `hdy2sOZk6rfjKXKDJ9HW9y`: Map `20:386`, Dress `20:565`, Packing `23:312`; session `08774a83-2711-498a-b9a4-11ac9f6b4c0d`. [Ảnh Map](evidence/figma-official/20-386.png) và [ảnh Packing](evidence/figma-official/23-312.png) đã lưu từ inventory. Dress `768:8228` là proposal SRS, không thay node canonical; Web402 `781:6748` chỉ là companion.
- Figma Map có search/list, status chips, map/marker/detail và chọn địa điểm. Dress có scope tabs, outfit cards/ảnh minh họa và editor phải. Packing có tiến độ, filter, category rows, checkbox, add và row actions. Đây là visual source; ảnh/nội dung mẫu không phải dữ liệu Gateway.
- Gateway hiện chỉ có Trip+Plan read projection cho cả ba route. Map/Dress dùng `useTripPlanSnapshot` + `TripPlanBoundary`; Packing chỉ cho write khi `previewEnabled`. Không có Gateway Map/Dress/Packing mutation độc lập. Preview Map/Dress/Packing giữ nguyên local draft/provider/mock behavior. [Contracts](INTEGRATION_CONTRACTS.md), [spec](ROUTE_GAPS_SPEC.md), [delta register](DESIGN_DELTAS.md).

## Phương án xin duyệt từng phần của XRT04

| Mã | Điều chỉnh cụ thể ở Gateway Web | Giới hạn bắt buộc |
|---|---|---|
| CP07-M01 | Map giữ banner và bố cục danh sách trái / vùng bản đồ phải theo `20:386`. Danh sách chỉ gồm `selectedLocations` thực, search/filter cục bộ ghi rõ phạm vi đã tải; trạng thái trong lịch lấy từ activity tham chiếu location. Vùng phải dùng map provider có cấu hình với tọa độ hợp lệ; nếu thiếu provider/tọa độ thì hiển thị trạng thái không khả dụng và chi tiết địa điểm dạng chữ. | Không lấy Google Places Preview hoặc danh sách “chưa chọn” làm dữ liệu Gateway; không pin/route/khoảng cách giả, không checkbox thêm/xóa hoặc “Lưu” khi không có API. |
| CP07-D01 | Dress giữ banner, lựa chọn phạm vi và cards theo `20:565`. Card dùng đúng label, description/publicDescription, scope TRIP/DAY/ACTIVITY và ngày/hoạt động từ Plan. Vùng editor phải được thay bằng panel “Chỉ xem / chưa hỗ trợ thêm, sửa” cùng chiều rộng/nhịp layout; lọc phạm vi vẫn là thao tác đọc cục bộ. | Không gán ảnh phối đồ, bảng màu, tag hoặc member từ mẫu Figma cho dress code thật; không upload/AI/apply/save. Preview editor riêng không bị thay. |
| CP07-P01 | Packing giữ banner, tiến độ, bộ lọc và danh sách theo category của `23:312`. Gateway trình bày completion như trạng thái đọc được, thay checkbox/add/row action bằng nhãn “Chỉ xem” và giải thích khả năng. Preview vẫn có add/edit/toggle cục bộ như hiện tại. | Không báo đã lưu lên server khi người dùng chỉ xem; không bật mutation Gateway. Count/progress, quantity, assignee, due chỉ lấy từ Plan thật và xử lý null rõ ràng. |

Responsive Web 1440/820/402/320/short-height sẽ giữ thứ tự nội dung chính rồi panel phụ, keyboard/focus/reduced motion và không tràn ngang. Chỉ thay màu/font/motion/ảnh khác nguồn nếu có quyết định riêng và bằng chứng phù hợp; PLN06 của CP06 vẫn pending.

## Sau quyết định D36

W01 approval/scope/source/contract audit được hoàn thành. W02–W04 có thể triển khai đúng ba hàng được duyệt; mọi khác biệt ngoài giới hạn này vẫn cần review riêng.
