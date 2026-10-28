# Plan/Activity — Web demo1

28/10/2026. Thay mô tả cũ rằng Backend chưa lưu ngày-only; [evidence23/10](plan-activity-evidence-2026-10-23.md) giữ như lịch sử.

Gateway chỉ mount một timeline server trong GatewayPlanPanel, form Drawer; editor local cũ chỉ fixture. Không auto publish draft hoặc gửi locationID local.

- Pool: scheduled_date/starts_at/ends_at null.
- Ngày-only: calendar string, giờ null; không 00:00 giả.
- Timed: hai instant theo Trip timezone, scheduled_date null; end date riêng cho qua đêm.
- PATCH giữ omission/null; move một command; reorder permutation đầy đủ giữ giờ, không cascade.
- Kéo item có giờ sang ngày khác mở form xác nhận. Bàn phím dùng Sửa/Đưa lên/xuống; filter ngày không ghi.
- Completion quyền riêng; Holder không tự sửa cấu trúc. 409 giữ draft, đối chiếu ngay trong drawer rồi xác nhận input trước khi lưu.
- Unknown giữ key/body/version actor/Trip qua sessionStorage; không lưu được journal thì chặn ghi. Refetch không tự chứng minh mutation commit.
- Thu hồi Editor khi form mở: server từ chối; không tự áp draft lên version/quyền mới.

Nguồn: [Plan OpenAPI](../../Wolfari-backend/docs/api/plan.openapi.json), Trip V003 và Protobuf scheduled_date đã có ở Backend. Không thêm migration trong đợt Web.

Test: plan-gateway, plan-commands, gateway-plan-panel, HTTP mock plan.spec, real e2e-demo1. Xem [validation](demo-1-web-validation.md) và [addendum](demo-1-web-addendum-v1.0.md).
