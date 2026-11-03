# CP-10 design decisions — Web Price Watch, Notifications, Admin

Status: **PWT01 APPROVED D46**; **NTF01 and ADM01 APPROVED D45** separately by the user. D18 had already approved XRT05 form placement. These decisions do not authorize new Backend behavior, a new route, Admin CRUD or Figma writes.

## Source and runtime evidence

- Official file: `hdy2sOZk6rfjKXKDJ9HW9y`. Scoped MCP design context read for Price Watch desktop `23:657`, responsive Web `781:6626`, Notifications `299:1926` under session `ff718cda-5fbe-4d48-80a5-a22e68047664`. Admin canvas `194:1073` metadata read; design context for the canvas/child `194:1093` failed with selection/transport errors, so no complete Admin visual-context claim. Existing inventory identifies two conflicting Admin IA families.
- At W01 baseline, Price source showed watch list, historical price chart and create form at right desktop/below content on narrow Web. Gateway already supported real repository watches and paginated observations, while its form was a Drawer before XRT05 placement. The static chart had no reviewed transformation of loaded observations; PWT01/D46 later approved actual rows as history. `MOCK_FLIGHT` is a simulated provider, not booking/payment.
- Notifications source shows a full page with categories and preferences. Current Gateway has a shell Drawer, paginated inbox, one-item read and profile preferences; there is no notification route, bulk-read/filter API, or browser push registration workflow.
- At W01 baseline, Figma Admin families showed business screens, while `/admin` had only a role guard, local navigation and a generic placeholder. ADM01/D45 later approved the truthful same-geometry placeholder. No Admin business repository/API is wired into this route.

## Decisions reviewed separately under D17

| Code | Proposed treatment | Boundary and acceptance |
| --- | --- | --- |
| **PWT01 — APPROVED D46** — observations instead of unverified chart | Keep the approved right/below create/edit form placement. Show actual paginated observation rows as the price history, with provider, observed and fetched times and explicit freshness/error states; do not render the static source chart or imply a lowest fare from partial data. Keep current watch cards and lifecycle actions. | `MOCK_FLIGHT` label; UTC flight fields, int64 VND string, opaque cursor, versions, actor and immutable create idempotency; no booking/payment. Source card decoration/palette and separate chart remain unimplemented pending later design work. |
| **NTF01 — APPROVED D45** — Inbox capability adaptation | Keep notifications in the existing accessible shell Drawer and versioned preferences in Profile. Show all/unread filter supported by current repository, per-item read, pagination and retry/reconciliation. Do not create full-page categories, bulk read or browser push registration from Figma. | Unread/read receipt is not email/push delivery. Preserve actor-specific query keys, exact cursor and expected_version; failed/unknown mutation must not show success. No new route or provider API. |
| **ADM01 — APPROVED D45** — truthful guarded placeholder | Keep the existing `/admin` shell and role denial. In the same centered status geometry, use heading “Chức năng quản trị chưa khả dụng” and body “Các mục quản trị chưa được triển khai. Vai trò Admin không tự cấp quyền xem hoặc chỉnh sửa chuyến đi.” Keep navigation local and explicitly nonoperational. | No fake overview KPIs, CRUD, Admin notification delivery or Backend call. Test USER denied and ADMIN placeholder at desktop/narrow Web, keyboard/focus and no overflow. No choice between the two Figma Admin business IA families is inferred. |

Approval of CP-09 or opening CP-10 did not approve these departures. D45 approved NTF01/ADM01 and D46 separately approved PWT01. The already approved XRT05 placement proceeds independently. Any palette, font, asset or motion departure requires its own review.
