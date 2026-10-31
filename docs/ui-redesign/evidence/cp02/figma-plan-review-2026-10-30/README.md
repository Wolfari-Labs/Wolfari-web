# Kiểm tra lại thiết kế Lịch trình có sẵn —30/10/2026

Yêu cầu người dùng: “BẠN XEM LẠI CHO TÔI TRONG FILE FIGMA. TÔI ĐÃ DES TRANG LỊCH TRÌNH RỒI MÀ.”

## Kết luận

**Trang Lịch trình Web đã có thiết kế và các bố cục liên quan trong file chính thức.** Việc yêu cầu chọn ba ảnh AI ở lượt trước là sai hướng; không phải thiếu thiết kế nguồn. Bỏ selection gate đó, không dùng ảnh AI thay thiết kế người dùng. Không tự diễn giải nhãn CP01 “Cần cải tiến” thành quyền redesign lại.

## Bằng chứng trực tiếp qua Figma MCP

Read-only session `4b9d8dd5-c1dd-4b8f-80ac-52e8fa71bfac`; get_screenshot cho bốn node, tải và mở xem cả bốn PNG ở1440×960. Không enumerate lại toàn file, không sửa canvas. Tên frame đối chiếu register CP01; nội dung dưới đây xác minh bằng ảnh live30/10.

| Frame chính thức | Ảnh kiểm tra mới | Nội dung nhìn thấy |
|---|---|---|
| [20:236 —06 · Lịch trình](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=20-236) | [PNG](20-236.png) | Header/sidebar, trip banner, tabs ngày, summary strip, timeline theo giờ, completion, thumbnails, menu từng activity, Hiện bản đồ/Thêm hoạt động. |
| [439:2028 —06.1 · Chưa xếp lịch](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=439-2028) | [PNG](439-2028.png) | Timeline bên trái và panel “Đã chọn · Chưa xếp lịch” bên phải, search, hai địa điểm minh hoạ, hướng dẫn kéo hoạt động. |
| [439:2497 —06.2 · Bản đồ ngày](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=439-2497) | [PNG](439-2497.png) | Timeline bên trái, “Bản đồ lịch trình ngày1” bên phải, nút Ẩn bản đồ. |
| [768:7123 —06 · Plan · Tham chiếu nguồn](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-7123) | [PNG](768-7123.png) | Bố cục chính nhìn thấy tương ứng20:236; đây cũng là reference đã được mở ở lượt trước. Không phải một yêu cầu làm lại từ đầu. |

## Hướng tiếp tục CP02 đã sửa

- Lấy họ frame Web trên làm visual source cho Plan. Giữ bố cục và thương hiệu người dùng đã thiết kế; không chọn sidebar/day-rail/horizontal-nav mới từ ảnh AI.
- CP02 tiếp tục đối chiếu từng vùng, action và state với Frontend/contracts; ghi chỗ đã có source, chỗ cần bổ sung, chỗ khác capability. Không coi screenshot là bằng chứng prototype/keyboard/mutation đã chạy.
- Những vấn đề responsive/short-height/accessibility cần adaptation phải nêu delta cụ thể trên source hiện có để review, không tự bỏ banner/metric strip hoặc áp hướng compact mới.
- Các giá trị minh hoạ như online presence, travel times, sharing, thêm ngày không tự chứng minh runtime có capability. Giữ contract boundary, không tạo dữ liệu/provider giả để giống hình.
- Đây là xác minh thiết kế có sẵn, không phải nghiệm thu đầy đủ mọi state, không approve CP02/CP03 hoặc cấp quyền sửa Figma/source/Backend. Không chạm evidence CP01 hoặc xoá ba ảnh AI; đánh dấu chúng SUPERSEDED_FOR_DIRECTION.
