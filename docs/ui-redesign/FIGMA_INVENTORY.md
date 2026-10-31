# Figma inventory — nguồn chính thức thay thế

Source: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Snapshot 29/10/2026. Toàn bộ khảo sát nhầm file tại [evidence/figma](evidence/figma/README.md) **INVALIDATED**, không dùng cho kết luận dưới đây. Codebase/Backend discovery không bị vô hiệu hóa bởi việc sửa nguồn Figma.

Scope update CP02,30/10/2026: sản phẩm **chỉ Web**. Giữ toàn bộ catalog Mobile để truy vết khảo sát, không coi là target native/mobile app hoặc backlog triển khai. Desktop/Web alignment là nguồn thiết kế áp dụng; không cần enumerate lại inventory hiện đang đủ dùng. Ba ảnh concept CP02 đã WITHDRAWN/SUPERSEDED_FOR_DIRECTION theo D15–17, không phải evidence đọc từ Figma và không thay đổi các counts dưới đây.

## 1. Phạm vi truy cập thực tế

CP02 correction30/10/2026: [live review bốn frame Plan](evidence/cp02/figma-plan-review-2026-10-30/README.md) xác nhận Web Lịch trình đã có thiết kế chính/unassigned/day-map. Nhãn CP01 “Cần cải tiến” là đánh giá discovery, không có nghĩa thiếu design hoặc được phép thay bằng ảnh AI. Catalog/snapshot CP01 dưới đây giữ nguyên; ảnh bổ sung không trộn vào18 screenshot baseline.

CP02 supplemental review: [Home/Auth —6 ảnh](evidence/cp02/figma-home-auth-review-2026-10-30/README.md), [Fund/Members —4 ảnh mới và nguồn CP01 tái sử dụng](evidence/cp02/figma-fund-members-review-2026-10-30/README.md). Đã mở lại [Overlay board26:406](evidence/figma-official/26-406.png): phần A có centered activity editor; right Drawer là current implementation, không phải vị trí editor nguồn. PLN08 ghi khác biệt và fields bổ sung. Tổng14 ảnh nguồn mới CP02, không đổi counts CP01. Họ màn hình bên dưới giữ discovery findings; mọi câu đề xuất cải tiến phải qua D17/[delta register](DESIGN_DELTAS.md), không là quyền redesign mặc định.

MCP đã đọc metadata của 3/3 pages; Plugin API read-only đã enumerate đầy đủ FRAME, COMPONENT và COMPONENT_SET trên từng page, kể cả nội dung metadata không mở rộng. Không ghi canvas.

| Page | ID | FRAME nodes | Components | Sets | Instances | Root/section-level FRAME records |
|---|---|---:|---:|---:|---:|---:|
| Wolfari · Desktop | `0:1` | 4.412 | 78 | 3 | 931 | 97 |
| Wolfari · Mobile | `310:2025` | 1.994 | 94 | 13 | 887 | 54 |
| Wolfari · Admin | `194:1073` | 833 | 3 | 1 | 72 | 16 |
| Tổng | 3 pages | 7.239 | 175 | 17 | 1.890 | 167 |

FRAME totals gồm nested layout/instance descendants, không phải screen count. 167 records gồm notes/component boards/flow charts, không phải 167 route. 156 page-root nodes gồm cả section/text/components; Desktop có thêm 39 nodes trong Web alignment section. Không cộng những tập lồng nhau này thành một tổng screen giả.

Tra cứu mọi frame: `evidence/figma-official/frames-*.json`. Mọi component/set và variants: `inventory-*.json`. [Screen register](evidence/figma-official/SCREEN_REGISTER.md) ghi đủ 167 frame cấp màn hình/tài liệu, node links, kích thước, mapping/phân loại. [Evidence index](evidence/figma-official/README.md) giải thích coverage và giới hạn.

Đã xem 18 screenshot chính thức đại diện; những dòng chỉ đọc cấu trúc được ghi riêng. Không khẳng định đã kiểm tra trực quan mọi state hoặc chạy toàn bộ prototype. Desktop có 1.150 nodes chứa reactions, Mobile 373, Admin 108 (trên các types đã query); edges và actions đã lưu để truy vết, không phải Backend mutations.

## 2. Các họ màn hình và đối chiếu

| Họ / frame tiêu biểu | Mục đích, bố cục, hành động | Đánh giá và khác biệt Frontend |
|---|---|---|
| Home `3:28`, user `298:1642`; alignment `768:5376`, `768:5746`; Mobile M01/M04 | Header, hero/collage, features, destination cards, CTA; bắt đầu/tạo chuyến, đăng nhập, khám phá | Giữ brand/mascot; giảm độ dài và lời hứa chưa có runtime. Guest/auth phải dùng CTA đúng session. Không thêm destination route giả. |
| Trips `3:29` / `768:6309`, M05 | Search/filter/cards; tạo và mở Trip | Cần bảo toàn opaque cursor, list partial và empty/error; không thay paginated count bằng tổng suy đoán. |
| Create `3:30`, M06/M07/P01 | Form lớn + destination panel; mobile information/personalize steps | Cần thiết kế lại theo payload Gateway thực tế: name/dates/timezone/description. Destination/cover/style/budget chỉ có ở proposal/preview; không giả đã persist. |
| Overview `3:31`, `3:32`, `768:6807`, M08 | Trip banner + metrics/cards; sidebar expanded/collapsed; đi vào Plan/Fund/Members | Có thể cải tiến trực tiếp; runtime aggregate hiển thị partial errors và packing read-only, không đưa thời tiết giả. |
| Plan `20:236`, `439:2028`, `439:2497`, `768:7123`, M09/M29/M33 | Day tabs, timeline, unassigned list, map pane, reorder; centered edit/add modal tại board `26:406`-A | Giữ source hierarchy và actual timeline, version conflict, day-only/overnight/full-order IDs. Current right Drawer là PLN08 cần review. Figma presence/travel-time là minh họa, không chứng minh realtime/provider. |
| Map `20:386`, `224:1253`, M10/M11 | Search/list/map, selection/detail, planned/unassigned markers | Gateway là Plan projection/read-only; không giả search provider hoặc apply mutation. Giữ preview riêng và thiết kế unavailable hữu ích. |
| Dress `20:565`, `514:3121`, `768:8228`, M12 | Cards, scopes, right-hand form; saved/suggestion state | Alignment sửa theo TRIP/DAY/ACTIVITY, bỏ gán thành viên; Gateway chưa có mutation. Illustration/palette không đồng nghĩa upload contract. |
| Packing `23:312`, set `256:1996`, M13/M30/P03/P15 | Grouped checklist, filters/progress, add/edit overlay | Gateway chỉ đọc; thao tác checkbox/create của preview không được biến thành server success. Cần state read-only/permission/error rõ. |
| Fund `23:506`, `477:*`, `517:*`, `528:*`, `541:*`, `768:7778`, M14/M15 | Summary, ledger/tabs, form, contributions/refunds/closing/Holder states | Cần reconciliation lớn. Bản `777:6442` phủ nhận Holder handover trong frame `477:*`. Runtime Web hiện TEST manual contribution core; advanced expenses/refunds/closures không tự thêm. |
| Price `23:657`, `517:3692`, `517:3849`, `768:7992`, M18/P09 | Watch cards, observations chart, right-hand form, lifecycle | Runtime thực sự có create/edit/pause/resume/stop, MOCK_FLIGHT, VND; không gọi là đặt vé/giá realtime tốt nhất. Giữ nguồn/thời điểm và error data freshness. |
| Members `25:360`, `475:*`, `514:*`, `541:*`, `768:7492`, M16/M17 | Members/invitations/policy tabs, permissions, transfer states | Owner/FundHolder độc lập. Retain remove/leave command states; Owner transfer/Holder transfer Figma không tự tạo API integration. |
| Invitations `299:2010`, M24/P05 | Preview trip/recipient, accept/decline/login recovery | Cần token expired/revoked/wrong actor/loading/error và sanitized return path. Không lộ token ở URL logs. |
| Settings `25:676`, `269:1234`, `514:3546`, `517:4741`/`4849`/`4953`, M20/M21 | Metadata edit, reminders, dangerous lifecycle actions | Giữ current editable fields/version handling. Reminders/archive/delete trong thiết kế không mặc nhiên wired; disable/unavailable phải có lý do. |
| Auth `298:1893`, `298:2007`, `768:6118`, `768:6211`, M02/M03 | Branded art + form; login/register/back | Cần thêm recovery/verification/error states; register202 không tự đăng nhập. |
| Profile `299:1847`, `514:3660`/`3715`, `541:5579`, M22/M32/P06/P14 | Profile/avatar, notifications, devices, logout | Current Profile có password, avatar, session revocation, notification preferences. Figma push devices ≠ auth sessions; không gộp/xóa nhầm. |
| Notifications `299:1926`, `514:3801`, M23 | Inbox/categories/unread/preferences | Runtime là shell Drawer, không standalone route; giữ pagination và single mark-read, chưa tự thêm bulk read/filter API. |
| Export/share `25:518`, `517:4006`/`4146`, public `299:2066`/`2133`/`2173`, M19/M25–27/P10–11 | Export progress, public-link/password/unavailable | Figma-only backlog, không bỏ khỏi inventory, không tự thêm route hoặc tạo link giả. |
| Overlays `26:406`, Mobile P01–P15/M31/M33 | Edit activity/invite/share/watch/packing/dress, success/confirm/sheets | Dùng pattern giữ context, nhưng cần đầy đủ pending/error/unknown/focus-return. Success prototype chỉ minh họa. |
| Admin Desktop `538:*`, `541:5636`; Admin page `194:*`, `215:*`, `216:*` | Accounts/providers/jobs/audit/support/flags + action dialogs | Hai hướng IA chưa canonical; source chỉ guarded placeholder. Tham khảo riêng, chưa triển khai nghiệp vụ Admin trong redesign hiện tại. |

Mapping đủ từng route nằm ở [ROUTE_MATRIX](ROUTE_MATRIX.md); không yêu cầu Figma phải có thiết kế mới cho route đang tồn tại mới được đưa vào scope.

## 3. Components, foundations và assets

- Desktop: Button/Primary & Outline, Chip/Status, Nav item, Input/Search, Tab/Day, Card/Metric, Row/Activity, Card/Trip, Header (`Active` 5 variants), Trip Sidebar (`State` Expanded/Collapsed × Active destinations), Packing/Content; nhiều brand/decor/illustration components. Button nền tảng Desktop chưa phải full state matrix cho hover/focus/loading/error.
- Mobile: 13 sets gồm Button, Field, Chip, Tab bar, Checklist, Segmented control, Search, Quick action, Progress summary, Status badge, Switch, Trip stepper, Trip section switcher; standalone list/member/activity/destination/trip rows, sheets, avatars, icons/illustrations. Button có pressed/disabled, Field có focus/error; vẫn phải bổ sung keyboard, asynchronous pending và unknown cho Web.
- Admin: Nav Item Default/Active và Topbar. Không đồng nhất với Header/Trip Sidebar của end-user.
- 5 variable collections: Wolfari 23; Mobile refinement 6; Mobile prototype 74; Mobile components 2026 94; Mobile iOS 27 60. Tổng **257**. Prototype variables là state simulation, không copy toàn bộ vào CSS.
- 28 text styles, 2 paint styles, 15 effect styles, **0 grid styles**; không suy ra rằng screen không có layout grid chỉ vì không có grid style.
- Web gốc: Be Vietnam Pro body16/24, label15/22, small13/20, card20/28, title24/32, heading32/40, display56/64. Handwritten Caveat; Mobile còn Kalam/SF Pro. Code hiện Patrick Hand và label14: cần quyết định có chủ đích, không tự tải font mới.
- Web variables: ink `#06458b`, blue `#0089c7`, teal `#008cac`, muted `#6c8bb2`, green `#15b784`, pale `#f3fbff`, line `#cdebf7`; spacing4/8/12/16/24/32/48/64; radius12/16/20/999. Không dùng muted/light colors làm text nhỏ trước contrast check.
- Image hashes và component IDs lưu trong screens JSON: Desktop có 15 hash khác nhau, Mobile8, Admin2 (đếm trong từng page; không cộng thành global unique). Logo/mascot/cloud/collage/landscape tồn tại cả trong design và `src/shared/assets/figma`. Chưa kiểm tra hash tương đương từng asset, licensing và raster resolution toàn bộ; không tải lại/ghi đè application assets trong CP-01.
- Không subscribed library; published-search mẫu không có matches. Code Connect blocked bởi plan. Không có cơ sở kết luận file không có component.

## 4. Responsive, motion và gaps

Contract `785:6670` xác định Desktop1440, Web402, một cột, drawer, form dưới content; tuyệt đối không dùng iOS status/tab bars cho Web. 4 Web402 companion (Home/Fund/Price/Dress) + menu drawer không bao phủ toàn bộ routes và breakpoints. Mobile page là hướng tham khảo bổ sung, không thay thế kiểm tra320/768/820/1366 và viewport thấp.

Figma có prototype edges nhưng CP-01 chưa chạy click-through toàn bộ, chưa trích/đánh giá đầy đủ timing/easing animation. Không dùng việc có reaction để khẳng định accessible motion. CP-02 phải có motion spec và state matrix thống nhất.

Gaps cần thiết kế: recovery/verify/reset và404; asynchronous mutation recovery/unknown; authorization/loading/partial/unavailable/conflict; paused/stopped watches; narrow-browser form errors/keyboard and long text; reduced-motion variants. CP02 đã bàn giao family specs và [route gaps](ROUTE_GAPS_SPEC.md), đóng theo D20 với visual QA WAIVED_BY_USER D19. Full per-state visual verification vẫn NOT_RUN; xem [nghiệm thu](CP02_ACCEPTANCE.md). Inventory/evidence nguồn không thay đổi.
