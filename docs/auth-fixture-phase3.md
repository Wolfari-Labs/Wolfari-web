# Auth fixture / Home / Self profile — Phase 3

Implementation trên `ui/auth-fixture`, base `develop` tại `225093c`; dependency Trip List đã merge. Không Backend integration, Issue/PR hoặc route mới ngoài inventory.

Reconcile Guest entry: fresh visit `/` mặc định Guest như `/login` và `/register`, thay vì tự chọn User. User Home vẫn duyệt qua shell preview `success`; lựa chọn chỉ sống trong SPA navigation, không tạo session hoặc lưu storage. Private fixture route direct entry giữ User preview. Home Guest không gọi private TripRepository, kể cả retry.

Guest entry verification: lint, typecheck, 164 unit/component tests, production/preview builds và 36 Chromium Auth/App Shell tests đạt. Đã xem screenshots Guest 1440×800 và 402×874; browser coverage thêm short laptop/tablet/320px. Screenshots ở ignored `test-results/guest-home-review/`. Một lần chạy unit song song Chromium bị timeout chờ Trip List; chạy lại đầy đủ sau browser đạt 164/164, không đổi assertion hoặc timeout.

| Figma → route | Actor → component | Mapping / gap |
| --- | --- | --- |
| Home `3:28`, `298:1642`, `317:2025`, `317:2028` → `/` | Guest/User → HomeRoute/HomePage | Public stories và inspiration từ HomeRepository (mock-only); User featured trip từ TripRepository, kiểm tra canRead/active membership. Packing/Finance unavailable |
| Login `298:1893`, `317:2026` → `/login` | Guest presentation → AuthPage | Validation local; sample demo đúng → User Home với banner demo, sai giữ form/error. Không Backend session/token; Gateway không có demo capability |
| Register `298:2007`, `317:2027` → `/register` | Guest presentation → AuthPage | Name/email/password/confirmation/checkbox; password 15–128 code points theo runtime thay placeholder 8 ký tự |
| Self `299:1847`, `317:2046`; editor `424:4048` → `/profile` | Authenticated Self → ProfilePage | Nullable avatar/verified/version; Mobile summary mở editor inline, giữ draft qua retry; save unavailable |

IdentityRepository chỉ readSelf/listSessions, cùng interface giữa fixture và Gateway. Session chỉ có ID và timestamps, không có device/IP/current marker. Preferences/push/upload/logout/revoke disabled; không bịa thành công. Auth pending/unknown là presentation scenario. Auth/Profile không có verified generic idempotency key; không tạo key giả.

Static Backend evidence tại `d8c02cb`: `identity-proxy.ts`, IdentityController/IdentityService, `identity-crypto.ts`. Identity read/auth routes runtime-candidate; notifications/push projection unavailable. Gateway mặc định unavailable/no HTTP. Fixture factories chỉ import ở DEV/preview; production build không chứa identity/home fixture records.

User-requested demo account: `trang.nguyen@example.com` / `WolfariDemo2026!`, cùng identity fixture Trang Nguyễn. `infrastructure/fixtures/demo-access.ts` cung cấp capability presentation `DemoAccess`; bootstrap chỉ inject trong fixture DEV/preview. AuthPage nhận account/callback qua route context, không import fixture hoặc gọi transport. Đây không phải Identity login method/response giả: sample match chỉ chuyển shell User preview, banner luôn nêu phiên demo, thoát về Guest và reload Home không giữ phiên. Sai password/email không activate; email trim/case-insensitive, password so khớp nguyên văn. Nút điền mẫu không tự submit. Register không tạo tài khoản, không token/cookie/storage hoặc revision change. Sample panel/banner là Web preview extension do người dùng yêu cầu, không Figma-exported component hoặc runtime-ready evidence.

Demo verification: lint/typecheck, 166 unit/component tests, build và build:preview đạt; production scan không có sample password hoặc fixture modules. 26 App Shell browser cases đạt; sau sửa locator để dùng drawer Mobile, cả 12 Auth/browser cases đạt (output `test-results/demo-login-final`). Không bỏ assertion hoặc tăng timeout. Bao phủ sai thông tin, fill sample, Home User, Trip List qua navigation, thoát, reload Home, no API/storage; layout và assets tại 1440/1366×600/520/1024/820/768/402/320, đã xem screenshots Login Desktop/Mobile.

Home/Auth/Profile dùng document scroll, Desktop Auth hai cột, tablet giảm spacing/stack, Mobile title trong content/shared header/drawer, không native status/bottom tab. M04/M22 motion chỉ thuộc native tab nên không áp dụng. TravelCollage/ButtonLink là shared presentation, không import repository/fixture. Assets local từ Figma, fonts local; đã bỏ các asset mới không dùng.

Coverage: read loading/ready/empty/error/forbidden/not-found/conflict/unavailable; form validation/focus, pending/unknown/unavailable; Guest private-query guard kể cả retry/route aliases; draft/version/session read. Browser assertions giữ scroll, asset geometry, no API/token storage tại 1440×800, 1366×600/520, 1024/820/768 và 402/320. Chromium `naturalWidth` làm tròn SVG fractional dimensions; geometry assertion so kích thước làm tròn, không bỏ kiểm tra.

Validation commands và kết quả cuối cùng được ghi trong Figma implementation matrix. Screenshots nằm trong ignored `test-results/auth-fixture-Auth-public-layout-*`.
