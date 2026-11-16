# Kho tài liệu lịch sử

Gom lại ngày 16/11/2026 để giảm tài liệu rải rác ở `docs/`. Nội dung và kết quả cũ được giữ; chỉ cập nhật đường dẫn tham chiếu khi đổi vị trí. Đây là lịch sử, không phải chỉ dẫn tiếp tục triển khai hoặc bằng chứng kiểm thử hiện tại.

Quay lại [mục lục tài liệu](../README.md). Quy định hiện hành nằm trong [master plan](../ui-redesign/MASTER_PLAN.md) và [state](../ui-redesign/STATE.md).

## Triển khai và kiểm chứng theo phase

- [App shell, 15/10](implementation/app-shell-reconcile-2026-10-15.md)
- [Auth fixture phase 3](implementation/auth-fixture-phase3.md)
- [Design system phase 2](implementation/design-system-phase2.md)
- [Figma screen map, 15/10](implementation/figma-screen-map-2026-10-15.md)
- [Invitations, 23/10](implementation/invitations-evidence-2026-10-23.md)
- [Members preview phase 3](implementation/members-preview-phase3.md)
- [Plan Activity, 23/10](implementation/plan-activity-evidence-2026-10-23.md)
- [Plan Activity UI follow-up](implementation/plan-activity-ui-follow-up.md)
- [Plan preview phase 3](implementation/plan-preview-phase3.md)
- [Profile/Sessions, 22/10](implementation/profile-sessions-evidence-2026-10-22.md)
- [Runtime, 15/10](implementation/runtime-evidence-2026-10-15.md)
- [Trip overview phase 3](implementation/trip-overview-phase3.md)
- [UI refinement, 15/10](implementation/ui-refinement-2026-10-15.md)
- [UI/UX upgrade, 29/10](implementation/ui-ux-upgrade-2026-10-29.md)

## Hướng dẫn và prompt trước chương trình checkpoint

- [Code pipeline](implementation/code-pipeline.md)
- [Hướng dẫn Codex](implementation/codex-web-implementation-guide.md)
- [Roadmap triển khai Web](implementation/web-implementation-roadmap.md)

## Prompt triển khai đã hết vai trò

11 prompt trước chương trình checkpoint đã bỏ khỏi checkout sau khi đối chiếu với
Git: bản sao archive chỉ đổi đường dẫn, không có quyết định hoặc nội dung mới.
Nguồn hiện hành là `AGENTS.md`, master plan và quyết định CP đã duyệt.

Tra danh sách cũ bằng `git ls-tree -r --name-only f0bd351 -- docs/prompts` và đọc
từng bản bằng `git show f0bd351:docs/prompts/<tên-file>`. Gồm prompt tổng hợp,
phase 0 inventory, phase 1 shell/reconcile, phase 2 design system, phase 3
fixture/completion và phase 4–7 Identity/collaboration/Plan/target domains.

Raw output trong `test-results/` và `playwright-report/` đã dọn ngày 16/11/2026.
Các ảnh và kết quả được lưu riêng trong `docs/evidence`/`docs/ui-redesign/evidence`
vẫn được giữ. Rerun tạo evidence mới, không khôi phục raw run lịch sử đã xóa.
