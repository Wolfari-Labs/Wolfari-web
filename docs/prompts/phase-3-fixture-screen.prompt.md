# Prompt copy-paste — Phase 3: Feature UI bằng fixture

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: triển khai một flow UI hoàn chỉnh theo Figma bằng fixture deterministic, sẵn sàng thay adapter sau này nhưng chưa gọi Backend.

Đọc README, implementation-baseline, domain-architecture, web-roadmap, integration-first-architecture, screen-inventory, flow-map, screen-contracts, state-matrix và figma-implementation-matrix.

Task:
- Phase: 3
- Flow: [Trip List / Trip Overview / Plan preview / Members preview / flow cụ thể]
- Figma frame/node: [điền]
- Route: [điền]
- Actor: [điền]
- Data mode: fixture
- Screen contract: [điền heading]

Trước khi code:
1. Kiểm tra git status/branch; dùng ui/<flow> từ develop; không Issue/PR.
2. Kiểm tra route, actor, permission, view model, repository interface và acceptance criteria.
3. Đối chiếu Figma prototype, variants, responsive và scroll boundary.
4. Đối chiếu Backend chỉ để ghi capability gap; không bịa API.

Implement theo vertical slice:
route → view model → repository interface → fixture → success → loading/empty/error/forbidden/conflict/pending/unknown/unavailable → responsive → tests.

Component không gọi fetch, không biết fixture và không đọc HTTP envelope. Không báo mutation đã lưu nếu chưa có server. Write action chưa có runtime phải disabled, preview-only hoặc unavailable. Giữ version/revision/permission/idempotency fields trong model nếu contract yêu cầu.

Kiểm tra desktop, short laptop, tablet, mobile; mobile trip drawer trái/logo giữa/avatar phải/title trong content, không bottom tab. Chạy lint, typecheck, test, build và E2E/browser nếu có. Cập nhật docs khi behavior thay đổi. Báo cáo đầy đủ mapping và blocker.
```
