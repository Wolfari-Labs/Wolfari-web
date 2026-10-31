# CP-02 — Home/Auth Web: đặc tả bám nguồn

30/10/2026; HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`. W04-B **SPEC_COMPLETE_FOR_REVIEW**, W05-B Home/Auth slice complete ở mức source/code mapping. Không phải user approval, implementation hay runtime QA. Phân loại theo [DESIGN_DELTAS](DESIGN_DELTAS.md); mọi adaptation chưa duyệt vẫn `DELTA_PENDING`.

## 1. Nguồn và composition

[Evidence sáu ảnh](evidence/cp02/figma-home-auth-review-2026-10-30/README.md) thuộc file chính thức; đã mở xem, không resurvey inventory. Kích thước là frame, không phải viewport đã chạy app.

| Source | Composition phải giữ | Giới hạn |
|---|---|---|
| Guest `768:5376`, 1440×2144 | Header logo trái/nav giữa/auth phải → hero copy trái và collage phải → feature intro + 6 features → device preview → 4 story cards + quote → scenic CTA. Giữ cloud/mascot/paper/photo language. | Không rút Home thành hero + cards mới; copy chức năng phải phản ánh capabilities thật. |
| User `768:5746`, 1440×800 | Cùng hero; header đổi thành Chuyến đi của tôi/Lên lịch/notifications/account. | Frame chỉ hiển thị hero và đầu features; không suy rằng các section dưới đã bị loại bỏ. Không dùng tên/avatar mẫu làm session thật. |
| Login `768:6118`, 1440×960 | Header 76px; introduction/collage ở trái, form card bên phải. Card source khoảng x886/y166/w440; email → password → explanatory note → submit → alternate auth → info panel. | Tọa độ đọc từ ảnh chỉ làm anchor; không copy absolute positioning vào responsive code. |
| Register `768:6211`, 1440×960 | Cùng family; title hai dòng bên trái; card khoảng x876/y142/w458; email/password/confirmation → validation note → CTA → login. | Full name/consent hiện có trong runtime không thể bị bỏ vì ảnh không thể hiện. |
| Web402 Home `780:6444`, 402×4342 | Logo trái/Menu phải; hero text → stacked CTAs → collage; features 2 cột; preview copy/device/CTA; stories 1 cột → quote → final CTA/art. | Responsive website, không native chrome. Không fixed-height 4342px trong app. |
| Web402 menu `783:6655`, 402×874 | White left drawer rộng khoảng300px trong ảnh, backdrop bên phải; logo/Đóng trên; trip routes; active Quỹ nhóm; mascot dưới. | Đây là **trip** menu, không phải guest Home menu. Public nav phải giữ routes đúng context. Width đo ảnh chưa là token extract; current token280px là khác biệt cần review. |

## 2. Current implementation → source mapping

| Owner | Đã có, cần tái sử dụng | Sai khác cần review |
|---|---|---|
| [HomePage](../../src/features/home/HomePage.tsx), [CSS](../../src/features/home/HomePage.module.css) | Đủ 5 section theo source order; Figma assets, TravelCollage; guest/user CTA; model loading/empty/error/retry. Max content1440; hero grid608:650; feature grid4 cột desktop. | HMA01: video CTA source hiện là anchor tính năng. HMA02: capability/editorial copy khác source. DLT05: handwritten font hiện Patrick Hand không được coi đã match source. |
| [AuthPage](../../src/features/auth/AuthPage.tsx), [CSS](../../src/features/auth/AuthPage.module.css) | Shared login/register, introduction/collage/card, shared Input/Button/Alert, field validation + first invalid focus, safeReturnTo, useIdentityTask. | HMA03: fullName/consent/forgot link; source info note chưa được render như ảnh; current radius24/shadow không tự chứng minh source card24. Cần node-specific token reconciliation trước CP04. |
| [AppShell](../../src/features/shell/components/AppShell.tsx) | Guest/account nav, guarded Plan link, Notifications, safe route focus, public/trip/admin drawer content. | HMA04: current narrow header hamburger trái/logo giữa/account phải khác Web402 logo trái/Menu phải; drawer generic heading, không logo/mascot source. |
| [IdentityActionPage](../../src/features/auth/IdentityActionPage.tsx) | Forgot/verify/reset đã có thật; reuse Auth CSS/form primitives. | HMA05: dedicated Web frame chưa xác định; detailed state placement bên dưới là extension proposal, không nguồn đã duyệt. |

Không lấy `data-node-id` cũ trong JSX làm bằng chứng official-source match. Không rewrite shared components/serializers vì đổi style; không dùng Figma-generated Tailwind như source implementation.

## 3. Home actions và dữ liệu

- Hero primary: hiện guest→`/register`, viewer→`/trips`; secondary→`#home-features`. Footer và preview CTA cùng safe route logic. HMA01 cần review label/target; không dựng video player khi chưa có video nguồn/quyền sử dụng.
- Source có “Xem tất cả”, heart icons/story photos, promises tối ưu lịch/giá/thời gian thực. Runtime stories là editorial, không remote recommendations/favorites workflow. Giữ illustration label; không biến decorative heart thành nút lưu giả. HMA02 trình copy thực tế, không thêm service.
- HomeRoute/model trạng thái loading không giả guest authenticated, stories error không biến thành list thành công. `SERVICE_UNAVAILABLE` non-retryable→unavailable; retry chỉ theo model. Các section tĩnh vẫn giữ; error thay đúng vùng stories.
- Device photo trong source không cấp scope mobile app. Giữ asset minh họa, đề xuất copy “trình duyệt trên máy tính và điện thoại” để rõ Web-only (HMA02); không tự thay device image.

## 4. Auth fields/contracts — PRESERVE_RUNTIME

| Field/action | Invariant |
|---|---|
| Login email/password | Email trim, format/max255; password không trim, không put vào URL. Autocomplete email/current-password; login không ép password15+ như register. |
| Register fullName | Required trimmed1–150; repository intent fullName; không bỏ field vì source chỉ có3 inputs. |
| Register email/password/confirmation | Email như login; password15–128 Unicode code points; confirmation phải khớp, new-password autocomplete. Confirmation chỉ UI, không gửi như API field mới. |
| acceptedTerms | Current client validation gate, không phải chứng minh Backend đã lưu consent. Text error còn nói “xem trước” cả Gateway; HMA03 cần review copy, không tự thêm payload consent. |
| Submit | useIdentityTask pending/abort; reject duplicate submit. Session manager/repository owns login/register/session/CSRF, không tự fetch từ form mới. |
| Login success | Navigate `safeReturnTo` với replace, sau repository success; không theo animation. Preserve safe internal returnTo qua chuyển login/register. |
| Register accepted | “Yêu cầu đăng ký đã được tiếp nhận… kiểm tra hộp thư…”; không auto-login hay khẳng định email tồn tại. |
| Forgot | POST `/api/v1/auth/password-reset-requests`, email; neutral accepted message, không account enumeration. |
| Verify | POST `/api/v1/auth/email-verifications/confirm`, token. Explicit submit; missing token disable; accepted→login notice, không auto-login. |
| Reset | POST `/api/v1/auth/password-resets`, token/new_password; confirmation local; accepted clear secret/session rồi login. |

Owner: [Identity repository](../../src/infrastructure/repositories/identity.gateway-repository.ts), [validation](../../src/features/auth/model/auth-validation.ts), [safe return](../../src/app/safe-return-to.ts). Token capture/scrub trong IdentityActionPage phải giữ; không lưu token vào docs/telemetry/local storage. Current success redirect600ms là runtime timing, không Figma motion duration.

## 5. State placement và recovery — HMA03/HMA05 pending visual review

| State | Presentation trong source family | Hành vi cần giữ |
|---|---|---|
| Idle | Persistent label trên inputs; descriptive note tại vùng note source | Không placeholder-only, password manager hoạt động. |
| Client invalid | Field error dưới field; consent error liền checkbox | Giữ values; focus first invalid; không gửi request. |
| Pending | Submit giữ label + busy/status; reserved feedback area dưới CTA | Không double submit; không làm card biến mất. Current fields vẫn editable: freeze/edit policy cần review, không mô tả đã disabled toàn form. |
| Credential invalid | Alert gần form, copy trung lập | Không tiết lộ tài khoản có tồn tại. |
| Rate limited | Persistent error, thử lại theo current result | Không dựng countdown nếu response không cung cấp. |
| Offline/server error | Giữ form + readable error, manual retry | Không tự retry mutation, không success từ local state. |
| Register accepted | Info/success region nói đã tiếp nhận và hướng dẫn email | Chưa authenticated; không tự chuyển trips. |
| Forgot accepted | Neutral info trong card, email retained | Không nói đã gửi thư thành công hoặc xác minh delivery. |
| Verify/reset missing/invalid token | Error trong card + login recovery link | Không hiện token thô; reload sau scrub có thể mất token và phải báo thiếu, không invent recover token storage. |
| Verify/reset completed | Text confirmed state và login destination | Current600ms redirect cleanup; giữ login notice. Manual-link/timing accessibility improvement nếu cần là HMA05. |
| Auth outcome ambiguous | Không tự tuyên bố đã tạo phiên/tài khoản | Auth không dùng Finance operation polling. Preview unknown là minh họa, không chứng minh Gateway unknown recovery đã có. |
| Preview/fixture unavailable | Giữ nhãn demo/preview và explanatory Alert | Không tạo phiên Gateway hoặc nói email đã gửi. |
| Route/unmount/late response | Task cleanup/abort, correct context | Không đưa notice cũ sang route/actor mới. |

Forgot/verify/reset gap composition đề xuất giữ shell + introduction trái/card phải trên1440; nội dung card action-specific theo bảng; narrow dùng một cột, error không overlay lên CTA. Không thêm wizard/modal mới.

## 6. Web reflow, keyboard, motion và assets

- Home402 theo source mục1; current CSS còn các breakpoints1320/1000/768/480/360, không đổi tự động. Auth current769–1439 dùng fluid2 columns;<=768 introduction rồi card, collage nhỏ;<=360 padding16/card18. Đây là runtime, **không dedicated Auth402 source** (DLT09/HMA05).
- Proposal320/402: inputs/buttons đủ width với min-width0, wrap prose/consent/alternate links; no global horizontal scrollbar; không giấu fullName/error/consent. 768/820 và short1366×520/600: card height intrinsic, document scroll tới submit; không ép collage/form cùng height hoặc bỏ brand. Kiểm tra trước khi duyệt breakpoint mới.
- Drawer: reuse Radix focus trap/Escape/focus return/menu trigger; preserve body-scroll cleanup. Header reordering phải giữ DOM tab order, aria-expanded/label và đúng public/trip routes; decoration không chiếm chỗ navigation khi short-height. Không thêm bottom tab bar.
- Input liên kết error/label; Alert live vừa đủ; loading announcement không lặp. Focus-visible và skip link không bị crop bởi overflow. Source không có state chưa đủ chứng minh accessibility PASS.
- Home cloud/photo/mascot là static, không parallax/loop/reveal mặc định. Current shell160ms hover, Drawer260ms enter/180ms exit là existing behavior; DLT08 chưa approve thay duration. Reduced motion cần kiểm tra global override cùng component CSS, không kết luận chỉ từ `.drawer { transition:none }`.
- Exact assets từ shared/assets/figma + TravelCollage; không redraw logo/mascot, đổi cảnh bằng AI hay embed screenshot nguyên màn làm UI. Font/glyph/gradient/card-radius mismatches thuộc DLT04/05, không bình quân về token chung.

## 7. Acceptance handoff CP04, chưa chạy trong CP02

Source/static comparison complete cho sáu ảnh; code read-only tại HEAD trên. Browser capture, runtime visual comparison, native200% zoom, screen-reader, reduced-motion, accessibility contrast audit, lint/typecheck/unit/build/E2E **NOT_RUN trong work unit này**. CP01 baseline giữ nguyên.

CP04 phải có1440 và402 matched screenshots (guest/user/login/register, error/accepted),320/768/820/short-height reachability, keyboard drawer/auth recovery, safe returnTo malicious URL tests, token scrub, register202 not-login, no duplicate submit/late-result leak; fixture/HTTP mocks/live Backend ghi riêng. Không được nghiệm thu pixel fidelity từ source screenshots hoặc code đọc tĩnh.
