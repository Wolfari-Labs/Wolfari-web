# Đối chiếu chi tiết giao diện · 15/10/2026

Mốc trước chỉnh sửa: `fd141bb` trên `ui/members-preview`, lưu đăng nhập demo và tài liệu code pipeline. Nhánh làm việc: `ui/figma-detail-refinement`, tạo từ `develop` rồi fast-forward mốc trên để giữ toàn bộ thay đổi hiện tại.

## Quyết định thiết kế

Người dùng xác nhận **giữ bố cục Home theo Figma, chỉ chỉnh chi tiết**. Không đưa khối chuyến đi sắp tới lên đầu Home desktop. Những lần chỉnh sau cần hỏi trước nếu đổi bố cục lớn, thứ tự khối chính hoặc điều hướng giữa các khu vực sản phẩm.

Figma quyết định hình thức; mô tả dự án, Gateway và domain model quyết định dữ liệu, quyền và hành vi. Phạm vi lượt này là header dùng chung, chi tiết Home, cụm ảnh dùng chung Home/Auth và màu vai trò trên thẻ chuyến đi; có rà hiển thị các route đã triển khai.

## Mapping và thay đổi

| Nguồn | Chi tiết sửa | Web |
| --- | --- | --- |
| [Home `3:28`](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=3-28), header `135:483` | Menu desktop căn giữa viewport từ 1101px; giữ header 76px và cơ chế compact/mobile hiện có | `AppShell` |
| Home hero `34:462` | CTA chính 198px, CTA phụ 226px, cao tối thiểu 52px; vẫn co giãn/xuống dòng theo chiều rộng | `HomePage.module.css` |
| [Collage Home `34:497`](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=34-497), [Auth `298:1951`](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=298-1951) | Tỷ lệ và vị trí postcard, giấy ghi chú, ảnh Đà Lạt/Phú Quốc, caption; chữ co theo canvas 650×470 | `TravelCollage` |
| Home footer `34:676`, signpost `52:533–541` | Khung cảnh nền đúng vị trí, đường bay tách khỏi tiêu đề; thêm chữ Plan / Explore / Go! vào bảng chỉ dẫn có sẵn | `HomePage` |
| [Trip List `3:29`](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari?node-id=3-29) | Chỉ Chủ chuyến dùng màu vàng; Thành viên dùng màu xanh của metadata | `TripCard` |
| Header Guest | “Tính năng” và “Về Wolfari” dẫn tới các phần có thật trên Home, gồm trường hợp đi từ `/login` khi route Home chưa tải | `AppShell`, `HomePage` |

Các asset tiếp tục dùng file local đã có; không dùng screenshot của Figma làm giao diện và không thêm dependency.

## Phản biện theo dự án và backend

- Wolfari phục vụ lập kế hoạch du lịch cá nhân/nhóm nhỏ. Các CTA hiện có giữ đích đến đúng với actor: Guest đến đăng ký, User đến chuyến đi của mình. Không bật tạo/sửa/chia sẻ chỉ vì Figma vẽ nút.
- Gateway `trip-proxy.ts` phân biệt `OWNER` và `MEMBER`; màu vai trò lấy từ membership của từng chuyến đi, không suy từ người xem hoặc Finance.
- Tổng quan tiếp tục ghi “ngày đầu” theo dữ liệu đang đọc, thay vì ngụ ý đó là lịch hôm nay. Weather/Finance/Packing/Price Watch vẫn chưa khả dụng khi chưa có projection.
- Thành viên giữ fallback định danh khi chưa có name/avatar enrichment. Không chép tên minh họa của Figma vào dữ liệu thật; Fund Holder không phải role membership và quyền Plan không cấp quyền Finance.
- Auth tiếp tục phân biệt tài khoản demo fixture với phiên Backend. Production/Gateway vẫn chưa kết nối các adapter nghiệp vụ; lượt này không xác nhận tích hợp API thật.

## Kiểm tra

Rà trực quan Home, Login, Trip List, Overview, Plan, Members và Profile ở 1440×960; kiểm tra các breakpoint desktop/tablet/mobile bằng bộ Playwright hiện có. Không đổi bố cục lớn của các màn hình này.

- `corepack pnpm lint`, `corepack pnpm typecheck`, kiểm tra Prettier các file đổi và `git diff --check`: đạt.
- `corepack pnpm test`: **166/166**, 12 file test.
- `corepack pnpm build` và `corepack pnpm build:preview`: đạt.
- Playwright dùng Chrome có sẵn qua `PLAYWRIGHT_CHROMIUM_EXECUTABLE`: lượt đủ **83/88 đạt**; một lỗi hash từ Login về Home và bốn lỗi kết nối/tải trang khi dùng server preview đang mở. Sau khi sửa hash, **5/5 kịch bản đó chạy lại đạt** trên Vite riêng cổng 5174. Đây là kết quả hai lượt, không phải một lượt 88/88.
- Bộ responsive bao phủ 1440, 1366, 1024, 820, 768, 402 và 320px; kiểm tra drawer, keyboard/focus, vùng cuộn, asset local, state và fixture không gửi API/ghi session storage.

Kiểm chứng này dành cho UI fixture. Chưa chạy end-to-end với Gateway/Backend thật, chưa chứng minh mọi frame/variant của toàn bộ file Figma khớp từng pixel. Các khác biệt dữ liệu có chủ đích được ghi ở phần phản biện bên trên.

## Đồng bộ Auth/Profile · 16/10/2026

Đối chiếu lại bằng high-fidelity Figma context và screenshot cho Login `298:1893`, Register `298:2007`, Profile `299:1847`. Phong cách Desktop được giữ trên Web mobile: typography, thẻ viền xanh, gradient, collage và form; Profile chuyển hai cột thành một cột, không còn form ẩn sau thẻ tóm tắt iOS.

| Nhóm | Figma tại 1440px | Browser tại 1440px | Kết luận |
| --- | --- | --- | --- |
| Login form | x886, y166, w440, h580.8 | x886, y166, w440, h583 | Chênh cao 2.2px do control tối thiểu 44px |
| Login heading/collage | heading x94 y196; collage origin x86 y382 | Cùng vị trí | Collage dùng canvas nội bộ 570.175px với toàn bộ postcard và watermark local |
| Register form | x876, y142, w458, h655.292 | x876, y142, w458, h706 | Ngoại lệ chiều cao có chủ đích: giữ Họ và tên và đồng ý điều khoản theo validation đang có; không loại trường bắt buộc để khớp ảnh |
| Register heading/collage | heading x94 y190; collage origin x86 y400 | Cùng vị trí | Giữ tiêu đề hai dòng 42/50px |
| Profile personal | x130, y220, w560, h620 | Cùng geometry | Trường nhập 48px, avatar 78px, nút lưu bên phải |
| Profile notifications | x720, y220, w590, h620; divider y531 | Cùng geometry | Danh sách thiết bị và switch ON trong mẫu được thay bằng trạng thái chưa khả dụng vì chưa có dữ liệu backend |

Các khác biệt nghiệp vụ được giữ rõ: thông tin demo nằm ngoài form trong bảng preview; version hồ sơ và ghi chú projection chỉ nằm trong bảng preview; phiên đăng nhập hiển thị số thứ tự, không đưa internal ID vào tiêu đề. Lưu hồ sơ giữ bản nháp và hiển thị chưa khả dụng, không báo đã lưu. Hai icon submit `e48f0.svg`/`cadd3.svg` được tải đúng từ Figma; không dùng URL tạm khi runtime.

Kiểm tra riêng Auth/Profile: typecheck và lint các file thay đổi đạt; 18 unit tests liên quan Auth/Identity/Profile đạt (4 Home/demo composition tests không nằm trong lượt chọn này); 2 Playwright test đăng ký và giữ draft Profile đạt. Browser review đã xem ba trang desktop1440 và Login/Profile mobile402. Artifact ignored: `.ui-review/auth-aligned-{login,register,profile}.png`, `.ui-review/auth-aligned-{login,profile}-mobile.png` ngoài repo và `test-results/auth-browser`.

Đã bổ sung assertion geometry của form tại 1440px vào bộ `Auth/public layout`; sai lệch vị trí/chiều rộng cho phép 4px. Register không áp cùng height assertion vì có thêm trường bắt buộc. Những kết quả này không thay thế regression toàn nhánh do các trang khác đang chỉnh đồng thời.

Kiểm tra browser bổ sung riêng ba trang Login/Register/Profile: 24 tổ hợp ở 1920, 1440, 1366 (cao 520), 1024, 820, 768, 402 và 320px đều đạt không tràn ngang, form nằm trong viewport, ảnh hiển thị tải được và cuối trang cuộn tới được. Đã xem thêm ảnh Register/Profile320 và Login820; artifact `.ui-review/auth-aligned-{login,register,profile}-{320,820}.png` ngoài repo. Shared control mobile đang được chuẩn hóa ở nhiệm vụ nền tảng chung; ảnh trước bước đó chưa phải visual baseline cuối.

## Chốt đồng bộ Web · 16/10/2026

Khu vực Figma đề xuất nằm tại section `767:5376`, giữ nguyên toàn bộ frame nguồn. Các frame tham chiếu Web hiện có là Home Guest/User `768:5376`/`768:5746`, Login `768:6118`, Register `768:6211`, Trip List `768:6309`, Overview `768:6807`, Plan `768:7123`, Members `768:7492` và Profile `768:7694`. Companion Home 402px là `780:6444`; drawer Web dùng `783:6655`.

Home Desktop 1440px được khóa bằng geometry test: Hero `y76/h548`, Features `y624/h442`, App Preview `y1066/h432`, Inspiration `y1498/h390`, Footer `y1888/h256`; collage `x718/y111/w650/h470` và app mockup `x497/y1095/w890/h≈400`. Baseline đã review nằm ở `tests/e2e/__screenshots__/auth-fixture.spec.ts/home-guest-1440.png`; panel preview được ẩn riêng khi chụp để ảnh chỉ chứa giao diện sản phẩm. Home 402/320 dùng story một cột, app mockup trước CTA, CTA đủ chiều rộng và không còn decoration đè chữ hoặc collage footer bị cắt.

Home Guest/User giữ cùng landing composition theo Figma. User chỉ nhận CTA sang `/trips`; Home không còn đọc `TripRepository` hoặc hiển thị metadata/revision private không có trong thiết kế. Shared Button/Field/Alert và shell mobile giữ Be Vietnam Pro, màu và radius Web thay cho variant iOS cũ. Trip List, Overview, Plan và Members dùng cùng TripHero/banner, asset nguồn và geometry đã kiểm tra; internal ID/revision chỉ xuất hiện trong preview khi thật sự cần cho test.

Hai sai khác bố cục lớn được giữ và ghi rõ thay vì tự thay đổi: mobile header tiếp tục dùng shell chung 54px với drawer/focus đã kiểm thử, trong khi companion Home đề xuất cao 72px; Register cao hơn frame vì giữ họ tên và đồng ý điều khoản bắt buộc. Thay đổi hai điểm này cần quyết định bố cục/luồng riêng.

CI chạy cả nhánh `ui/**` và `feature/**`, pull request vào `main`/`develop`, cài Chromium, chạy Playwright và lưu `playwright-report` cùng `test-results` để có actual/expected/diff khi visual regression thất bại. Kết quả cuối của nhánh: lint và typecheck đạt; **166/166 unit/component**, **88/88 Playwright** đạt; production build và preview build đạt; `git diff --check` không có lỗi whitespace.

Ba đề xuất chức năng cho các nhánh kế tiếp đã được chỉnh trong Figma: Fund `768:7778`/mobile `781:6554`/note `777:6442`, Fare Watch `768:7992`/mobile `781:6626`/note `777:6445`, Dress Code `768:8228`/mobile `781:6748`/note `777:6448`. Quy tắc responsive chung nằm ở `785:6670`.
