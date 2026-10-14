# Prompt copy-paste — Phase 2: Design system

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: hoàn thiện design tokens và shared UI foundation theo Figma, không dựng feature business và không tích hợp Backend.

Đọc trước toàn bộ README, implementation-baseline, domain-architecture, web-roadmap, integration-first-architecture, screen-inventory, flow-map, screen-contracts, state-matrix và figma-implementation-matrix.

Task:
- Phase: 2
- Flow: Design system và shared UI foundation
- Data mode: fixture
- Figma: Desktop, Mobile, component showcase và shared components

Nếu Phase 1 đã code theo prompt cũ, reconcile trước; giữ phần đúng, không reset/rebase/xóa.

Implement hoặc hoàn thiện:
- color, typography, spacing, radius, shadow, breakpoint tokens;
- asset map và local fonts/assets;
- Button, Input, Select, Alert, loading/empty/error state;
- Drawer/navigation và app shell primitives;
- default, hover, focus-visible, disabled, loading và responsive variants;
- accessibility: semantic HTML, keyboard, focus, vùng bấm tối thiểu 44px.

Ràng buộc:
- shared component không gọi fetch, không ghép URL, không đọc raw envelope;
- shared không import feature repository hoặc fixture;
- chỉ tạo abstraction có bằng chứng dùng chung;
- không làm thay đổi behavior Backend;
- mobile trip dùng drawer trái, logo giữa, avatar phải, title trong content, không bottom tab;
- không ẩn content bằng overflow.

Cập nhật Figma implementation matrix/screen contract nếu token hoặc responsive contract thay đổi. Chạy lint, typecheck, test, build và browser review. Báo cáo visual mapping, shared components, files, tests, git status và blocker.
```
