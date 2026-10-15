# Auth fixture / Home / Self profile — Phase 3

Implementation trên `ui/auth-fixture`, base `develop` tại `225093c`; dependency Trip List đã merge. Không Backend integration, Issue/PR hoặc route mới ngoài inventory.

| Figma → route | Actor → component | Mapping / gap |
| --- | --- | --- |
| Home `3:28`, `298:1642`, `317:2025`, `317:2028` → `/` | Guest/User → HomeRoute/HomePage | Public stories và inspiration từ HomeRepository (mock-only); User featured trip từ TripRepository, kiểm tra canRead/active membership. Packing/Finance unavailable |
| Login `298:1893`, `317:2026` → `/login` | Guest presentation → AuthPage | Validation local; valid submit unavailable, không session/token/redirect |
| Register `298:2007`, `317:2027` → `/register` | Guest presentation → AuthPage | Name/email/password/confirmation/checkbox; password 15–128 code points theo runtime thay placeholder 8 ký tự |
| Self `299:1847`, `317:2046`; editor `424:4048` → `/profile` | Authenticated Self → ProfilePage | Nullable avatar/verified/version; Mobile summary mở editor inline, giữ draft qua retry; save unavailable |

IdentityRepository chỉ readSelf/listSessions, cùng interface giữa fixture và Gateway. Session chỉ có ID và timestamps, không có device/IP/current marker. Preferences/push/upload/logout/revoke disabled; không bịa thành công. Auth pending/unknown là presentation scenario. Auth/Profile không có verified generic idempotency key; không tạo key giả.

Static Backend evidence tại `d8c02cb`: `identity-proxy.ts`, IdentityController/IdentityService, `identity-crypto.ts`. Identity read/auth routes runtime-candidate; notifications/push projection unavailable. Gateway mặc định unavailable/no HTTP. Fixture factories chỉ import ở DEV/preview; production build không chứa identity/home fixture records.

Home/Auth/Profile dùng document scroll, Desktop Auth hai cột, tablet giảm spacing/stack, Mobile title trong content/shared header/drawer, không native status/bottom tab. M04/M22 motion chỉ thuộc native tab nên không áp dụng. TravelCollage/ButtonLink là shared presentation, không import repository/fixture. Assets local từ Figma, fonts local; đã bỏ các asset mới không dùng.

Coverage: read loading/ready/empty/error/forbidden/not-found/conflict/unavailable; form validation/focus, pending/unknown/unavailable; Guest private-query guard kể cả retry/route aliases; draft/version/session read. Browser assertions giữ scroll, asset geometry, no API/token storage tại 1440×800, 1366×600/520, 1024/820/768 và 402/320. Chromium `naturalWidth` làm tròn SVG fractional dimensions; geometry assertion so kích thước làm tròn, không bỏ kiểm tra.

Validation commands và kết quả cuối cùng được ghi trong Figma implementation matrix. Screenshots nằm trong ignored `test-results/auth-fixture-Auth-public-layout-*`.
