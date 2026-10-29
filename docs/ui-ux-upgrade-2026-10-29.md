# Wolfari — nâng cấp UI/UX và nghiệm thu ngày 29/10/2026

Trạng thái: bản draft đã có bằng chứng kiểm thử giao diện và tích hợp backend thật trên production preview. Chưa nghiệm thu 100%: LCP còn vượt mục tiêu và một số kiểm tra thiết bị thực/CI chưa chạy.

Phạm vi: Guest, Owner, Member và quyền Fund Holder hiện có. Giữ routes, bố cục shell, logo, mascot, collage và artwork Wolfari. Theo yêu cầu bổ sung, lưu checkpoint bằng commit local trên nhánh `draft/demo-ui-ux`, tách từ `feat/demo-1-web` tại `f665149`. Không push/deploy; không mở rộng nghiệp vụ backend, thanh toán thật, Admin hoặc Mobile app.

## 1. Những thay đổi chính

- Token thống nhất cho chữ/nền/viền/action/trạng thái. Body 16px, label 14px, metadata 13px; control 12px, card 16px, dialog 24px; vùng bấm tối thiểu 44px cho component chung.
- Be Vietnam Pro tự host cho UI; Patrick Hand cho điểm nhấn trang trí. Đã gỡ Caveat/Kalam không còn dùng.
- Lucide cho icon chức năng; giữ artwork/logo. Button có hover/press/focus/loading không đổi nhãn hoặc kích thước.
- Input dùng một viền focus ở wrapper, không còn hai viền. Select dùng chevron thống nhất, vẫn giữ hành vi bàn phím native.
- Radix cho menu, tooltip, dialog/drawer/confirm, tabs/accordion và toast; backdrop blur 6px; Escape/focus/scroll lock được kiểm tra riêng.
- Route chỉ animate phần nội dung khi điều hướng; không làm chậm hiển thị lần đầu. Motion nặng chỉ tải trong Plan, menu/thông báo tải theo nhu cầu.
- Gateway Home dùng cùng trình bày với preview và nội dung biên tập, không dùng fixture nghiệp vụ làm fallback.
- Gateway timeline dùng dnd-kit, overlay nổi, menu di chuyển, bàn phím và split panel 62/38. Mobile/tablet dùng sheet cho nhóm chưa xếp ngày.
- Notifications: inbox, unread indicator có nguồn API, đọc từng tin, phân trang, retry và preferences đúng expected_version/full overrides. Không Web Push/mark-all giả.
- Price Watch: ACTIVE/PAUSED/EXPIRED/STOPPED, passenger mix, integer-string VND, tạo/sửa/pause/resume/stop và observations. Ghi rõ MOCK_FLIGHT; ngày/giờ tìm chuyến bay là UTC theo contract backend.
- Dọn copy kỹ thuật: ID/version/correlation nằm trong disclosure hỗ trợ; không xóa lỗi cần xử lý, unknown/conflict hoặc đối soát quỹ. Giữ TEST/MOCK và thông báo read-only khi thiếu writer.
- Card chuyến đi có menu điều hướng thật. Bộ lọc chưa tích hợp không xuất hiện ở Gateway. Cài đặt không còn các giá trị nhắc giờ giả định.

## 2. Quy ước component và chuyển động

| Thành phần | Quy ước |
|---|---|
| Button/IconButton | `Button`/`ButtonLink`, dùng variant/size/loading; tránh tự vẽ nút bằng div |
| Form | `Input`, `Select`, `Textarea`, `Field`; nhãn gắn đúng control; lỗi tại trường và focus đầu tiên ở form đã nâng cấp |
| Menu | `ActionMenu` hoặc Radix DropdownMenu; không dùng mũi tên làm trang trí cho nút chưa hoạt động |
| Popup | `Drawer`/`ConfirmDialog`; một cơ chế focus và khóa cuộn; returnFocusRef khi trigger cần giữ chắc chắn |
| Feedback | Toast cho thành công ngắn; lỗi/unknown/recovery giữ trong trang |
| Timeline | Wrapper dnd-kit bên ngoài, Motion bên trong; reorder gửi đầy đủ ID, không sửa giờ; đổi ngày không ghép request reorder |
| Motion | press nhẹ; menu 140–180ms; popup khoảng 220–280ms; tôn trọng prefers-reduced-motion |
| Split | Desktop ≥1201px; tỷ lệ chỉ lưu localStorage; keyboard resize và reset; hẹp hơn dùng sheet |

## 3. Ma trận màn hình – API – quyền

| Màn hình | Nguồn và thao tác | Quyền/giới hạn |
|---|---|---|
| Home/Auth | Nội dung biên tập; Identity/session hiện có | Guest dùng được; không fixture fallback khi dịch vụ lỗi |
| Profile | `/me`, avatar, sessions, password; notification-preferences | Tài khoản hiện tại; hủy yêu cầu khi đổi actor |
| Trips/Create/Settings | Trip list/detail/create/update hiện có | Owner sửa trong phạm vi contract; archived/member không được mở writer |
| Overview | Trip, Plan, Membership, Finance projections | Lỗi từng phần; không dựng số liệu thiếu |
| Plan | Activity create/update/delete/complete/reorder | Backend quyết định canEdit/canComplete; giữ plan version, command journal, idempotency/recovery |
| Members/Invitations | Membership, policy, invitation endpoints | Owner quản lý; giữ quyền Fund Holder và giới hạn rời chuyến |
| Fund | Finance requests/contributions/ledger/operations hiện có | Owner/Holder/Member đúng phạm vi; TEST, đối soát và unknown không bị che |
| Map/Dress/Packing | Plan projections | Gateway read-only; preview local không trộn vào server |
| Price Watch | `/trips/:id/price-watches`, `/price-watches/:id`, pause/resume/stop/observations | Thành viên đang có quyền đọc; người tạo sửa/pause/resume; Owner có quyền stop theo contract; archived khóa ghi |
| Notifications | `/me/notifications`, `/:id/read`, `/me/notification-preferences` | Theo actor; không suy tổng unread từ một trang; không endpoint tưởng tượng |

## 4. Rà thiết kế theo ảnh mới

Skill Product Design audit được áp dụng cho lượt rà cuối bằng Playwright dự án đã được chọn trong công việc này. Không khởi tạo template, không dùng ảnh sinh thay cho ảnh ứng dụng, không xuất Figma hoặc deploy.

Ảnh trước sửa của lượt rà hiện tại: `test-results/design-audit-before/ui-acceptance-Gateway-visual-and-accessibility-1440x900/`.

1. Đăng nhập (`login.png`): bố cục/artwork giữ nguyên; viền focus đơn rõ; không còn thông báo Identity thừa lúc chưa thao tác. Quét axe trạng thái này PASS.
2. Tạo chuyến đi (`create.png`): phát hiện fieldset viền xám mặc định, khoảng cách trường quá sát, hai màu chữ chưa đủ tương phản; đã sửa CSS, giảm copy kỹ thuật. Ảnh sau sửa đã kiểm tra; axe PASS.
3. Cài đặt (`settings.png`): phát hiện giờ nhắc giả định và ba khối lặp “chưa hỗ trợ”; đã thay bằng link tới preferences thật và disclosure tác vụ chưa khả dụng. Ảnh sau sửa đã kiểm tra; axe PASS. Không bổ sung writer.

Ảnh sau sửa cùng viewport 1440×900: `test-results/design-audit-after/ui-acceptance-Gateway-visual-and-accessibility-1440x900/`. Bài kiểm tra này PASS và đã mở ảnh Login/Create/Settings/Profile/Plan cards/Members/Fund để kiểm tra trực quan.

Lượt kiểm tra ảnh mobile phát hiện thêm tiêu đề Create Gateway bị CSS của preview hai bước ẩn. Đã tách class Gateway, khôi phục tiêu đề và link quay lại, đổi nhãn “Múi giờ IANA” thành “Múi giờ” kèm ví dụ. Bổ sung assertion tên heading chính xác và axe cho Create ở cả sáu kích thước. Lượt Gateway cuối: **51/51 PASS**, `test-results/ui-upgrade/gateway-final-v5.log`.

Map preview: full suite phát hiện tràn ngang ở768/402/320px. Nguyên nhân là `.mobileFilters label` đặt width100% lên nhãn đã visually hidden của Select chung. Đã bỏ rule gây xung đột, thêm min-width0 cho wrapper; bộ Map **11/11 PASS** sau sửa. Ảnh kiểm tra tại `test-results/map-after/trip-map-Map-layout-and-place-scrolling-fit-320x700/map-viewport.png`. Gateway Map vẫn chỉ đọc projection, không biến ảnh preview thành bản đồ đang hoạt động.

Quỹ có dữ liệu: đã kiểm tra ảnh desktop và mobile ở `test-results/gateway-final-v5/finance-operations-HTTP-mo-57d33-oes-not-manufacture-balance/`. Số tiền vượt safe integer được giữ chính xác, không tràn màn hình; thông tin kỹ thuật đóng mặc định. Cảnh báo cần đối soát và nhãn TEST vẫn hiện, không bị xóa như “log thừa”. axe trạng thái quỹ có dữ liệu PASS. Desktop chụp phần đầu trong main cuộn; ảnh mobile bao gồm nội dung dài.

![Tạo chuyến đi mobile sau sửa](../test-results/gateway-final-v4/ui-acceptance-Gateway-visual-and-accessibility-402x874/create.png)

![Đăng nhập sau sửa](../test-results/design-audit-after/ui-acceptance-Gateway-visual-and-accessibility-1440x900/login.png)

![Tạo chuyến đi trước sửa](../test-results/design-audit-before/ui-acceptance-Gateway-visual-and-accessibility-1440x900/create.png)

![Tạo chuyến đi sau sửa](../test-results/design-audit-after/ui-acceptance-Gateway-visual-and-accessibility-1440x900/create.png)

![Cài đặt sau sửa](../test-results/design-audit-after/ui-acceptance-Gateway-visual-and-accessibility-1440x900/settings.png)

Ảnh tĩnh chỉ chứng minh bố cục/hiển thị tại trạng thái đã chụp; kiểm tra focus, bàn phím, API và reduced motion được ghi tách biệt trong kết quả thử nghiệm.

## 5. Nghiệm thu

Đã chạy lại tuần tự; các kết quả mock và tích hợp thật được ghi riêng. Lượt backend production preview mới nhất khớp implementation hash hiện tại (`46a00b47f55fcc7f10008e0518564f1afb9d042f1bf55f13873ec50a0c5bf915`); hash trước và sau lượt chạy bằng nhau.

| Kiểm tra | Trạng thái hiện tại |
|---|---|
| Lint/typecheck | PASS khi kiểm tra trước commit; `test-results/ui-upgrade/lint-precommit.log`, `typecheck-precommit.log` |
| Unit | PASS 545/545; `test-results/ui-upgrade/unit-final-v3.json` |
| Production/preview build | PASS khi kiểm tra trước commit; `test-results/ui-upgrade/build-precommit.log`, `build-preview-precommit.log`; preview output riêng `test-results/build-preview/` |
| Fixture E2E | PASS 166/166; `test-results/ui-upgrade/fixture-final-v3.log` |
| Gateway HTTP-mock E2E | PASS 51/51; `test-results/ui-upgrade/gateway-final-v5.log` |
| Firefox/WebKit | PASS 14/14; `test-results/ui-upgrade/cross-browser-final.log` |
| Backend thật cô lập — production preview | PASS 1/1 kịch bản, gồm 15 bước; run `20261029080817-3f5094c9` |
| Backend thật cô lập — dev | Chưa PASS; lượt trước bị worker crash khi Windows báo thiếu bộ nhớ ảo; chưa chạy lại thành công |
| Thiết bị cảm ứng vật lý, screen reader người dùng, CI | NOT RUN |

Lượt chạy song song bị thiếu RAM (`FATAL ERROR: Zone Allocation failed`, Vite mất kết nối). Không tính các failure hạ tầng đó là bằng chứng lỗi UI, cũng không bỏ qua chúng để báo PASS: chạy lại E2E từng bộ với một worker. Giữ log cũ để đối chiếu, không dừng container dự án khác.

### Tích hợp thật đã xác nhận

Artifact local: `test-results/demo1/20261029080817-3f5094c9/preview/results.json`, `preview-business-proof.json`, `snapshot.json`, `final-source.json`. Kịch bản hoàn tất trong khoảng121giây, không retry; năm tài khoản chính được đăng ký/xác minh bằng Mailpit thật, thêm một người nhận lời mời mới ở bước riêng. Không seed nghiệp vụ bằng SQL.

Đã kiểm tra hồ sơ/avatar/phiên/mật khẩu, tạo chuyến đi và lời mời, lịch trình qua đêm/reorder/thu hồi quyền/conflict, Notifications preferences/inbox và lifecycle MOCK_FLIGHT, quỹ TEST với số dư500000VND và hai bút toán, retry sau mất phản hồi không ghi trùng, rời/xóa/tham gia lại, restart dịch vụ và lỗi Finance/PostgreSQL/RabbitMQ, responsive/read-only và đổi tài khoản không lộ draft. Backend giữ nguyên checkout `ebd3550`, working tree sạch tại thời điểm kiểm tra.

Harness hỗ trợ `--runtime=preview` hoặc `--runtime=dev` để chạy từng môi trường trên máy hạn chế RAM; mặc định vẫn chạy cả hai. Không gọi lượt production preview là PASS cho dev. Lượt thất bại trước đó được giữ lại, không thay thế bằng mock. Các lỗi selector của bài kiểm thử được điều chỉnh theo UI hiện tại trước lượt PASS.

Log, screenshot và dữ liệu thử trong `test-results/` là artifact local bị Git ignore; không được đưa vào commit cùng mã nguồn. Báo cáo giữ đường dẫn để đối chiếu trên máy hiện tại; muốn tái tạo trên checkout khác cần chạy các lệnh bên dưới. Không commit `.local/`, thông tin phiên hoặc dữ liệu bí mật.

Phạm vi bằng chứng tương tác:

- Gateway kiểm tra desktop1440×900, màn hình thấp1366×520, tablet820×900/768×1024, mobile402×874/320×600; sidebar thu gọn, menu tài khoản, TripCard menu, route change khi inbox mở.
- Timeline có chuột, bàn phím và touch tổng hợp qua Chromium CDP; không phải kiểm tra trên điện thoại vật lý. Bao gồm hủy kéo, reorder đủ ID, đổi ngày, giữ giờ, conflict, thu hồi quyền và resize bằng bàn phím.
- Popup lồng nhau chạy cả animation bật và reduced motion; Escape/Tab/return focus/khóa cuộn được kiểm tra tách biệt.
- Zoom 200% hiện dùng CSS document zoom, **chưa** kiểm tra browser zoom gốc Ctrl+plus.
- axe không phát hiện violation ở các trạng thái đã quét. Điều này không tương đương chứng nhận WCAG đầy đủ hay kiểm thử với screen reader thực tế.

Lệnh tái lập lượt cuối:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm build:preview --outDir test-results/build-preview
corepack pnpm test:e2e:gateway --workers=1
corepack pnpm test:e2e --workers=1
corepack pnpm exec playwright test --config playwright.cross-browser.config.ts --workers=1
corepack pnpm test:e2e:demo1
# Hoặc chạy riêng production preview:
corepack pnpm test:e2e:demo1 --runtime=preview
```

Không chạy đồng thời tất cả các lệnh trên trên máy thiếu RAM. Harness backend tạo project/container/database test riêng, kiểm tra nhãn sở hữu trước khi dọn volume; không dùng dữ liệu production và không thay migration của backend.

## 6. Hiệu năng

Script: `node scripts/ui-performance.mjs <build-directory> <output-directory>`. Cold cache Chromium, viewport 1366×768, CPU slowdown 4×, RTT150ms, download1.6Mbps/upload0.75Mbps, gzip, median3 lượt. Public production build với server static trả401 cho API, không phải backend thật.

Baseline từ `f665149`: initial JS137.75KiB gzip; LCP median2424ms; CLS0.000157. Baseline Home Gateway chưa có đầy đủ hero/collage/section, nên đây là cùng cấu hình đo nhưng khác mức nội dung.

Bản build cuối (`test-results/ui-performance/final-v2/metrics.json`): initial JS150.12KiB gzip (PASS ≤190KiB), LCP median2688ms (FAIL ≤2500ms), CLS0 (PASS ≤0.1). Đo riêng, không chạy đồng thời các bộ kiểm thử. LCP vẫn là hạng mục chưa đạt; đây không phải đo thực địa hoặc backend thật. Lượt trước cùng source gần cuối là2816ms (`test-results/ui-performance/final/metrics.json`); giữ cả hai để thể hiện biến động môi trường, không quy mọi chênh lệch cho code.

Đã thử preload font body (2788ms), thêm font trang trí (3304ms) và preload ảnh hero (2924ms) trên cùng cấu hình. Không giữ các preload này vì không đạt mục tiêu và tăng cạnh tranh tải đầu. Artifact thử nghiệm nằm trong `test-results/ui-performance/preload-*`; không dùng lượt tốt nhất để thay số đo cuối.

## 7. Nguồn kỹ thuật

- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog): hành vi modal/focus/keyboard.
- [Motion bundle size](https://motion.dev/docs/react-reduce-bundle-size): LazyMotion/m và tách tải tính năng.
- [Playwright accessibility](https://playwright.dev/docs/accessibility-testing): axe kết hợp kiểm tra tương tác; không coi quét tự động là chứng nhận WCAG đầy đủ.

Không dùng kết quả mock để khẳng định tích hợp backend thật; không dùng screenshot để khẳng định đầy đủ accessibility.
