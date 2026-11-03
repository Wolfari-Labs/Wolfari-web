# CP-02 — Thành viên và lời mời Web

30/10/2026; W04-D **SPEC_COMPLETE_FOR_REVIEW**, W05-D mapping slice. HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`. Không sửa app/Backend, không gửi lời mời hoặc thay membership/policy thật. Review deltas ở [DESIGN_DELTAS](DESIGN_DELTAS.md).

## 1. Source composition

Đã mở source [Members768:7492](evidence/figma-official/768-7492.png), [recipient299:2010](evidence/figma-official/299-2010.png), [invite475:2294/policy475:2530](evidence/cp02/figma-fund-members-review-2026-10-30/README.md).

- Workspace1440×960: header/sidebar → breadcrumb/landscape banner →3 tabs Thành viên/Lời mời/Quyền sửa Plan → primary content và side guidance. Giữ source hierarchy, blue/teal active treatment, avatar/member rows và role responsibilities tách biệt.
- Members: danh sách trái, role/guidance phải; count4/6 và tên mẫu không được dùng làm runtime fallback. “Chuyển Owner” có trong source nhưng không wired; không triển khai vì xuất hiện trong frame.
- Invite: email form trái, pending cards phải, resend/revoke và explanatory panels. Runtime còn LINK mode/status filter; bổ sung vào cùng vùng theo MBR02, không tạo route/modal mới.
- Policy: source3 radio cards OWNER_ONLY/ALL_MEMBERS/SELECTED_MEMBERS, checkbox list dưới và submit; explanatory cards phải. Runtime dùng Select. MBR03 đề xuất dùng native radio semantics source, giữ exact model và validators.
- Recipient: public shell + centered card khoảng740px, mascot/title/inviter, metadata2 cột, warning và decline/accept cuối card. Runtime preview không cung cấp đầy đủ dates/counts như ảnh; giữ hierarchy nhưng không dựng metadata giả.

## 2. Current owners và deltas

| ID | Current/source gap | Đề xuất review — DELTA_PENDING |
|---|---|---|
| MBR01 | Source Owner transfer/Holder badge/count4/6; current no transfer, member view không luôn có Fund authority | Giữ roles đúng data; không tạo chuyển Owner. Holder chỉ hiển thị khi có authoritative Fund projection, thiếu thì không suy từ Owner. Count chỉ loaded/total có thật. |
| MBR02 | Source email-only invite; current EMAIL/LINK + filter, one-time link, retry/inline revoke confirmation | Giữ đúng source form/list placement; đưa mode selector và feedback/secret region vào form, filter trên list. Không bỏ tính năng hiện hữu vì ảnh thiếu. |
| MBR03 | Source radio-card policy; runtime Select với draft/journal/unknown lock | Source-style radio group là view adaptation; giữ membership IDs, sorted intent/version, locks, recovery. Không dùng user IDs thay membership IDs. |
| MBR04 | Source recipient dates/count/role; current preview tripName/inviter/expiresAt/status | Card chứa dữ liệu thực, expiry và recipient guidance; không fake dates/counts. Missing-token/login/wrong-account/expired states trong cùng family. |
| MBR05 | No dedicated Members narrow/short-height frame; operation/source missing states | Responsive extension và persistent status theo mục4/5; không gọi đây là frame đã được thiết kế trong Figma. |

Reuse [GatewayMembersPage](../../src/features/members/GatewayMembersPage.tsx), [InvitationManagement](../../src/features/members/InvitationManagement.tsx), [InvitationPage](../../src/features/members/InvitationPage.tsx), shared Avatar/Badge/Input/Select/Button/Alert/Drawer/OperationStatus. Tách view/panel nếu cần CP08; command/request owner không remount tùy tiện khi restyle tab.

## 3. Field/action mapping và bốn cơ chế async khác nhau

| Family/action | Fields, endpoint và invariants |
|---|---|
| Member read | GET `/api/v1/trips/{tripId}/members`; includeLeft, cursor, limit; actor/readable guard; dedupe membership.id; “đã tải” không tổng membership. |
| Remove/leave | DELETE `/trips/{tripId}/members/{membershipId}` hoặc POST `/trips/{tripId}/leave`; trimmed nonempty reason≤1000 + expected_membership_revision. Owner removes active nonowner; nonowner leaves self. Finance obligations server authority; don't preemptively remove row. |
| Policy GET/PUT | `/trips/{tripId}/plan-policy`; OWNER_ONLY/ALL_MEMBERS/SELECTED_MEMBERS, editorMemberIds = membership IDs, expectedMembershipRevision + idempotency key. SELECTED sorted; other modes send empty request list while inactive assignments may remain in receipt. |
| Policy success/retry | Dedicated sessionStorage intent scoped actor+Trip, not Finance coordinator. Unknown keeps same key/list/revision, fields locked. Success verifies refetched authority against **receipt**, not submitted empty list. Error retains draft and reload guidance; storage failure blocks writes. |
| Invite create | POST `/trips/{tripId}/invitations`; EMAIL normalized trim/lowercase or LINK; expected membership revision, expiresAt:null + key; no arbitrary expiry editor. Owner/read/update/active membership/nonarchived guard. |
| Resend/revoke | POST `/trips/{tripId}/invitations/{id}/resend` or `/revoke`; expected invitation version + key. Resend EMAIL only/PENDING; revoke explicit inline confirmation; terminal status cannot resume membership. |
| Invitation owner attempts | Memory-only retained attempt by Trip+membership scope; SERVICE_UNAVAILABLE keeps immutable attempt. Not Finance `/operations` polling. One-time LINK shown once; tab/session/permission change clears; retry may not return link, require revoke before new create. |
| Recipient preview | POST `/invitations/preview`, token only inside request; query key uses nonsecret revision. Session unknown loading; anonymous/expired safe login/register returnTo invitations. |
| Accept/decline | POST `/invitations/accept` or `/decline`, token + same idempotency key during retry. Memory-only attempt locks opposite action. Authority stale requires preview refresh; success receipt authoritative, do not re-preview consumed token. Accept refresh projections then trip navigation; decline clears token and shows result. |

All endpoint paths above prefix `/api/v1`. Exact serializers: [membership repo](../../src/infrastructure/repositories/membership.gateway-repository.ts), [invitation repo](../../src/infrastructure/repositories/invitation.gateway-repository.ts), Trip repository. No new endpoint/body field.

**Do not unify all mutations into OperationStatus:** remove/leave use shared coordinator; policy has journal+receipt reconciliation; owner invitations retain memory attempt; recipient has token-scoped response attempt. Current InvitationPage returns definitive receipt/error, not Finance PROCESSING lifecycle. Preserve each mechanism. Owner does not gain Fund confirmation permissions through PlanEditPolicy.

Secret behavior: [invitation-token](../../src/features/members/invitation-token.ts) captures valid fragment at entry, scrubs URL, stores memory only. Reload needs original link; no durable token/query-key/storage/telemetry/captured screenshot. Same valid token reopened does not reset unresolved intent. `/invitations/local` keeps mode boundary, never fake production acceptance.

## 4. State placement matrix

Presentation extensions below MBR02/04/05 pending review; semantics from current code preserved.

| State/event | Visible result and safe action |
|---|---|
| Actor/Trip loading | Main ContentState; do not flash Owner controls. |
| Read denied/left membership | Error + trips exit; lifecycle operation status stays accessible above denied content. |
| Members loaded | Identity/role/Bạn/Đã rời, include-left control, loaded count and load more. |
| Initial empty/loading not distinguished in current list | Propose ContentState in list without hiding shell; no pretend total0 before response. |
| Pagination error | Keep loaded rows, retry next page; no full-screen replacement or fake last-page. |
| Archived | Read remains where allowed; writes disabled with reason. |
| Lifecycle pending/unknown/review/blocked | OperationStatus persistent outside Drawer/tabs, same recovery rules as Fund; request persists after Drawer closes. |
| Lifecycle finance obligation blocked | Explain outstanding responsibilities/contributions, keep membership, no bypass/forced leave. |
| Policy loading/error | Inline state replacing form body; no default OWNER_ONLY assumed while unknown. |
| Policy dirty/conflict | Keep selected membership IDs/draft; refresh current policy and explicit re-confirm; no silent overwrite. |
| Policy unknown/restored intent | Freeze choices and show retry same request, not clear journal to unlock. |
| Policy accepted/read refresh mismatch | Explain unresolved authority; retain intent, no early “đã lưu” from animation. |
| Invite invalid email | Linked field error/focus; no request. |
| Invite processing/ambiguous | Persistent form warning + retry same intent; locked new create/resend/revoke. |
| Invite EMAIL accepted | “Yêu cầu gửi đã được tiếp nhận”, not delivery confirmation. |
| Invite LINK ready/copy failure/closed | One-time warning; copy success only after clipboard succeeds; manual selection fallback; closed link cannot redisplay. |
| Invite pending/terminal/expired/revoked | Accurate label/expiry/filter; no pending action for terminal state; no guessed email identity. |
| Recipient token missing | Explain reopen original link; do not construct token or redirect endlessly. |
| Recipient session loading/anonymous | Loading or login/register with internal returnTo; token stays memory within current session flow. |
| Recipient wrong account/unverified | Readable reason, profile/email guidance + change account; no accept bypass. |
| Recipient pending decision | Accept/decline buttons; busy prevents duplicate; ambiguous locks opposite action and offers retry same action. |
| Recipient stale/invalid/consumed | Refresh when appropriate, no action on stale preview; success uses receipt rather than requiring consumed token preview. |
| Actor/token/Trip switch | Abort/ignore old result, clear appropriate attempts/query projections/secret. |

## 5. Responsive, keyboard, motion

Desktop keeps3-tab strip, source member/invite/policy compositions and role guidance. Existing `role=group` buttons use aria-pressed, not ARIA tabs; keep semantics or implement full tab keyboard model with focus tests when adopting source styling. Radio-card policy requires fieldset/legend/native radio arrows. Labels/checks target44px, long names/emails wrap; source tiny text is not fixed line-height constraint.

402/320 proposed: same Web drawer; banner content wraps →3 wrapping controls → primary list/form → guidance; invite form before invitation list; recipient metadata one column with stacked actions, preserving decline/accept distinction. Source780:6444/783:6655 establishes shared Web pattern, not dedicated member composition. No native tabs. 768/820 side guidance may stack; short-height document/content scroll reaches lifecycle/policy submit; do not remove banner or status to force first row visible. Focus returns to origin after cancel, safe main/list fallback when row no longer exists requires CP08 test.

No animation-triggered removal/acceptance; source/current transitions only after authority. New motion DLT08 pending. Reduced-motion and accessible live regions must preserve announcement without replay loops. No confetti/online presence signals from mock state.

## 6. Implementation acceptance, NOT_RUN here

CP08 gates: desktop source comparison +402/320/768/820/short-height/200% native zoom; Owner vs Member vs Holder, include-left/cursor failures; policy same-key unknown + storage failure + receipt mismatch; create/resend/revoke EMAIL/LINK, one-time secret loss/copy error, wrong recipient/login return/expiry/reload, accept-vs-decline lock, permission loss and actor change. Fixture, HTTP mocks, isolated live Backend report separately. Current work is read-only source/visual spec; lint/typecheck/unit/build/E2E/browser/screen-reader/live **NOT_RUN** in W04-D.
