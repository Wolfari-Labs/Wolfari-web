# Wolfari Web — UI State Matrix

## State vocabulary

| State              | Ý nghĩa                                | UI bắt buộc                                      |
| ------------------ | -------------------------------------- | ------------------------------------------------ |
| `loading`          | Chưa có dữ liệu dùng được              | Skeleton hoặc progress; không render dữ liệu giả |
| `success`          | Dữ liệu hợp lệ đã đọc được             | Nội dung chính và actions được phép              |
| `empty`            | Request thành công nhưng không có item | Empty explanation và CTA nếu capability cho phép |
| `validation-error` | Input không đạt schema                 | Field/form error; giữ input hợp lệ               |
| `forbidden`        | Server không cho đọc/thao tác          | Thông báo quyền; ẩn/disable action phù hợp       |
| `not-found`        | Resource/route không tồn tại           | Not-found state, không redirect im lặng          |
| `conflict`         | Revision/version đã cũ                 | Refetch/reload; không ghi đè version cũ          |
| `pending`          | Mutation/job đang xử lý                | Disable duplicate action; hiển thị tiến trình    |
| `unknown`          | Timeout/503 khiến kết quả chưa biết    | Không báo success; hướng dẫn retry/status check  |
| `unavailable`      | Capability chưa có runtime             | Giải thích giới hạn, không gọi API giả           |

## Screen matrix

Shell/route placeholder Phase 1 (bao gồm `/admin`): success = placeholder, cùng coverage loading/empty/error/forbidden/not-found/conflict/unavailable. Không có command, nên validation/pending/unknown write không áp dụng. Fixture scenario `admin` giữ cùng shape với `success`, khai báo `systemRole=ADMIN` và không cấp quyền Trip; `forbidden-snapshot` trả snapshot có `canRead=false` để kiểm tra không render outlet private.

`admin` không cấp quyền Trip; `/admin` mặc định với USER vẫn forbidden. Fixture chỉ có một Trip preview đã khai báo; Trip ID khác trả not-found, không tạo projection/quyền từ URL. Unknown route hiển thị 404 ngay cả khi Gateway shell chưa khả dụng.

Evidence Phase 1 ngày 15/10/2026: 40 unit/component/proxy tests và 24 browser tests đạt. Browser state contract được kiểm tra trên 9 route placeholder trong `tests/e2e/app-shell.spec.ts`; permission từ ready snapshot được kiểm tra thêm trong `tests/shell-navigation.test.tsx` và `tests/shell-repository.test.ts`. Matrix feature bên dưới là yêu cầu cho flow sau, không khẳng định các mutation đã được triển khai.

| Screen         | Loading                            | Empty                              | Error                    | Forbidden                               | Conflict                             | Pending/unknown                   |
| -------------- | ---------------------------------- | ---------------------------------- | ------------------------ | --------------------------------------- | ------------------------------------ | --------------------------------- |
| Home           | Có nếu bootstrap data              | Chưa có trip                       | Retry                    | Không áp dụng private data              | Không                                | Không                             |
| Login/Register | Submit pending                     | Không                              | Credentials/rate/service | Không                                   | Không                                | Không báo thành công sớm          |
| Trip list      | Skeleton list                      | Empty + create nếu được phép       | Retry                    | Session/route guard                     | Create conflict                      | Create timeout = unknown          |
| Trip overview  | Skeleton                           | Projection thiếu                   | Retry                    | Có                                      | Có nếu update                        | Update pending/unknown            |
| Plan           | Timeline skeleton                  | Empty timeline + add nếu được phép | Retry                    | Read/write tách biệt                    | Bắt buộc                             | Activity mutation                 |
| Members        | List skeleton                      | Chưa có member ngoài current       | Retry                    | Membership forbidden                    | Membership revision                  | Invitation pending                |
| Invitations    | Preview skeleton                   | Không áp dụng                      | Expired/revoked/used     | Login/permission                        | Membership revision                  | Accept/decline pending            |
| Finance        | Chờ runtime                        | Không giả lập                      | Provider/service         | Role-based                              | Finance version                      | Payment/callback unknown          |
| Export/share   | Job skeleton                       | Chưa có export                     | Failed/expired           | Download forbidden                      | Captured version                     | Queued/processing                 |
| Admin          | Shell loading; dashboard tương lai | Empty shell                        | Retry read               | ADMIN từ snapshot, USER/Guest forbidden | Shell conflict; job/config tương lai | Không ở Phase 1; action tương lai |

## Permission display rules

1. `canRead=false`: không render dữ liệu private; hiển thị forbidden.
2. `canUpdate=false`: có thể render read-only nếu `canRead=true`, nhưng không render write actions.
3. Client chỉ dùng permission để điều hướng/hiển thị; Backend luôn kiểm tra lại.
4. Không suy ra role từ tên người dùng hoặc URL.
5. Khi permission thay đổi sau khi load, map 403 về forbidden và invalidate query liên quan.

## Mutation state rules

```text
idle → validating → pending → success → refetch
                         ├→ validation-error
                         ├→ forbidden
                         ├→ conflict → refetch → user decision
                         └→ unknown → retry/status read với cùng intent nếu contract cho phép
```

Không được chuyển trực tiếp `pending → success` bằng fixture trong production path. Fixture chỉ được tạo response deterministic cho preview và test.

## Inventory state profiles

Profiles nối [full frame map](figma-screen-map-2026-10-15.md) với contract tương lai, là required coverage, **không phải feature test result hoặc Figma variants đã có**. Shell Phase 1 giữ coverage phía trên.

| Profile    | Required states                                                                                                                                                                 | Giới hạn                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| READ       | loading, success, empty, error, forbidden, not-found, unavailable                                                                                                               | Conflict chỉ ở related versioned use-case; không read mutation        |
| AUTH       | loading, success: accepted/session-confirmed only, validation-error, error, forbidden, pending, unknown, unavailable                                                            | Register accepted, login verified session; không invented version/key |
| FORM       | loading, success, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable                                                                 | Pending/unknown chỉ actual command/job; không fixture server success  |
| PLAN       | loading, success, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable                                                                 | Pending/unknown chỉ actual command/job; không fixture server success  |
| PROVIDER   | loading, success, empty, error, forbidden, conflict: write only, pending: write only, unknown: write/provider result, unavailable, stale/provider-error                         | Pending/unknown chỉ actual command/job; không fixture server success  |
| FINANCE    | loading, success: server-confirmed only, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable, OPEN/CLOSING/CLOSED: target source only | Pending/unknown chỉ actual command/job; không fixture server success  |
| INVITATION | loading, success, empty: management only, validation-error, error, forbidden, conflict, pending: writes, unknown: writes, not-found, unavailable, expired/revoked/used          | Pending/unknown chỉ actual command/job; không fixture server success  |
| LIFECYCLE  | loading, success: server-confirmed only, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable, blocked/recovery                        | Pending/unknown chỉ actual command/job; không fixture server success  |
| JOB        | loading, success: server-confirmed only, empty, error, forbidden, conflict, pending: queued/processing, unknown, not-found, unavailable, failed/expired/revoked                 | Pending/unknown chỉ actual command/job; không fixture server success  |
| PUBLIC     | loading, success: server whitelist only, empty, validation-error: password, error, forbidden, not-found, unavailable, expired/revoked/password-required                         | Pending/unknown chỉ actual command/job; không fixture server success  |
| ADMIN      | loading, success: server-confirmed only, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable                                          | Pending/unknown chỉ actual command/job; không fixture server success  |
| COMPONENT  | default/selected/focus/pressed/disabled/error where source variant exists; no business state                                                                                    | Presentation-only, no server success                                  |

### Source state / required state

- Saved/completed/create, Finance OPEN/CLOSING/CLOSED, Owner transfer blocked, export đang tạo, packing Checked/count/confetti đều là prototype source, không persisted state.
- Observed component variants: Button Default/Pressed/Disabled, Field Default/Focus/Error, Chip Selected, Switch On/Off, Checklist Checked, Progress In progress/Complete, Status Info/Success/Warning. Không có dedicated loading/empty/forbidden/conflict/pending/unknown variants cho mọi feature; bổ sung theo contract.
- Permission/state theo actor hiện hành; public whitelist không chứa private forbidden payload. Provider/payment/job bất định không biến thành price/balance 0 hoặc saved.
- Lifecycle default flag false → unavailable; accepted receipt recovery PROCESSING/PENDING_RECOVERY/NEEDS_REVIEW không SUCCEEDED. Packing Self completion/reassignment cần command riêng, không Activity completion.
- Unwired/generic controls và detached frame có unknown capability phải disabled/unavailable đến khi có quyết định/evidence.

## Phase 2 — Presentation state coverage

- Button: default, hover ở pointer hỗ trợ, focus-visible, pressed, disabled, loading; loading giữ accessible label và chặn callback, không tự chuyển sang saved.
- Input/Select: native default/focus/disabled/error, unique label, hint/error qua `aria-describedby`, `aria-invalid`; lỗi demo giữ input. Select native có keyboard behavior, không fake listbox.
- Alert: static demo không live; dynamic error `alert`, info/success/warning `status`. Tone success chỉ là presentation prop, không bằng chứng mutation thành công.
- ContentState: loading/placeholder/empty/error/forbidden/not-found/conflict/unavailable giữ nguyên; skeleton decorative, busy state semantic; retry dùng callback đúng read policy. Error không có details vẫn hiển thị lỗi service, không rơi vào placeholder.
- Drawer/nav: closed không tab-order; modal focus trap, Escape/backdrop/close focus return, internal scroll/body lock; selected/disabled không cấp permission.
- Component pending/loading không có server operation; unknown/conflict/forbidden của feature vẫn thuộc owning model/repository. Không tạo shared business state machine.

Sandbox và acceptance theo [shared UI contract](screen-contracts.md#contract-shared-ui-foundation) / [Phase 2 handoff](design-system-phase2.md).
