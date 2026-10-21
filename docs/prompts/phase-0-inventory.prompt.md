# Prompt copy-paste — Phase 0: Inventory và contract

```text
Bạn đang triển khai repository Wolfari-web.

Mục tiêu: kiểm kê Figma, route Web, actor, permission, flow, UI state và Backend runtime evidence trước khi code feature.

Bắt buộc đọc:
1. README.md
2. docs/implementation-baseline.md
3. docs/domain-architecture.md
4. docs/web-implementation-roadmap.md
5. docs/integration-first-architecture.md
6. docs/screen-inventory.md
7. docs/flow-map.md
8. docs/screen-contracts.md
9. docs/state-matrix.md
10. docs/figma-implementation-matrix.md
11. Figma: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=194-1073&p=f
12. ../Wolfari-backend chỉ để đọc, không sửa.

Task:
- Kiểm kê các page/frame/node liên quan tới flow: [điền flow]
- Actor: [Guest/User/Member/Owner/Plan Editor/Holder/Admin]
- Route dự kiến: [điền route]

Quy trình:
1. Kiểm tra git status và branch; không xóa thay đổi có sẵn.
2. Đọc Figma metadata/frame/prototype/overflow/component/variant/responsive.
3. Đối chiếu mọi action với Gateway route, handler, OpenAPI, permission, error, version và idempotency.
4. Gắn nhãn capability: runtime-ready, runtime-candidate, partial-runtime, mock-only hoặc unknown.
5. Cập nhật screen-inventory, flow-map, screen-contracts, state-matrix và figma-implementation-matrix.
6. Ghi rõ route, actor, entry/exit, view model, repository interface, states, scroll boundary, responsive rules và acceptance criteria.
7. Không code feature và không bịa API khi contract chưa có bằng chứng.

Definition of Done:
- Mọi frame trong scope có mapping Figma → route → actor → domain → data mode → UI states.
- Mọi action chưa có runtime được đánh dấu rõ, không gọi là ready.
- Có danh sách blocker/gap/backend dependency.
- Không sửa backend/mobile.

Báo cáo: files changed, Figma mapping, route/actor map, runtime evidence, gaps/blockers, git status.
```
