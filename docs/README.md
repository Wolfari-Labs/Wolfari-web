# Tài liệu Wolfari Web

Điểm bắt đầu để tìm tài liệu vận hành, kiến trúc và lịch sử. Mã nguồn hiện tại và contract quyết định hành vi; kết quả kiểm thử trong báo cáo chỉ đúng với snapshot được ghi nhận.

## Tài liệu đang sử dụng

| Nhu cầu | Tài liệu |
| --- | --- |
| Cài đặt và chạy Web | [README](../README.md), [runbook demo](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md) |
| Kiến trúc và tích hợp | [Domain architecture](domain-architecture.md), [Integration-first architecture](integration-first-architecture.md), [Gateway matrix](gateway-integration-matrix.md) |
| Route, trạng thái và contract | [Screen inventory](screen-inventory.md), [Screen contracts](screen-contracts.md), [State matrix](state-matrix.md), [Flow map](flow-map.md) |
| Quy định và trạng thái redesign | [Master plan](ui-redesign/MASTER_PLAN.md), [State](ui-redesign/STATE.md), [CP11 acceptance](ui-redesign/CP11_ACCEPTANCE.md) |
| Thiết kế và thay đổi đã duyệt | [Design system](ui-redesign/DESIGN_SYSTEM.md), [Design deltas](ui-redesign/DESIGN_DELTAS.md), [Decisions](ui-redesign/DECISIONS.md) |
| Demo và bàn giao | [Demo trực tiếp](HUONG_DAN_DEMO_TRUC_TIEP.md), [Validation](demo-readiness-validation.md), [Phase D](PHASE_D_HANDOFF.md), [PR/merge](HUONG_DAN_PR_VA_MERGE_MAIN.md) |

Hồ sơ CP01–CP11, quyết định và bằng chứng tiếp tục ở [ui-redesign](ui-redesign/README.md). CP11 đã đóng với ngoại lệ; việc dọn repo không mở checkpoint mới hoặc phê duyệt release. Các báo cáo demo/bàn giao có ngày vẫn là snapshot, không chứng minh trạng thái CI/live hiện tại.

## Tài liệu lịch sử

[Kho lưu trữ](archive/README.md) chứa báo cáo triển khai theo phase, roadmap cũ và cách tra prompt cũ trong Git. Dùng để truy nguyên thay đổi; đọc quy định hiện tại trước khi áp dụng hướng dẫn cũ.

[Cleanup Backend + Web, 16/11/2026](../../Wolfari-backend/docs/history/cleanup-2026-11-16.md) ghi phạm vi dọn dẹp, kết quả kiểm tra và các gate còn lỗi; không thay thế các quyết định CP đã duyệt.
