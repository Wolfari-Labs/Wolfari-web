# ĐÁNH GIÁ CHUYÊN SÂU & TOÀN DIỆN GIAO DIỆN WOLFARI WEB
*Góc nhìn từ trải nghiệm con người thực tế, tâm lý học hành vi (UX Psychology) và chuẩn mực thiết kế sản phẩm số (Digital Product Design)*

---

## LỜI NÓI ĐẦU: TIẾP CẬN DƯỚI GÓC NHÌN CON NGƯỜI THẬT

Khi một người dùng mở một ứng dụng lên kế hoạch du lịch như **Wolfari**, họ không tìm kiếm một bảng tính Excel hay một phần mềm quản lý công việc văn phòng (Jira, Trello). Họ đang mang trong mình:
1. **Sự háo hức, mong chờ**: Cảm xúc về một kỳ nghỉ sắp tới cùng người yêu, gia đình hoặc nhóm bạn thân.
2. **Sự lo âu, mệt mỏi tiềm ẩn**: Nỗi sợ trễ chuyến bay, quên đồ đạc, lịch trình quá dày làm kiệt sức, hay sự ngại ngùng tế nhị khi chia tiền bạc ("ai nợ ai", "thủ quỹ tính nhầm").

Một giao diện du lịch xuất sắc là giao diện **tiếp thêm năng lượng cho sự hào hứng** và **xóa tan nỗi âu lo điều phối**. 

Tài liệu này không lặp lại những báo cáo kiểm thử kỹ thuật khô khan (pass/fail unit test, mã token CSS), mà soi chiếu trực tiếp vào **từng màn hình, từng hình ảnh, từng nút bấm, từng khoảng trống** để trả lời câu hỏi cốt tử: 
> *“Một con người bằng xương bằng thịt khi nhìn vào và thao tác trên giao diện này sẽ cảm thấy như thế nào?”*

---

## PHẦN I. HÀNH TRÌNH CẢM XÚC TỔNG THỂ (THE EMOTIONAL JOURNEY)

### 1. Điểm chạm đầu tiên: Cảm xúc nhen nhóm rất tốt (Aesthetic & Charm)
- **Vibe tổng thể**: Tông màu xanh biển kết hợp xanh ngọc và nắng vàng mang lại cảm giác mát mẻ, tự do của biển miền Trung (Đà Nẵng, Nha Trang, Phú Quốc).
- **Linh vật chú sói Wolfari**: Chú sói chibi cầm cuốn sổ hành trình, đội mũ phiêu lưu là một tài sản hình ảnh (brand asset) cực kỳ đắt giá. Nó biến ứng dụng từ một "công cụ vô hồn" thành một "người bạn đồng hành". Các chi tiết phong cách scrapbook (ảnh chụp polaroid kẹp giấy, ghim băng dính màu pastel, mũi tên nét đứt vẽ tay) khơi gợi lại thói quen dán nhật ký du lịch thời trẻ.

### 2. Nhưng cú va chạm thực tế: Sự giằng co phong cách và rào cản thao tác
Ngay sau ấn tượng ban đầu dễ thương, người dùng bước vào các tác vụ thực tế và bắt đầu gặp những điểm "hẫng":
- **Sự phân liệt phong cách (Visual Schizophrenia)**: Bên ngoài landing page và thẻ danh sách thì thơ mộng, thủ công (scrapbook, ảnh dán); nhưng khi bước vào bên trong chuyến đi (*Lịch trình, Quỹ nhóm, Thành viên*), giao diện đột ngột biến thành một dashboard văn phòng phẳng lì, nghiêm nghị với những khối bo góc trắng toát và các bảng biểu khô khan.
- **Bệnh "Nghiện Banner" (Banner-heavy layout)**: Trên màn hình máy tính thông thường, banner phong cảnh choán hết nửa trên màn hình. Mỗi lần chuyển tab là một lần phải cuộn chuột dài để tìm nơi bắt đầu làm việc.
- **Rào cản ngôn ngữ kỹ thuật**: Nhiều chỗ vẫn dùng ngôn ngữ của lập trình viên thay vì ngôn ngữ đời thường (ví dụ: `Asia/Ho_Chi_Minh`, `OWNER_ONLY`, `ALL_MEMBERS`, mật khẩu bắt buộc 15 ký tự).

---

## PHẦN II. SOI KỸ TỪNG MÀN HÌNH, TỪNG ẢNH & TỪNG CHI TIẾT CỤ THỂ

---

### 1. Trang chủ đón khách (Landing Page — `/`)
*(Đối chiếu hình ảnh: `home-guest-corrected-1440.png`, `768-5376.png`, `home-guest-402.png`)*

#### Cảm nhận trực quan
- **Nửa trên (Hero Section)**: Rất cuốn hút. Tiêu đề viết tay uốn lượn *"Cho những chuyến đi thật đẹp"* kết hợp với cụm ảnh polaroid phong cảnh biển tạo cảm giác muốn xách balo lên và đi ngay lập tức. Nút bấm *"Bắt đầu ngay"* màu xanh đại dương nổi bật trên nền trời xanh pastel.
- **Khối tính năng ("Tất cả những gì bạn cần trong một nơi")**: 6 icon tính năng bố trí tròn trịa, màu sắc dịu mắt. Hình chú sói đọc sách ở giữa đóng vai trò người dẫn chuyện rất duyên.

#### Hạt sạn dưới góc nhìn con người thật
1. **Mockup thiết bị gây hiểu lầm tai hại (Marketing Mismatch)**:
   - Trong khối *"Xem trước trải nghiệm của bạn"*, giao diện đặt 2 chiếc iPhone đời mới bên cạnh một chiếc laptop MacBook, kèm câu: *"Dù là trên web hay điện thoại, Wolfari luôn đồng hành cùng bạn mọi lúc, mọi nơi"*.
   - **Tâm lý người dùng**: Một người trẻ truy cập trang này trên điện thoại sẽ ngay lập tức kéo xuống tìm nút *"Tải trên App Store"* hoặc *"Tải trên Google Play"*. Nhưng thực tế sản phẩm là **Web-only**, không có app native. Việc vẽ 2 chiếc iPhone với giao diện mobile app riêng biệt tạo ra một kỳ vọng ảo, khiến người dùng cảm giác bị "lừa nhẹ" khi phát hiện ra không có ứng dụng di động để cài đặt.
2. **Nút "Xem trước" thiếu tương tác thực**:
   - Khối *"Những hành trình đang được lưu lại"* trưng bày 4 tấm card rất đẹp: *Đà Nẵng – Hội An, Phú Quốc, Đà Lạt, Sài Gòn*.
   - **Tâm lý người dùng**: Người ta sẽ tò mò click vào xem thử lịch trình mẫu của Đà Nẵng xem chuyến đi đó ăn gì, chơi ở đâu. Nhưng hiện tại các thẻ này chỉ là ảnh chụp phẳng, không click mở xem được. Sự tò mò bị chặn đứng lại.
3. **Chân trang (Footer) cụt lủn**:
   - Ở bản dựng demo, footer chỉ có một dòng chữ xám nhạt *"UI preview · Dữ liệu minh họa"*. Không có thông tin giới thiệu đội ngũ, liên hệ, chính sách hay các liên kết mạng xã hội quen thuộc. Cảm giác trang web chưa hoàn thiện, thiếu sự an tâm về mặt bảo mật thông tin cá nhân.

---

### 2. Luồng Xác thực (Đăng nhập / Đăng ký — `/login`, `/register`)
*(Đối chiếu hình ảnh: `login-fixture-1440.png`, `register-invalid-fixture-402.png`)*

#### Cảm nhận trực quan
- Thiết kế 2 cột: Bên trái là tranh kỷ niệm với chú sói và ảnh biển, bên phải là form đăng nhập màu trắng bo góc mềm mại. Cảm giác bước vào một câu lạc bộ du lịch thân thiện chứ không phải đăng nhập vào cổng thông tin thuế.

#### Hạt sạn dưới góc nhìn con người thật
1. **Cơn ác mộng: Mật khẩu tối thiểu 15 ký tự!**
   - Hãy nhìn dòng chữ đỏ ở màn hình đăng ký: *"Mật khẩu cần từ 15 đến 128 ký tự."*
   - **Tâm lý con người**: Người dùng đang hào hứng muốn rủ bạn đi chơi, bỗng nhiên bị bắt phải nghĩ ra một mật khẩu dài ít nhất 15 chữ cái! Đây là tiêu chuẩn khắt khe thường chỉ áp dụng cho tài khoản ngân hàng hoặc hệ thống bảo mật cấp doanh nghiệp. Với một ứng dụng du lịch cho giới trẻ, quy định này sẽ khiến **trên 50% người dùng bỏ cuộc ngay tại bước đăng ký**. Tiêu chuẩn hợp lý cho con người chỉ nên là 8 ký tự.
2. **Lỗi đè chữ ngớ ngẩn trên Mobile (Skip-link Bug)**:
   - Ở màn hình `register-invalid-fixture-402.png`, một khối chữ trắng viền xanh *"Đến nội dung chính"* xuất hiện trôi lơ lửng, đè bẹp lên ô nhập "Họ và tên" và dòng "50 ký tự".
   - **Cảm giác**: Trông như một lỗi giao diện vỡ nét sơ đẳng. Người dùng phổ thông không biết đó là nút hỗ trợ người khiếm thị (accessibility skip-link), họ chỉ thấy trang web bị lỗi code đè chữ.
3. **Dòng chú thích dập tắt cảm xúc**:
   - *"Bản xem trước giao diện. Thông tin đăng nhập không được gửi và không tạo phiên truy cập thật"*. Câu này xuất hiện ngay dưới nút bấm chính. Nếu đây là sản phẩm cho người dùng thật thử nghiệm, dòng chữ này khiến họ hoang mang: *"Ủa vậy tôi đăng ký làm gì khi tài khoản không có thật?"*.

---

### 3. Danh sách chuyến đi của tôi (`/trips`)
*(Đối chiếu hình ảnh: `list-fixture-1440.png`)*

#### Cảm nhận trực quan
- **Tuyệt đẹp và đầy cảm hứng**: Đây là một trong những màn hình làm tốt nhất phong cách "sổ tay lữ hành".
- Các tấm card chuyến đi được thiết kế như tấm bưu thiếp hoặc trang nhật ký với viền giấy ấm áp, bức ảnh phong cảnh đại diện, ngày đi rõ ràng, kèm icon vương miện cho *"Chủ chuyến"* và nhãn *"Thành viên"*.
- Banner phía trên có chú sói bay cùng máy bay giấy và câu nói dễ thương: *"Việt Nam còn nhiều nơi để khám phá!"*.

#### Hạt sạn dưới góc nhìn con người thật
1. **Nút "+ Tạo chuyến đi" bị "lạc lõng"**:
   - Nút hành động quan trọng nhất trang lại nằm tít góc trên bên phải của banner tranh vẽ, nền xanh đậm chìm vào nền trời xanh lơ.
   - Khi mắt người dùng quét theo chữ F tự nhiên (từ góc trái sang phải rồi xuống dưới), họ dễ bỏ qua nút này và nhìn thẳng vào thanh tìm kiếm bên dưới.
2. **Thanh tìm kiếm và bộ lọc quá dài**:
   - Thanh search, dropdown "Vai trò", "Thời gian", nút "Bộ lọc", cùng 5 tab trạng thái (*Tất cả, Sắp tới, Đang diễn ra, Đã kết thúc, Đã lưu trữ*) và dropdown "Sắp xếp" tạo thành một cụm điều khiển tới **3 tầng thanh công cụ**.
   - Với một người dùng bình thường chỉ có từ 2 đến 5 chuyến đi trong năm, bộ công cụ lọc này là quá thừa thãi và gây rối mắt (over-engineered).
3. **Nút tim "Yêu thích" gây khó hiểu**:
   - Ở góc dưới mỗi ảnh thẻ có một icon trái tim viền trắng. Khi nhìn thấy tim, người ta nghĩ ngay: *"Bấm tim để làm gì? Lưu chuyến đi yêu thích hay ai thả tim cho chuyến đi này?"*. Nhưng khi tương tác không có phản hồi số lượng tim hay danh mục lọc riêng cho mục yêu thích.

---

### 4. Màn hình Tạo chuyến đi mới (`/trips/new`)
*(Đối chiếu hình ảnh: `gateway-create-1440x960.png`, `gateway-success-1440.png`)*

#### Cảm nhận trực quan
- Bố cục 2 cột cân đối: Bên trái là biểu mẫu nhập liệu, bên phải là khung bản đồ phụ trợ.
- **Khoảnh khắc xuất sắc**: Hộp thoại popup *"Chuyến đi đã sẵn sàng"* (`gateway-success-1440.png`) với hình ảnh chú sói nháy mắt, vẫy tay chào chào mừng hành trình mới. Đây là một điểm chạm cảm xúc (delight moment) cực kỳ tốt, đem lại cảm giác thành tựu ngay lập tức.

#### Hạt sạn dưới góc nhìn con người thật
1. **Cột bản đồ bên phải: "Treo đầu dê bán thịt chó"**:
   - Cột bên phải chiếm gần nửa màn hình hiển thị một khung bản đồ vẽ cách điệu, nhưng bên dưới lại ghi:  
     *"Bản đồ điểm đến. Không cần chọn điểm đến để bắt đầu chuyến đi... Chưa hỗ trợ chọn điểm đến khi tạo chuyến đi. Bản đồ ở đây chỉ là hình minh họa."*
   - **Tâm lý con người**: Người dùng sẽ tự hỏi: *"Nếu không dùng được thì bày ra đây làm gì cho chật màn hình?"*. Cảm giác giống như bước vào một nhà hàng sang trọng nhưng bồi bàn bảo món trên menu chỉ in cho đẹp chứ bếp không nấu.
   - **Giải pháp con người**: Nếu chưa có dữ liệu bản đồ, hãy thay cột phải bằng: Gợi ý các điểm check-in hot nhất mùa này, thời tiết dự kiến, hoặc các câu quote truyền cảm hứng du lịch.
2. **Múi giờ gõ tay thô kệch**:
   - Ô Múi giờ hiển thị chữ: `Asia/Ho_Chi_Minh` kèm ghi chú *"Ví dụ: Asia/Ho_Chi_Minh"*.
   - **Tâm lý con người**: Đây là tư duy của coder cơ sở dữ liệu. Người dùng phổ thông ở Việt Nam chỉ biết "Giờ Hà Nội" hoặc "GMT+7". Việc bắt họ nhìn hoặc nhập một chuỗi ký tự máy tính có dấu gạch dưới làm giảm đi sự thân thiện của ứng dụng.

---

### 5. Bảng Tổng quan chuyến đi (`/trips/:id`)
*(Đối chiếu hình ảnh: `overview-fixture-1440.png`, `overview-fixture-402.png`)*

#### Cảm nhận trực quan
- Tấm ảnh bìa toàn cảnh thành phố biển (Đà Nẵng – Hội An) cắt góc lượn sóng màu nước rất nghệ thuật.
- Có 4 thẻ tóm tắt nhanh: *Lịch trình ngày đầu, Thời tiết, Ngân sách/Quỹ nhóm, Tiến độ Packing list*. Thanh tiến độ 8/12 món (67%) màu xanh lá tạo cảm giác rõ ràng, trực quan.

#### Hạt sạn dưới góc nhìn con người thật
1. **Banner chiếm quá nhiều không gian (The Fold Problem)**:
   - Trên màn hình 1440×960 hoặc laptop 1366×768, sau khi nhìn xong thanh điều hướng trên cùng, breadcrumb và tấm banner to, người dùng phải cuộn chuột xuống thì mới thấy được danh sách hoạt động ngày 1.
2. **Cảm giác hụt hẫng vì các thẻ rỗng**:
   - Thẻ *Thời tiết*: "Chưa khả dụng".
   - Thẻ *Ngân sách/Quỹ nhóm*: "Chưa khả dụng".
   - Thẻ *Bản đồ hành trình*: "Bản đồ hành trình sẽ xuất hiện khi có dữ liệu địa điểm".
   - Thẻ *Theo dõi giá vé*: "Chưa khả dụng".
   - **Cảm giác con người**: Trong tổng số 6 khối nội dung trên màn hình, có tới 4 khối thông báo "Chưa khả dụng" hoặc trống trơn. Người dùng cảm thấy như đang đứng trong một ngôi nhà xây dở chỉ có mỗi khung cửa sổ.
3. **Thẻ góc dưới phải vô dụng**:
   - Thẻ *"Mỗi chuyến đi là một câu chuyện..."* với hình vẽ sóng biển màu nước trông rất thơ mộng, nhưng nó chiếm nguyên một góc phải mà không mang lại bất kỳ giá trị thông tin hay hành động nào. Khi quản lý một chuyến đi thực tế, người ta cần công cụ, không cần một tấm bưu thiếp chiếm chỗ.

---

### 6. Trái tim của ứng dụng: Màn hình Lịch trình (`/trips/:id/plan`)
*(Đối chiếu hình ảnh: `20-236.png`, `439-2028.png`, `439-2497.png`, `plan-1366x520.png`)*

#### Cảm nhận trực quan
- **Tính năng đỉnh cao nhất của Wolfari**: Hãy nhìn vào thiết kế trục thời gian (Timeline) ở hình `20-236.png`:
  - Mỗi hoạt động có số thứ tự tròn xanh (1, 2, 3, 4), nối với nhau bằng đường line dọc.
  - Khung giờ rõ ràng: `08:00 - 10:30`, `11:30 - 13:00`.
  - Icon phân loại hoạt động (núi = tham quan, dao nĩa = ăn uống, dù = bãi biển, đền chùa = di tích).
  - **Điểm sáng giá nhất**: Các nhãn xe ô tô ở giữa 2 chặng:  
    `🚗 20 phút di chuyển (12 km)`  
    `🚗 15 phút di chuyển (7 km)`  
  - Đây chính là điều mà mọi người lên lịch trình cần nhất: Họ không chỉ muốn biết đi đâu, mà muốn biết **từ điểm A sang điểm B mất bao lâu để không bị trễ giờ ăn trưa hay bắt chuyến bay!**
- Hàng 4 chỉ số trên đỉnh: *6 hoạt động, 6 địa điểm, ~9h15 trải nghiệm, 1h20 di chuyển (tổng)* mang lại một bức tranh toàn cảnh cực kỳ khoa học.

#### Hạt sạn dưới góc nhìn con người thật
1. **Thảm họa hiển thị trên màn hình laptop thấp (`plan-1366x520.png`)**:
   - Khi nhìn vào ảnh chụp thực tế trên màn hình chiều cao 520px: Toàn bộ danh sách hoạt động **hoàn toàn biến mất khỏi tầm mắt**!
   - Tất cả những gì người dùng thấy chỉ là: Navbar $\to$ Banner phong cảnh $\to$ Tiêu đề Lịch trình $\to$ Dải tab ngày. Người dùng thậm chí không biết là có danh sách các hoạt động bên dưới nếu không tiện tay cuộn chuột.
2. **Cạnh tranh diện tích khi mở bản đồ hoặc kho hoạt động (`439-2028.png`, `439-2497.png`)**:
   - Khi người dùng bấm nút *"Hiện bản đồ"* hoặc mở bảng *"Đã chọn · Chưa xếp lịch"*, màn hình bị chia đôi (Split Panel).
   - Lúc này, cột lịch trình bên trái bị co hẹp lại, các ảnh thumbnail địa điểm bị ép nhỏ, tên địa chỉ bị ngắt dòng lộn xộn. Trải nghiệm đọc lịch trình đột ngột trở nên bí bách.
3. **Nút "Thêm ngày" nằm ngang hàng với tab ngày**:
   - Tab Ngày 1, Ngày 2, Ngày 3 có nút `+ Thêm ngày` nằm ngay bên cạnh. Điều này rất tiện, nhưng nếu chuyến đi dài 10 ngày thì thanh tab này sẽ tràn màn hình và buộc người dùng phải cuộn ngang – một thao tác rất khó chịu trên chuột máy tính bàn.

---

### 7. Quản lý Quỹ nhóm (`/trips/:id/fund`)
*(Đối chiếu hình ảnh: `528-4683.png`, `528-5059.png`)*

#### Cảm nhận trực quan
- **Rất văn minh và minh bạch**: Vấn đề tiền bạc trong các chuyến đi chơi nhóm ở Việt Nam luôn là chuyện nhạy cảm. Wolfari đã giải quyết điều này bằng 4 khối số to, rõ ràng:
  - *Ngân sách mục tiêu*: **9.000.000đ**
  - *Đóng góp đã ghi nhận*: **7.000.000đ**
  - *Đã chi từ quỹ*: **6.250.000đ**
  - *Quỹ có thể sử dụng*: **750.000đ** (xanh ngọc an tâm).
- Bảng chi tiết từng thành viên (*Trang Nguyễn đã nộp, Hà đã nộp, Quyên thiếu 500.000đ*) được thể hiện với màu cam cảnh báo tinh tế, không mang tính phán xét nhưng đủ rõ để nhắc nhở.

#### Hạt sạn dưới góc nhìn con người thật
1. **Dòng tuyên bố từ chối trách nhiệm gây hoang mang**:
   - Dòng chữ: *"Wolfari chỉ ghi nhận và đối chiếu dữ liệu; không giữ hoặc chuyển tiền thật"* nằm ngay cạnh nút trạng thái quỹ.
   - Về mặt pháp lý là đúng, nhưng về mặt thiết kế, vị trí đặt dòng này hơi lơ lửng, tạo cảm giác app đang "chối bỏ trách nhiệm" ngay khi người dùng vừa mở trang tài chính.
2. **Cột tạo đợt đóng góp bên phải chiếm chỗ vô ích**:
   - Khung "Tạo đợt đóng góp" nằm cố định bên phải màn hình. Nhưng trong cả chuyến đi, người ta chỉ tạo đợt đóng góp 1 hoặc 2 lần, trong khi họ phải tra cứu danh sách thu chi hàng chục lần mỗi ngày.
   - Việc để form này chiếm vĩnh viễn 1/3 chiều ngang màn hình làm bảng danh sách thu chi bị ép chật chội một cách không cần thiết.

---

### 8. Thành viên & Lời mời (`/trips/:id/members`)
*(Đối chiếu hình ảnh: `768-7492.png`, `475-2294.png`, `299-2010.png`)*

#### Cảm nhận trực quan
- Màn hình nhận lời mời tham gia (`299-2010.png`): Chú sói cầm sách, nền núi mờ, thiệp mời ghi rõ tên người mời (Trang Nguyễn) và vai trò. Rất trang nhã và tạo sự tin cậy.

#### Hạt sạn dưới góc nhìn con người thật
1. **Quả bom nổ chậm: Nút "Chuyển Owner" ở khắp mọi nơi!**
   - Hãy nhìn vào danh sách bạn bè (`768-7492.png`): Cạnh tên mỗi người bạn (Hà, Quyên, Tân), nút hành động duy nhất và to nhất là nút **"Chuyển Owner"**!
   - **Tâm lý con người**: Trong một chuyến đi chơi, việc chuyển quyền trưởng nhóm là chuyện cực kỳ hiếm khi xảy ra. Người ta cần những nút như: *"Nhắn tin"*, *"Xem các khoản đã đóng"*, hoặc cùng lắm là *"Xóa khỏi nhóm"*. Việc bày nút "Chuyển Owner" ngay mặt tiền tạo tâm lý bất an cho trưởng nhóm vì sợ lỡ tay bấm nhầm là mất quyền quản lý chuyến đi!
2. **Cột phải như một văn bản pháp lý khô khan**:
   - Toàn bộ cột bên phải là các định nghĩa: *Owner là gì, Fund Holder là gì, PlanEditPolicy là gì, Khi chuyển Owner thì điều gì xảy ra...*
   - Một nhóm bạn rủ nhau đi Đà Lạt không phải là một công ty cổ phần tổ chức đại hội cổ đông. Cách viết và trình bày này quá nặng tính pháp lý và kỹ thuật, tạo khoảng cách tâm lý xa lạ với người dùng thông thường.

---

### 9. Cài đặt chuyến đi (`/trips/:id/settings`)
*(Đối chiếu hình ảnh: `settings-fixture-1440.png`, `settings-edit-fixture-1440.png`)*

#### Hạt sạn dưới góc nhìn con người thật: "Sự bất lực của nút Chỉnh sửa"
- Khi người dùng vào trang Cài đặt và bấm vào nút **"Chỉnh sửa thông tin"**, họ kỳ vọng sửa được ngày đi hoặc điểm đến.
- Nhưng nhìn vào ảnh `settings-edit-fixture-1440.png`, một loạt ô bị tô xám và hiện dòng chữ đỏ/xám lặp đi lặp lại:
  - *Điểm đến: Chưa hỗ trợ chỉnh sửa trong phiên bản này.*
  - *Ngày bắt đầu: Chưa hỗ trợ chỉnh sửa trong phiên bản này.*
  - *Ngày kết thúc: Chưa hỗ trợ chỉnh sửa trong phiên bản này.*
  - *Ngân sách dự kiến: Chưa hỗ trợ chỉnh sửa trong phiên bản này.*
- **Cảm giác con người**: Sự thất vọng tràn trề! Người dùng sẽ bực mình thốt lên: *"Nếu cái gì cũng không cho sửa thì các bạn sinh ra nút Chỉnh sửa này để làm gì?"*. 
- Nếu phiên bản hiện tại Backend chỉ cho sửa Tên chuyến đi và Mô tả, thì **chỉ nên hiển thị 2 ô đó để nhập**, còn các thông tin khác hãy để dạng nhãn tĩnh (read-only label), tránh bày ra ô input rồi khóa lại kèm thông báo từ chối.

---

### 10. Thanh điều hướng & Menu trên Mobile (Responsive Drawer — 402px)
*(Đối chiếu hình ảnh: `trip-drawer-402.png`, `overview-fixture-402.png`, `not-found-402.png`)*

#### Cảm nhận trực quan
- Ngăn kéo (Drawer) mở ra mượt mà từ bên trái, nền trắng sạch sẽ, icon thẳng hàng.

#### Hạt sạn dưới góc nhìn con người thật
1. **Bị "nhốt" trong chuyến đi (No Exit Strategy)**:
   - Hãy nhìn vào `trip-drawer-402.png`: Menu chỉ liệt kê 9 mục bên trong chuyến đi (*Tổng quan, Bản đồ, Lịch trình, Dress code, Packing list, Thành viên, Quỹ nhóm, Giá vé, Cài đặt*).
   - **Tâm lý người dùng**: Một người đang ở trong chuyến đi Đà Nẵng, muốn quay về *"Danh sách chuyến đi của tôi"* để xem lại chuyến đi Phú Quốc tháng sau, hoặc muốn bấm vào trang cá nhân để đổi mật khẩu/đăng xuất thì làm thế nào? Trong menu này hoàn toàn **không có nút quay về "Chuyến đi của tôi"** và cũng **không có avatar/thông tin tài khoản**. Người dùng bị mắc kẹt hoàn toàn bên trong chuyến đi hiện tại!
2. **Trang 404 lạnh lùng**:
   - Trang báo lỗi 404 (`not-found-402.png`) chỉ có mỗi dòng chữ: *"Không tìm thấy trang. Chọn một mục trong thanh điều hướng để tiếp tục"* và nút *"Về trang chủ"*.
   - Với một ứng dụng có linh vật đáng yêu như Wolfari, việc không cho chú sói xuất hiện với vẻ mặt gãi đầu ngơ ngác kèm câu: *"Ái chà, bạn lạc đường rồi!"* là một sự bỏ phí cảm xúc rất đáng tiếc.

---

## PHẦN III. ĐÁNH GIÁ DESIGN TOKENS, MÀU SẮC & CÔNG THÁI HỌC THỊ GIÁC

### 1. Độ tương phản màu sắc (Color Contrast & Accessibility)
- **Nền trang (`#f4fbfe`) và Nền thẻ (`#ffffff`)**:
  - Tỉ lệ tương phản giữa màu xanh lơ nhạt của nền và màu trắng tinh của thẻ card là cực kỳ thấp.
  - Trên các màn hình máy tính phổ thông (màn hình TN hoặc IPS giá rẻ với độ sáng dưới 250 nits), người dùng hầu như không phân biệt được đâu là mép thẻ và đâu là nền trang. Toàn bộ giao diện bị bệt thành một mảng sáng loáng, gây mỏi mắt khi làm việc buổi tối.
- **Màu chữ phụ (`#4f7093`)**:
  - Dùng cho các ghi chú, ngày tháng, địa chỉ phụ ở cỡ chữ 13px. Màu xám xanh này trên nền trắng chỉ vừa ngấp nghé ngưỡng tối thiểu WCAG AA. Khi ra ngoài trời nắng xem điện thoại, chữ này sẽ hoàn toàn bị "tàng hình".

### 2. Sự bất hợp lý của Linh vật sói ở Sidebar Desktop
- Ở chân sidebar bên trái có hình vẽ chú sói ngồi đọc sách kèm câu *"Cùng bạn đi xa hơn!"* và nút *"<< Thu gọn"*.
- Hình vẽ này cao tới gần 200px. Trên các màn hình laptop chiều cao 768px, việc "nhồi" chú sói vào góc này khiến thanh menu điều hướng bị dài quá cỡ, đẩy nút **Cài đặt** xuống sát đáy màn hình, buộc sidebar phải xuất hiện thanh cuộn riêng. Đây là lỗi kinh điển: **hy sinh công năng vì yếu tố trang trí**.

---

## PHẦN IV. BẢNG TỔNG KẾT & CHẤM ĐIỂM TRẢI NGHIỆM CON NGƯỜI

| Tiêu chí | Điểm (Thang 10) | Nhận xét chân thật |
| :--- | :---: | :--- |
| **Ấn tượng thị giác (Visual Appeal)** | **8.5** | Màu sắc đẹp, linh vật dễ thương, phong cách scrapbook rất có hồn và gợi cảm hứng xê dịch. |
| **Cấu trúc thông tin (Information Architecture)** | **8.0** | Chia tách các module chuyến đi (Lịch trình, Quỹ, Thành viên, Đồ đạc) rất khoa học và logic. |
| **Tính tiện dụng tác vụ (Task Ergonomics)** | **6.5** | Banner quá to đẩy nội dung xuống dưới fold; form tạo chuyến và cài đặt còn gượng gạo; nhiều khoảng trống thừa. |
| **Độ chân thực & Tin cậy (Truthfulness)** | **8.5** | Rất trung thực, không dùng số liệu ảo để lừa người dùng; tuy nhiên cần khéo léo hơn để không biến thành "cảm giác dang dở". |
| **Công thái học Mobile (Mobile Usability)** | **6.0** | Thiếu đường dẫn thoát khỏi chuyến đi trên menu mobile; lỗi đè chữ skip-link; bảng biểu chật chội. |
| **Tâm lý học hành vi (UX Psychology)** | **6.5** | Mật khẩu 15 ký tự gây ức chế; nút Chuyển Owner gây hoang mang; các thông báo từ chối sửa gây hụt hẫng. |
| **TỔNG KẾT TOÀN DIỆN** | **7.3 / 10** | **Một sản phẩm có tiềm năng rất lớn về mặt cảm xúc và ý tưởng, nhưng cần gọt giũa nhiều về mặt công thái học và tinh tế hóa trải nghiệm người dùng.** |

---

## PHẦN V. 5 ĐỀ XUẤT CẢI TIẾN ĐỂ GIAO DIỆN "CHẠM ĐẾN TRÁI TIM"

1. **Thu nhỏ Banner khi làm việc (Sticky Compact Workspace Header)**:
   - Khi người dùng ở trang Lịch trình hoặc Quỹ nhóm, tấm ảnh phong cảnh chỉ nên hiển thị đầy đủ lúc vừa vào trang. Khi bắt đầu cuộn chuột xuống để làm việc, banner nên tự động thu gọn lại thành một thanh bar mỏng (cao khoảng 50px) gắn trên đỉnh gồm: *Tên chuyến đi · Ngày · Nút Chỉnh sửa*. Nhường trọn vẹn 85% chiều cao màn hình cho việc sắp xếp lịch trình và quản lý thu chi.
2. **Hạ chuẩn mật khẩu xuống 8 ký tự**:
   - Đừng biến một ứng dụng đi chơi thành cổng bảo mật tài chính quốc tế. Hãy cho phép mật khẩu từ 8 ký tự để người dùng dễ dàng rủ rê bạn bè tạo tài khoản chỉ trong 30 giây.
3. **Thêm lối thoát trên Mobile Drawer**:
   - Bổ sung ngay 2 mục ở đầu hoặc cuối Drawer mobile:  
     - `⬅ Tất cả chuyến đi của tôi`  
     - `Tài khoản: [Tên người dùng] · Đăng xuất`
4. **"Giấu" nút Chuyển Owner vào menu 3 chấm**:
   - Thay vì bày nút "Chuyển Owner" to tướng cạnh tên từng người bạn, hãy thay bằng nút 3 chấm `...` với các lựa chọn: *Nhắn tin, Xem chi tiêu, Phân công công việc, và mục Chuyển quyền trưởng nhóm (chữ đỏ có cảnh báo xác nhận)*.
5. **Biến trang 404 thành điểm chạm đáng yêu**:
   - Đưa hình ảnh chú sói Wolfari cầm tấm bản đồ lộn ngược, mắt tròn xoe với thông điệp hài hước:  
     *"Úi, hình như chúng mình đi lạc vào rừng rồi! Để Wolfari dẫn bạn quay lại trang chủ nhé."*

---
*Báo cáo được lập cho mục đích nghiên cứu và nâng cấp trải nghiệm người dùng nội bộ Wolfari Web. Không áp dụng thay đổi mã nguồn hoặc commit.*

