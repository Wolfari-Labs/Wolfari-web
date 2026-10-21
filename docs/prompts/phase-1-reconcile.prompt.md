# Prompt copy-paste — Phase 1-reconcile

```text
Bạn đang triển khai repository Wolfari-web. Phase 1 đã được code theo prompt cũ.

Mục tiêu: reconcile code hiện tại với tài liệu và contract mới, không reset, không rebase mù, không xóa hoặc làm lại từ đầu.

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
- Figma Desktop/Mobile shell
- ../Wolfari-backend chỉ đọc.

Quy trình:
1. Chạy git status, git branch --show-current và git log --oneline --decorate --graph -n 12.
2. Đọc code, test, diff và commit graph hiện tại.
3. Lập reconcile matrix: đúng, thiếu, lệch, chưa xác định cho route, visual, responsive, states, permission, repository boundary và test.
4. Giữ phần đúng; sửa incremental phần lệch.
5. Đối chiếu mobile: hamburger trái, logo giữa, avatar phải, drawer ẩn/hiện, backdrop, title trong content, không bottom tab.
6. Đối chiếu desktop: fixed workspace, main scroll boundary, short laptop không cắt nội dung.
7. Đối chiếu fixture/Gateway interface, version/revision, permission và error states.
8. Cập nhật docs nếu behavior mới được chốt.

Không tích hợp Backend, không bịa API, không tạo Issue/PR, không reset hard/clean/force-push.

Chạy lint, typecheck, test, build và browser manual/E2E nếu có. Báo cáo code giữ lại, code sửa, lý do, mapping Figma, test result, git status và blocker.
```
