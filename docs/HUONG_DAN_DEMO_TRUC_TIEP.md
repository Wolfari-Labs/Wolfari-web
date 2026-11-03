# Hướng dẫn demo trực tiếp Wolfari trên localhost

**Launcher và Chromium smoke VERIFIED; diễn tập Edge DRAFT / NOT_VERIFIED.** Cập nhật03/11/2026. Người dùng đã nhận thực hiện hai lượt Edge + checklist30 phút; chưa có kết quả. Đọc [readiness](demo-readiness-validation.md) trước khi kết luận sẵn sàng. Chỉ Web + Backend; không Mobile, không thanh toán thật, không production.

## 1. Chuẩn bị trước buổi demo

- Dùng đúng cặp phiên bản được ghi trong báo cáo readiness, không tự cập nhật một repo riêng.
- Docker Desktop Linux engine đã chạy; máy đủ RAM, không chạy full tests cùng demo.
- Hai repo nằm cạnh nhau, tên folder `Wolfari-web` và `Wolfari-backend`.
- Browser dùng **http://localhost:5273**, không fixture5173, không đổi sang127.0.0.1.
- Chuẩn bị Edge profiles riêng: Owner A, Holder B, Editor C, Member D; outsider chỉ dùng cho phần quyền. Tab cùng profile chia sẻ cookie, không là actor độc lập.
- Chọn Trip có ngày phù hợp ngày trình diễn và dữ liệu TEST. Không reset hoặc sửa SQL để làm lại kịch bản.
- Credentials giữ cục bộ. Không trình chiếu `.env`, seed journal, DevTools auth, URL verify/reset/invite token hoặc mailbox riêng tư.
- Cài dependencies/images trước; Mailpit chỉ chuyển thư nội bộ, không phải email Internet.

## 2. Khởi động — ba terminal

Terminal Backend thứ nhất tại `Wolfari-backend`:

```powershell
node --version
corepack pnpm --version
docker info
corepack pnpm install --frozen-lockfile
corepack pnpm demo:init
corepack pnpm demo:start
```

Chờ launcher build/start xong, giữ terminal mở. Backend không hot reload; thay code phải restart. Không chạy `db:migrate` development vào demo.

Terminal Backend thứ hai:

```powershell
corepack pnpm demo:check
corepack pnpm demo:accounts
```

`demo:accounts` không in password hoặc xác nhận password còn đúng. Nếu `MISSING`, journal không chứng minh dữ liệu còn tồn tại. Đăng ký bộ tài khoản mới qua UI/Mailpit hoặc xử lý theo runbook; không tự reset/reseed dataset cũ. Mật khẩu đã đổi dùng Quên mật khẩu và Mailpit.

Terminal Web tại `Wolfari-web`:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm demo:build
corepack pnpm demo:preview
```

Mở Web5273 và Mailpit18025. `demo:preview` dùng bundle Gateway `dist-demo`, chỉ dành cho local; không phải server production. Không chạy `demo:dev` cùng lúc trên5273.

## 3. Dữ liệu đầu vào

| Actor | Quyền cần có | Không suy thêm quyền |
|---|---|---|
| Owner A | Tạo/sửa Trip, mời thành viên, policy, setup Fund | Không xác nhận nhận tiền thay Holder |
| Holder B | Consent đích nhận; reject/confirm contribution | Không tự có quyền sửa Plan |
| Editor C | Selected Editor; contribution200000 | Không quản lý membership/quỹ |
| Member D | Đọc Trip; contribution300000 | Không sửa Plan khi chưa được cấp |
| Outsider X | Tài khoản không tham gia Trip | Không đọc Trip/Plan/Fund |

Chuẩn bị tài khoản đã verify để tiết kiệm thời gian, nhưng giữ một EMAIL invite mới để trình diễn. Chọn Owner khác Holder cho kịch bản chính. Đừng tạo sẵn hai ledger IN nếu muốn trình diễn thao tác confirm; thao tác đã hoàn tất không nên làm lại trên cùng obligation.

Trên máy đã chuẩn bị bộ `Readiness Owner A`, `Readiness Holder B`, `Readiness Editor C`, `Readiness Member D`, `Readiness Outsider X`; cả5 đã verify qua Mailpit. Email/password nằm riêng trong Backend `.local/demo/readiness-20261102.json`, không ở tài liệu này. Chỉ mở file cục bộ khi chưa chia sẻ màn hình. Journal seed cũ được giữ và `demo:accounts` có thể báoMISSING cho bộ cũ.

`DEMO TEST — sẵn sàng report và confirm` đã có thành viên, Editor, Fund và hai khoản200000/300000 chưa report. Dùng nó khi muốn bắt đầu nhanh ở phần báo chuyển; nếu cần trình diễn đầy đủ create/invite/setup, tạo Trip TEST mới trong UI bằng cùng bộ actors. `TEST — Readiness smoke 500000` chỉ dùng xem kết quả/persistence đã kiểm chứng. Outsider phải giữ ngoài Trip dùng để minh họa giới hạn quyền; nếu mời thêm người, dùng tài khoản TEST khác.

## 4. Kịch bản chính 12–15 phút

| Thời gian | Người thao tác | Thao tác | Kết quả cần thấy |
|---|---|---|---|
| 0–2 phút | Owner | Login, Trip list, mở/tạo Trip với ngày và timezone | Trip lưu trên Backend, reload vẫn có |
| 2–4 phút | Owner/Member | Gửi EMAIL hoặc LINK, đúng recipient accept | Thành viên hiện trong roster, không seed SQL |
| 4–7 phút | Owner/Editor | SELECTED_MEMBERS, chọn Editor; thêm day-only, sửa giờ/overnight | Actor khác reload thấy cùng lịch; Member không tự có quyền sửa |
| 7–11 phút | Owner/Holder/Editor | Bật Fund TEST, chọn Holder, consent, tạo đợt thu; Editor report, Holder reject có lý do, Editor report lại, Holder confirm | Report/reject chưa tăng tiền; reason tồn tại sau reload; confirm mới ghi tiền |
| 11–13 phút | Member/Holder | Member report300000; Holder confirm | Balance500000, đúng2 dòngIN, FundOPEN |
| 13–15 phút | Owner | Inbox/Price Watch, reload xác nhận persistence | Nguồn giá ghiMOCK_FLIGHT; không nói đây là giá vé thật hoặc chuyển tiền thật |

Giao diện quỹ và Price Watch dùng panel biểu mẫu bên phải desktop/dưới nội dung khi hẹp. Không chờ modal cũ. Policy Plan là radio. Muốn đổi thao tác khi form đang mở: đóng form hiện tại trước, không mất draft ngoài ý muốn.

Finance delivery mặc định có thể bị tắt bằng feature flags; chỉ trình bày thông báo Finance nếu cấu hình demo và bằng chứng đã xác nhận. Inbox từ Trip không tự chứng minh Finance outbox. Price Watch là observation có timestamp, không cam kết giá hiện tại hoặc booking.

## 5. Kịch bản phụ — diễn tập trước, không bắt buộc trình bày

- Hai actor cùng sửa Plan: actor thứ hai nhận409, giữ draft, tải để đối chiếu và xác nhận trước khi lưu lại.
- Worker Price Watch có thể đổi version: nếu409, dùng **Tải lại để đối chiếu**, kiểm tra rồi gửi thao tác mới; không bỏ guard.
- Finance unavailable phải hiện lỗi, không số dư0. Chỉ fault-inject trên stack kiểm thử riêng, không instance trình diễn.
- Restart đúng launcher giữ Trip/Plan/ledger. Không reset để chứng minh persistence.
- Thu hồi Editor, remove/rejoin: assignment cũ không tự được phục hồi.
- Sau người khác accept invitation, Owner tải lại roster trước cấp Editor. Nếu membership conflict, UI giữ bản nháp; đọc quyền mới và xác nhận lại, không gọi đó là lưu thành công.
- Sau thao tác quỹ, nút tạo thao tác mới chờ các truy vấn phiên bản hoàn tất. Bản sửa đã qua focused HTTP mock, chưa đủ live post-fix; xem readiness trước demo. VớiUNKNOWN/PROCESSING/NEEDS_REVIEW phải dùng quy trình phục hồi hiện có, không tạo giao dịch thay thế.
- Sau xóa Plan, chờ thông báo hoàn tất trước reload. Nếu đã reload khi kết quả chưa được nhận và thao tác mới bị khóa, dùng kiểm tra/retry đúng yêu cầu hiện hữu; không xóa journal hoặc tạo thao tác thay thế.

## 6. Checklist diễn tập bắt buộc

Ghi ngày, cặp SHA, browser version, người thực hiện và PASS/FAIL cho từng lượt:

- [ ] Lượt1: hoàn thành toàn bộ kịch bản chính, đúng ledger/balance.
- [ ] Lượt2: bộ Trip/obligation TEST riêng, hoàn thành lại không workaround ngoài tài liệu.
- [ ] Ít nhất30 phút: navigation, idle/resume, reload, đổi tài khoản; không crash hoặc lỗi không giải thích.
- [ ] Edge desktop1366/1440 và viewport thấp; không che nút/sidebar/footer.
- [ ] Responsive Web820/402/320, không tràn ngang chặn thao tác.
- [ ] Native browser zoom200%, keyboard/Tab/Enter/Escape/focus return.
- [ ] Không lộ credentials/token hoặc draft actor khác.
- [ ] Dừng/chạy lại giữ dữ liệu; health/dependencies đạt sau restart.

CSS zoom và screenshot viewport không thay native browser zoom. Automation Chromium không thay hai lần diễn tập Edge.

Mẫu ghi nhận để gửi lại sau khi diễn tập (không kèm email/password/token):

```text
Ngày/giờ Việt Nam:
Web branch + SHA + có diff hay không:
Backend branch + SHA + có diff hay không:
Edge version (Settings > About Microsoft Edge):
Lượt 1: PASS/FAIL; thời lượng; tên Trip TEST; balance/ledger cuối:
Lượt 2: PASS/FAIL; thời lượng; tên Trip TEST khác; balance/ledger cuối:
30 phút: bắt đầu/kết thúc; idle/resume/reload/đổi actor:
1366/1440, 820/402/320, viewport thấp:
Native zoom 200%, Tab/Enter/Escape, focus return, scroll:
Lỗi còn lại: bước tái hiện, expected/actual, workaround đã dùng:
```

Không tickPASS nếu bỏ qua thao tác hoặc chỉ xem video. Nếu lỗi xuất hiện, giữ nguyên dataset, chụp vùng không chứa thông tin nhạy cảm và ghi bước gây lỗi. Hai lần thành công không thay CI/reviewer hoặc kiểm chứngmain.

## 7. Khi có sự cố

| Hiện tượng | Xử lý an toàn |
|---|---|
| Docker không kết nối | Mở Docker Desktop, chờ Linux engine rồi kiểm tra lại; không reset Docker |
| Port bận | Xác định process/launcher sở hữu; không kill mọiNode hoặc app khác |
| 401/CSRF | Giữ đúnglocalhost, login lại; không copy token vào storage |
| 409 | Tải/đối chiếu bản mới, giữ draft; không overwrite mù |
| 202/timeout/unknown | Không suy thất bại; giữ intent/key/body, dùng chức năng kiểm tra/retry đúng yêu cầu |
| NEEDS_REVIEW | Ghi operationID, khôi phục dependency và đối soát theo runbook Backend; không sửa SQL |
| Quỹ không tải | Kiểm Finance dependency; không báo balance0/chưa bật quỹ |
| Mật khẩu journal không dùng được | Reset qua UI/Mailpit nếu account còn tồn tại; không chạy seed để ép password |
| Lỗi chặn demo | Dừng thao tác ghi, ghi bước tái hiện; dùng evidence trước đó chỉ khi nói rõ là bản ghi, không giả live |

Dừng sau buổi demo ở Backend bằng `corepack pnpm demo:stop`; giữ volumes. Không `demo:reset`, `docker volume prune` hoặc `down -v` cho dataset người dùng.

Nguồn chuẩn: [runbook](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md), [readiness](demo-readiness-validation.md), [quy trình PR](HUONG_DAN_PR_VA_MERGE_MAIN.md).
