# Wolfari Web — Prompt theo từng phase

Mỗi file dưới đây là một prompt độc lập. Chỉ cần mở đúng file của phase, copy toàn bộ phần prompt và dán vào Codex.

| Phase | Mục tiêu | Prompt |
| --- | --- | --- |
| 0 | Kiểm kê Figma, flow, screen contract và backend evidence | [phase-0-inventory.prompt.md](phase-0-inventory.prompt.md) |
| 1 | Dựng App Shell và nền tảng Web | [phase-1-app-shell.prompt.md](phase-1-app-shell.prompt.md) |
| 1-reconcile | Đồng bộ Phase 1 đã code bằng prompt cũ | [phase-1-reconcile.prompt.md](phase-1-reconcile.prompt.md) |
| 2 | Design system và shared UI foundation | [phase-2-design-system.prompt.md](phase-2-design-system.prompt.md) |
| 3 | Dựng màn hình bằng fixture | [phase-3-fixture-screen.prompt.md](phase-3-fixture-screen.prompt.md) |
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
  → Phase 4
  → Phase 5
  → Phase 6
  → Phase 7 theo runtime evidence
```

Không chạy Phase 3 trước khi Phase 0 có screen contract và state matrix. Không chạy Phase 4+ chỉ vì Figma đã có frame; phải có Gateway/runtime evidence.

Tài liệu nguồn chung:

- [screen inventory](../screen-inventory.md)
- [flow map](../flow-map.md)
- [screen contracts](../screen-contracts.md)
- [state matrix](../state-matrix.md)
- [Figma implementation matrix](../figma-implementation-matrix.md)
- [web roadmap](../web-implementation-roadmap.md)
