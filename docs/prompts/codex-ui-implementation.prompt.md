# Wolfari Web — Prompt theo từng phase

Mỗi file dưới đây là một prompt độc lập. Chỉ cần mở đúng file của phase, copy toàn bộ phần prompt và dán vào Codex.

| Phase | Mục tiêu | Prompt |
| --- | --- | --- |
| 0 | Kiểm kê Figma, flow, screen contract và backend evidence | [phase-0-inventory.prompt.md](phase-0-inventory.prompt.md) |
| 1 | Dựng App Shell và nền tảng Web | [phase-1-app-shell.prompt.md](phase-1-app-shell.prompt.md) |
| 1-reconcile | Đồng bộ Phase 1 đã code bằng prompt cũ | [phase-1-reconcile.prompt.md](phase-1-reconcile.prompt.md) |
| 2 | Design system và shared UI foundation | [phase-2-design-system.prompt.md](phase-2-design-system.prompt.md) |
| 3 | Dựng màn hình bằng fixture | [phase-3-fixture-screen.prompt.md](phase-3-fixture-screen.prompt.md) |
| 3-UI-COMPLETE | Hoàn thiện toàn bộ Web độc lập bằng fixture sau Phase 3 | [phase-3-ui-completion.prompt.md](phase-3-ui-completion.prompt.md) |
| 4 | Tích hợp Identity/Gateway | [phase-4-identity-gateway.prompt.md](phase-4-identity-gateway.prompt.md) |
| 5 | Tích hợp Trip và collaboration | [phase-5-trip-collaboration.prompt.md](phase-5-trip-collaboration.prompt.md) |
| 6 | Tích hợp Plan và Activity | [phase-6-plan-activity.prompt.md](phase-6-plan-activity.prompt.md) |
| 7 | Mở các domain mục tiêu khi Backend sẵn sàng | [phase-7-target-domains.prompt.md](phase-7-target-domains.prompt.md) |

## Thứ tự sử dụng

```text
Phase 0
  → Phase 1
  → Phase 1-reconcile nếu Phase 1 đã code theo prompt cũ
  → Phase 2
  → Phase 3 theo từng flow
  → Phase 3-UI-COMPLETE: hoàn thiện các màn hình Web bằng fixture
  → Phase 4
  → Phase 5
  → Phase 6
  → Phase 7 theo runtime evidence
```

Không chạy Phase 3 trước khi Phase 0 có screen contract và state matrix. Sau khi Phase 3 hoàn thành, có thể chạy Phase 3-UI-COMPLETE để hoàn thiện Web độc lập. Không chạy Phase 4+ chỉ vì Figma đã có frame; phải có Gateway/runtime evidence.

## Quy tắc tạo branch

```text
main
  └─ develop
      ├─ docs/phase-0-inventory       (tuỳ chọn, tài liệu)
      ├─ ui/app-shell                  (Phase 1)
      ├─ ui/design-system              (Phase 2)
      ├─ ui/<flow>                     (từng branch được merge tuần tự vào develop)
      └─ <type>/<issue>-<flow>         (Phase 4+, có Issue/PR)
```

- Chỉ tạo branch mới sau khi work unit trước đã hoàn tất, commit, kiểm tra, merge vào `develop` và `develop` đã được cập nhật local.
- Quy trình bắt buộc: `develop` mới nhất → tạo branch flow → code/commit/test → merge flow vào `develop` → cập nhật `develop` → tạo branch flow tiếp theo.
- Không tạo nhiều branch flow liên tiếp từ cùng một `develop` cũ khi flow sau phụ thuộc flow trước.
- Phase 1-reconcile tiếp tục trên branch Phase 1 hiện tại; không tạo branch mới chỉ để sửa lệch của cùng một flow.
- Phase 2 tạo `ui/design-system` từ `develop` sau khi Phase 1 đã vào `develop`.
- Phase 3 tạo branch riêng cho từng flow như `ui/trip-list`, `ui/trip-overview`, `ui/plan-preview`.
- Phase 3-UI-COMPLETE triển khai tuần tự: `ui/auth-fixture` merge vào `develop`, sau đó `ui/trip-overview`; tiếp tục `ui/plan-preview`, rồi `ui/members-preview`. Không chờ Backend để hoàn thiện visual/interaction/read-only states.
- Phase 4 trở đi tạo branch từ `develop` với số Issue, ví dụ `feat/42-auth-gateway`, và PR target `develop`.
- Nếu work trước chưa merge nhưng work mới phụ thuộc code đó, không branch từ develop thiếu code; merge dependency trước hoặc ghi rõ stacked branch/dependency trong báo cáo.
- Không tạo branch mới cho mỗi commit nhỏ, mỗi bug nhỏ trong cùng flow hoặc mỗi lần chỉnh CSS.

Tài liệu nguồn chung:

- [screen inventory](../screen-inventory.md)
- [flow map](../flow-map.md)
- [screen contracts](../screen-contracts.md)
- [state matrix](../state-matrix.md)
- [Figma implementation matrix](../figma-implementation-matrix.md)
- [web roadmap](../web-implementation-roadmap.md)
