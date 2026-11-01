# CP-06 — Quyết định thiết kế Plan còn chờ duyệt

Trạng thái: **APPROVED_CP06_SCOPE theo D33**,31/10/2026 cho từng mã PLN01–05, PLN07 và DLT09 trong bảng dưới. D18 đã duyệt riêng editor giữa màn hình với đủ trường hiện có. CP05 đã APPROVED/DONE theo D32. PLN06 chưa được duyệt.

## Căn cứ trực tiếp

- [Plan Web nguồn 20:236](evidence/cp02/figma-plan-review-2026-10-30/20-236.png) được xác nhận lại qua official Figma MCP ngày31/10: banner → day tabs → dải bốn chỉ số → timeline.
- [Pool 439:2028](evidence/cp02/figma-plan-review-2026-10-30/439-2028.png) và [day-map 439:2497](evidence/cp02/figma-plan-review-2026-10-30/439-2497.png) là **hai trạng thái panel phải thay thế nhau**. Ảnh nguồn từng được lưu từ official file; MCP lượt này chỉ đọc thành công main20:236. Map nguồn là hình minh họa, không chứng minh dữ liệu lộ trình thật.
- [Gateway trước CP06 1440×900](evidence/cp06/source-review/gateway-before-1440.png) là screenshot built HTTP-mock của CP05 (SHA-256 `00E653013C06D5EEDA57B71F9E5E7DA5429BC30D4B2BC61958FF9E490D044F7E`), không phải live Backend. Gateway hiện có banner, heading/status/actions, ALL/POOL/day navigation và thẻ lớn; chưa có dải bốn chỉ số hoặc day-map trong Plan. Preview đã gần nguồn hơn nhưng là local draft.
- [PLAN_SPEC](PLAN_SPEC.md), [DESIGN_DELTAS](DESIGN_DELTAS.md) và [INTEGRATION_CONTRACTS](INTEGRATION_CONTRACTS.md) ràng buộc dữ liệu và hành vi. Không đổi Backend, dependency, Figma hay hành vi Gateway thành fixture.

## Phương án đề xuất, duyệt từng mã

| Mã | Phương án cụ thể cho Gateway Web | Giới hạn bắt buộc |
|---|---|---|
| PLN01 | Đưa day tabs ngay dưới banner đúng thứ tự nguồn. Giữ `Tất cả` và `Chưa chọn ngày` thành hai nút tiện ích trong cùng thanh, đặt sau các ngày; không tự chuyển mặc định ALL sang Ngày1. Day filter dùng được với quyền chỉ đọc, drop vẫn khóa. | Không bỏ ALL/POOL, không đổi day-only/timezone hoặc quyền viết. |
| PLN02 | Panel phải ở chế độ sắp xếp có hai nhóm phân biệt: `Địa điểm đã chọn · chưa xếp` lấy từ `selectedLocations`, và `Hoạt động chưa xếp ngày` lấy từ activities POOL. Chọn địa điểm mở editor tạo activity với địa điểm/tên được điền trước, chỉ lưu khi người dùng xác nhận qua create contract; activity đã lưu vẫn kéo/chuyển ngày như hiện tại. | Không biến selected location thành activity đã lưu, không tạo draft cạnh tranh, không gán thumbnail/giờ giả. |
| PLN03 | `Hiện bản đồ` thay panel phải bằng day-map. Nếu browser map provider có cấu hình và tọa độ hợp lệ, chỉ hiện marker của địa điểm gắn với hoạt động trong ngày; nếu không, hiện trạng thái `Bản đồ nền chưa khả dụng` và danh sách địa điểm/ngày đọc được. Nút đóng trở lại timeline. | Không vẽ đường đi/khoảng cách/thời gian di chuyển giả, không coi hình minh họa là bản đồ thật; map và pool không hiện đồng thời. |
| PLN04 | Giữ dải **bốn ô** như nguồn. Hai ô đầu hiển thị số hoạt động và địa điểm phân biệt theo phạm vi `Cả chuyến`/`Ngày N` đã ghi rõ. Ô `Trải nghiệm` chỉ cộng thời lượng có giờ bắt đầu/kết thúc hợp lệ và ghi rõ phần thiếu; ô `Di chuyển` hiện `— · Chưa có dữ liệu` khi không có provider. Không hiện avatar online, cursor, share hay thêm ngày hoạt động giả. | Không suy số giờ di chuyển từ thứ tự activity; không gọi Trip PATCH hay tạo share link mới. |
| PLN05 | Row timeline dùng type icon/badge và dữ liệu thực. Thiếu cover từ Gateway thì để vùng ảnh vắng hoặc placeholder trung tính, không gán ảnh của địa điểm khác; banner dùng shared TripHero hiện có cho đến quyết định asset riêng. | Không gán ảnh Figma editorial thành ảnh của activity thật. |
| PLN07 | Đặt feedback pending/success/error/conflict/unknown và nút đối chiếu gần timeline; giữ chi tiết lỗi trong editor khi editor mở. Cùng command hook, draft, version/idempotency và recovery hiện tại; không toast-only. | Không tự retry lệnh không xác định, không thêm lifecycle Finance vào Plan. |
| DLT09 | Web hẹp 820/402/320: day tabs cuộn ngang bằng bàn phím, dải chỉ số reflow 2 cột/rồi1 cột, timeline không tràn, panel phụ dùng sheet hiện có, editor D18 phủ đủ chiều rộng ở viewport hẹp và cuộn nội dung ở màn thấp/200% zoom. | Responsive browser Web, không tạo màn/app mobile; giữ focus return, keyboard/touch fallback và reduced motion. |

`PLN06` **chưa xin duyệt**: đo từng cặp màu/target trên runtime sau composition, rồi trình token cụ thể cùng tỷ lệ tương phản trước khi thay. Các vị trí chưa có số liệu sẽ giữ màu/token hiện tại.

## Trạng thái sau D33

User đã chọn “Duyệt PLN01–05, PLN07 và DLT09 theo bảng”. W04 được triển khai đúng phương án và giới hạn trong bảng, không mở rộng sang PLN06 hoặc delta khác. Mọi phần chưa đạt sẽ ghi exception trong CP06 acceptance; không gọi toàn bộ thiết kế là source-matched nếu bằng chứng chưa hỗ trợ.
