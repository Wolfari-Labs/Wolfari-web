# Prompt copy-paste — Phase 1: App Shell

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: dựng hoặc hoàn thiện nền tảng Web độc lập bằng fixture, sẵn sàng thay fixture bằng Gateway adapter.

Đọc trước:
- README.md
- docs/implementation-baseline.md
- docs/domain-architecture.md
- docs/web-implementation-roadmap.md
- docs/integration-first-architecture.md
- docs/screen-inventory.md
- docs/flow-map.md
- docs/screen-contracts.md#contract-app-shell
- docs/state-matrix.md
- docs/figma-implementation-matrix.md
- Figma file đã chỉ định trong implementation matrix
- ../Wolfari-backend chỉ đọc, không sửa.

Task:
- Phase: 1
- Flow: App Shell
- Data mode: fixture
- Figma: Wolfari Desktop/Mobile shell

Trước khi code:
1. Kiểm tra git status, branch và commit graph.
2. Phase 0–3 dùng branch ui/<flow> từ develop; không tạo Issue/PR.
3. Liệt kê file dự kiến sửa.
4. Kiểm tra screen contract và Figma mapping.

Implement:
- React + TypeScript strict + Vite SPA.
- Router, providers, QueryClient, ErrorBoundary và route fallback.
- App Shell, tokens, global style, local assets.
- Fixture/Gateway repository cùng interface.
- Không để component gọi fetch, ghép URL hoặc đọc raw HTTP envelope.
- Không tích hợp Backend và không giả lập mutation server success.
- Desktop trip: page cố định, main content là scroll boundary.
- Short laptop: compact spacing, không cắt nội dung.
- Mobile: hamburger trái, logo giữa, avatar phải, sidebar drawer, backdrop close, title trong content, không bottom tab.
- Có loading, empty, error, forbidden, conflict/unavailable state nền.
- Không lưu token vào localStorage/sessionStorage.

Kiểm tra:
- desktop 1440×800, 1366×768, 1024×600;
- tablet 768px;
- mobile 402×874 và 320×720;
- keyboard/focus, local assets, document overflow, API request count và browser storage.

Chạy: corepack pnpm lint; corepack pnpm typecheck; corepack pnpm test; corepack pnpm build; E2E nếu Chromium có sẵn.

Definition of Done: shell chạy đúng fixture, responsive đúng contract, tests/build đạt hoặc ghi blocker, chỉ sửa Wolfari-web.
Báo cáo: Summary, Files changed, Figma mapping, screen contract, repository mapping, commands, results, git status, blockers.
```
