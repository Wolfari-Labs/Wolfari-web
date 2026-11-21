# Figma V2 Inventory — Wolfari · Web v2

Nguồn: file `hdy2sOZk6rfjKXKDJ9HW9y`, trang `930:6658` "Wolfari · Web v2", đọc qua Figma MCP ngày 21/11/2026. Mọi Node ID dưới đây lấy từ metadata thật; route/file là ánh xạ vào Wolfari-web.

## Components (frame `930:6659`, "Hướng D · Pastel mềm 3D")

| Node | Component | Code |
|---|---|---|
| `930:6835` | W/Top nav (Guest `930:6661`, Trang chủ `930:6700`, Chuyến đi của tôi `930:6745`, Lên lịch `930:6790`) | `features/shell/components/AppShell.tsx` header |
| `930:7331` | W/Trip sidebar, 9 trạng thái active (`930:6836`…`930:7276`) | `AppShell.tsx` sidebar + `MascotCard` |
| `937:7692` | W/Trip sidebar · Thu gọn | `AppShell.tsx` `.collapsed` |
| `937:7647` | W/Trip header | `features/trips/components/TripHero.tsx` + breadcrumb overlay (`global.css`) |
| `932:6935` | W/Trip card | `features/trips/components/TripCard.tsx` |
| `937:7687` | W/Toast | `shared/components/SuccessToast.tsx` |
| `937:8030` | W/Admin sidebar (5 trạng thái) | `features/shell/components/AdminChrome.tsx` |
| `937:8031` | W/Admin top bar | `AdminChrome.tsx` |
| `865:6673` | v2/Brand/Wordmark (trang Mobile v2) | `shared/components/BrandWordmark.tsx` |
| `875:7171`, `875:7196`, `875:7320`, `875:7312` | D/Avatar stack, D/Chip, D/Stat tile, D/Map pin (thư viện Mobile v2) | dùng lại qua tokens `--v2-*` |
| `892:7870` | D/Input | `shared/components/Field.module.css` |

## Tokens trích từ node (không ước lượng)

| Token | Giá trị | Nguồn |
|---|---|---|
| Font | Nunito 600/700/800, Baloo 2 ExtraBold (wordmark) | text nodes `930:6843`, `865:6675` |
| Ink / sub / nav / muted | `#1f2a44` / `#6a7891` / `#4a5770` / `#8a97b0` | `930:6889`, `930:6765`, `930:6848`, `930:6837` |
| Gradient chính | `#5b8cff → #3cc9b0` | `930:6839`, `930:6766` |
| Nền trang | `linear-gradient(146.3deg, #eaf0ff, #f3f0ff 50%, #e9fbf3)` | frame `932:7192` |
| Pastel | sky `#dce9ff`, mint `#d6f5e8`, butter `#fff0c2`, peach `#ffe0d4`, lilac `#e9e1ff` | D/Stat tile, `942:10026` metrics |
| Bóng | drop `0 8 10 rgba(92,122,199,.12)`, card `0 8 20 -4 …12%`, float `0 12 28 -4 …18%`, inset 3D | mọi card |
| Bo góc | pill 999, tile 28, top nav 30, panel 32, thumb 20, field 20, row 18 | như trên |
| Kích thước khung | top nav 76 @ (24,20); sidebar 264 @ (24,112); nội dung x=312 y=112 w=1104 | `932:7192` |

## Màn hình (frame 1440×960 trừ khi ghi khác)

| Node | Màn hình | Route | Code | Trạng thái |
|---|---|---|---|---|
| `932:6959` | W02 · Chuyến đi của tôi | /trips | TripListPage | DONE |
| `932:7192` | W04 · Tổng quan chuyến đi | /trips/:id | TripOverview | DONE |
| `933:7307` | W06 · Lịch trình | /trips/:id/plan | PlanPage | DONE |
| `933:7623` | W16 · Đăng nhập | /login | auth | DONE |
| `933:7734` | W01 · Trang chủ — Guest | / (guest) | HomeRoute | DONE |
| `938:7830` | W01.1 · Trang chủ — Đã đăng nhập | / (đã đăng nhập) | HomeRoute | DONE |
| `938:8073` | W05 · Tổng quan — thu gọn | /trips/:id | TripOverview (sidebar thu gọn) | DONE |
| `938:8364` | W06.1 · Lịch trình — Chưa xếp lịch | /trips/:id/plan | PlanPage | DONE |
| `938:8712` | W06.2 · Lịch trình — Bản đồ ngày | /trips/:id/plan | PlanPage | DONE |
| `938:9069` | W03 · Tạo chuyến đi | /trips/new | CreateTripPage | DONE |
| `938:9333` | W07 · Bản đồ & địa điểm | /trips/:id/map | GatewayMapPage/TripMapPage | DONE |
| `938:9626` | W07.1 · Bản đồ & địa điểm — sau khi chọn | /trips/:id/map | GatewayMapPage/TripMapPage | DONE |
| `941:8933` | W08 · Dress code | /trips/:id/dress-code | DressCodePage | DONE |
| `941:9248` | W08.1 · Dress code — Đã lưu | /trips/:id/dress-code | DressCodePage | DONE |
| `941:9546` | W09 · Packing list | /trips/:id/packing | PackingPage | DONE |
| `941:9891` | W11 · Theo dõi giá vé | /trips/:id/price-watch | PriceWatchPage | DONE |
| `941:10218` | W11.0 · Theo dõi giá vé — Tạo mới | /trips/:id/price-watch | PriceWatchPage | DONE |
| `941:10529` | W11.1 · Theo dõi giá vé — Đã tạo | /trips/:id/price-watch | PriceWatchPage | DONE |
| `942:10026` | W10 · Quỹ nhóm | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:10403` | W10.1 · Quỹ nhóm — Quản lý Fund Holder | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:10836` | W10.2 · Bàn giao Fund Holder — Chờ chấp nhận | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:11265` | W10.3 · Bàn giao Fund Holder — Đối chiếu | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:11704` | W10.4 · Bàn giao Fund Holder — Hoàn tất | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:12042` | W10.5 · Quỹ nhóm — Đã ghi khoản chi | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:12439` | W10.6 · Quỹ nhóm — Bắt đầu đóng Finance | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:12834` | W10.7 · Quỹ nhóm — Finance CLOSING | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:13184` | W10.8 · Quỹ nhóm — Finance CLOSED | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:13520` | W10.9 · Quỹ nhóm — Đóng góp | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:13888` | W10.9.1 · Quỹ nhóm — Đã tạo đợt đóng góp | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:14261` | W10.10 · Quỹ nhóm — Hoàn tiền & điều chỉnh | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:14611` | W10.10.1 · Quỹ nhóm — Đã lưu điều chỉnh | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `942:14981` | W10.11 · Quỹ nhóm — Lịch sử | /trips/:id/fund | FundPage/GatewayFundPage | DONE |
| `943:12696` | W12 · Thành viên | /trips/:id/members | MembersPage | DONE |
| `943:12965` | W12.1 · Thành viên — Lời mời | /trips/:id/members | MembersPage | DONE |
| `943:13185` | W12.2 · Thành viên — Quyền sửa Plan | /trips/:id/members | MembersPage | DONE |
| `943:13403` | W12.3 · Chuyển Owner — Xác nhận | /trips/:id/members | MembersPage | DONE |
| `943:13706` | W12.4 · Chuyển Owner — Finance CLOSING | /trips/:id/members | MembersPage | DONE |
| `943:14005` | W12.5 · Thành viên — Sau chuyển Owner | /trips/:id/members | MembersPage | DONE |
| `943:14281` | W12.6 · Thành viên — Đã gửi lời mời | /trips/:id/members | MembersPage | DONE |
| `943:14515` | W12.7 · Thành viên — Đã lưu quyền sửa Plan | /trips/:id/members | MembersPage | DONE |
| `943:14738` | W12.8 · Thành viên — Đã gửi lại lời mời | /trips/:id/members | MembersPage | DONE |
| `943:14962` | W12.9 · Thành viên — Đã thu hồi lời mời | /trips/:id/members | MembersPage | DONE |
| `943:15187` | W13 · Xuất & chia sẻ | (chưa có route Export/Share trên Web) | — | NOT_IMPLEMENTED (V2-D13) |
| `943:15552` | W13.1 · Xuất & chia sẻ — Đang tạo file | (chưa có route Export/Share trên Web) | — | NOT_IMPLEMENTED (V2-D13) |
| `943:15930` | W13.2 · Xuất & chia sẻ — Link đã tạo | (chưa có route Export/Share trên Web) | — | NOT_IMPLEMENTED (V2-D13) |
| `943:16283` | W14 · Cài đặt | /trips/:id/settings | TripSettingsPage | DONE |
| `943:16565` | W14.1 · Cài đặt — Chỉnh sửa thông tin | /trips/:id/settings | TripSettingsPage | DONE |
| `943:16883` | W14.2 · Cài đặt — Không thể xóa Trip | /trips/:id/settings | TripSettingsPage | DONE |
| `943:17184` | W14.3 · Cài đặt — Finance CLOSED | /trips/:id/settings | TripSettingsPage | DONE |
| `943:17465` | W14.4 · Cài đặt — Trip đã lưu trữ | /trips/:id/settings | TripSettingsPage | DONE |
| `943:17751` | W14.5 · Cài đặt — Xác nhận xóa Trip | /trips/:id/settings | TripSettingsPage | DONE |
| `944:15951` | W17 · Đăng ký | /register | auth | DONE |
| `944:16082` | W18 · Tài khoản & thông báo | /profile | profile | DONE |
| `944:16255` | W18.1 · Tài khoản — Đã lưu | /profile | profile | DONE |
| `944:16433` | W18.2 · Tài khoản — Đã xóa thiết bị | /profile | profile | DONE |
| `944:16602` | W18.3 · Tài khoản — Đã đổi ảnh | /profile | profile | DONE |
| `944:16780` | W19 · Trung tâm thông báo | Drawer Thông báo | Notifications | DONE |
| `944:16941` | W19.1 · Thông báo — Đã đọc | Drawer Thông báo | Notifications | DONE |
| `944:17102` | W20 · Phản hồi lời mời | /invitations | invitation | DONE |
| `944:17204` | W21 · Public Share — Chỉ xem | (chưa có route Public Share trên Web) | — | NOT_IMPLEMENTED (V2-D13) |
| `944:17340` | W21.1 · Public Share — Nhập mật khẩu | (chưa có route Public Share trên Web) | — | NOT_IMPLEMENTED (V2-D13) |
| `944:17410` | W21.2 · Public Share — Không khả dụng | (chưa có route Public Share trên Web) | — | NOT_IMPLEMENTED (V2-D13) |
| `946:16749` | A00 · Admin — Đăng nhập | /admin (section trong AdminChrome) | admin | NOT_IMPLEMENTED (V2-D13) |
| `946:16838` | A01 · Admin — Tổng quan hệ thống | /admin | AdminChrome | DONE |
| `946:17052` | A02 · Admin — Người dùng & Trip | /admin (section trong AdminChrome) | admin | DONE |
| `946:17254` | A02.1 · Admin — Xác nhận khóa tài khoản | /admin (section trong AdminChrome) | admin | NOT_IMPLEMENTED (V2-D13) |
| `946:17471` | A02.2 · Admin — Tài khoản đã khóa | /admin (section trong AdminChrome) | admin | DONE |
| `946:17677` | A03 · Admin — Provider & quota | /admin (section trong AdminChrome) | admin | DONE |
| `946:17937` | A04 · Admin — Danh mục & mẫu | /admin (section trong AdminChrome) | admin | DONE |
| `946:18135` | A04.1 · Admin — Thêm cấu hình | /admin (section trong AdminChrome) | admin | NOT_IMPLEMENTED (V2-D13) |
| `946:18378` | A05 · Admin — Job & log vận hành | /admin (section trong AdminChrome) | admin | DONE |
| `946:18612` | W15 · Overlay & Modal states | overlay/modal dùng chung | Ui dialog/Drawer | DONE |
| `946:19100` | W22 · Luồng hoạt động Web End-user | sơ đồ luồng (tham chiếu) | — | NOT_IMPLEMENTED (V2-D13) |
| `946:19443` | A06 · Luồng hoạt động Web Admin | sơ đồ luồng (tham chiếu) | — | NOT_IMPLEMENTED (V2-D13) |
| `1182:18397` | W04 / Editable Dashboard Controls · Reference 2026-11-06 | /trips/:id | TripOverview | DONE |

Ghi chú: `1182:18397` "W04 / Editable Dashboard Controls · Reference" là tham chiếu điều khiển dashboard, không phải màn hình riêng.
