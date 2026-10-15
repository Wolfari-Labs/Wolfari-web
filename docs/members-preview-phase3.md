# Members / Invitation Preview — Phase 3

Branch `ui/members-preview` từ `develop`/Plan `58c8b2d`. Route duy nhất `/trips/:tripId/members`, actor active Member/Owner, không Admin override.

| Figma → route scope | Component / adaptation |
| --- | --- |
| Desktop `25:360`, Mobile `317:2040` → Members | MembersPage/MembersView, rows/cards, role badges và responsibilities; title trong content, drawer/header chung |
| Desktop `475:2294`, Mobile `317:2041` → **local preview panel only** | Invitation form/list; không route mới, deep link, token, sent/saved screen hoặc mutation success |
| Shared header/sidebar/hero | AppShell/Drawer/TripHero; canonical metadata/cover như Overview/Plan. Decorative hill background riêng Members chưa có local asset → **visual gap**, không vẽ lại artwork |

MembershipRepository.listMembers → MembershipPageViewModel: membership ID/tripId/userId/role/joinedAt/leftAt, opaque nextCursor; target displayName/avatar nullable và fixture giữ null vì Gateway chưa có verified public enrichment. UI hiển thị neutral icon + short User ID và full IDs trong disclosure, không lấy Trang/Hà/Quyên/Tân hoặc initials/Fund Holder của Figma làm member projection. Chỉ hiển thị active rows đúng trip; nextCursor khác null báo còn trang, không tuyên bố đã tải toàn bộ collection. Sáu canonical trips dùng đúng membership/memberCount fixture, có một Owner, vai trò viewer nhất quán với Trip List.

InvitationRepository.listInvitations → InvitationPageViewModel: ID/tripId/type/email nullable/status/version/expiresAt/resolvedAt/nextCursor; **không token/link/url**. Owner-only read độc lập với role hệ thống; Member không kích hoạt query này, Guest không gọi private repositories. Revisions từ TripRepository.getTrip; member list wire không có revision nên không bịa atomic combined snapshot. Gateway adapter phải xác định consistency/refetch khi tích hợp.

Fixture lời mời dùng `linh@example.com`, fixed dates, PENDING/version1 và explicit EXPIRED/REVOKED/ACCEPTED/version2 read scenarios. Đây là seeded read state, không kết quả của nút bấm. Preview form chỉ kiểm tra email ≤255/format rồi unavailable; draft giữ qua lỗi/recovery. Resend/revoke/transfer/remove/leave/policy/Holder disabled. InvitationCreateIntent và InvitationVersionIntent giữ idempotency/version fields theo runtime; LINK intent không có email. Không tạo idempotency key, link secret hoặc operation receipt khi chưa gửi server command.

States read loading/ready/empty/error/forbidden/not-found/conflict/unavailable, terminal invitation states expired/revoked/used. Pending/unknown chỉ presentation controls, không đổi membershipRevision/invitationVersion. Member permission/read scope kiểm tra trước query; identity/Fund Holder/Plan Editor enrichment không bị suy ra từ membership role.

Desktop main/nav cuộn trong viewport, list + responsibilities hai cột; short laptop compact hero/rows, tablet stack columns, Mobile402/320 document/card scroll, header hamburger trái/logo giữa/avatar phải, title trong content, không native bars/bottom tabs. Keyboard disclosure/form/tab controls ≥44px; invalid email focus field, target-only sidebar không render nhầm Overview. Figma motion Desktop/Invite none; Mobile Members motion chỉ native trip tab đã loại khỏi Web.

Backend static evidence `d8c02cb`: membership-proxy.ts/projectMembership → LifecycleService.list (active member, IDs/role/timestamps only), **partial-runtime** do thiếu identity enrichment; invitation-proxy.ts → TripInvitationsService.list/Owner guard, **runtime-candidate**. Create: invitation_type/email optional theo EMAIL, expires_at optional, expected_membership_revision + Idempotency-Key; resend/revoke expected_version + same intent key. Finance lifecycle/Owner-transfer guards chưa mở; không Backend request hoặc sửa Backend/Mobile.

Review trong work unit này còn sửa lỗi reconcile sidebar target-only: giữ preview selection và URL, hiển thị unavailable thay vì Overview dưới nhãn Packing/Map/etc. Đã thêm unit/browser assertions cho quay về Overview và focus main. Scope/ID guards của metadata và Plan revision mismatch được kiểm tra; Profile non-null avatar có kích thước theo slot thay vì dựa vào đuôi `.png`, nên mapped blob URL không tràn layout. Không thêm route hay giả API.

Screenshots ignored `test-results/members-preview-Members-preview-*/members.png` và `invitations.png`. Kết quả checks cuối cùng ghi trong Figma matrix. Remaining gaps: exact decorative hero asset, verified identity enrichment, atomic member/revision composition, invitation writes/token lifecycle và Finance guards; thuộc visual refinement hoặc Phase4+ theo capability gates.

## Commands / verification

| Command / check | Result ngày15/10/2026 |
| --- | --- |
| `corepack pnpm lint` | Pass |
| `corepack pnpm typecheck` | Pass |
| `corepack pnpm test` | 164 pass, 12 files |
| `corepack pnpm build` | Pass, production chunks dưới warning threshold |
| `corepack pnpm build:preview` | Pass, explicit fixture artifact |
| Playwright CLI `test --workers=2`, external preview server | 85 pass; wrapper sở hữu/đóng Vite server vì Windows managed-server teardown có vấn đề trước đó |
| Playwright Auth/Members targeted review, separate output | 19 pass sau CSS fixes; artifacts trong `test-results/review-final` |
| Manual CSS blob avatar / production browser |78×78/no overflow; 8 route unavailable + unknown fallback, no API/storage/fixture UI |
| Production marker/chunk scan / component transport search | Pass; không private fixture records hoặc fetch/raw `/api/v1`/token storage trong components |
| `git diff --check`, status/graph review | Pass; chỉ Web, không reset/rebase/force-push/Issue/PR |
