# Plan Preview fixture — Phase 3

Branch `ui/plan-preview` từ `develop`/Overview `611c242`. Route duy nhất `/trips/:tripId/plan`, actor Member/Owner/Plan Editor theo projection quyền; không activity/detail/map route mới.

| Figma | Component / behavior |
| --- | --- |
| `20:236` | PlanPage/PlanView, compact shared TripHero, day controls, derived metrics, activity timeline |
| `439:2028` | Local expanded “Đã chọn · Chưa xếp lịch”, hai selected locations chưa liên kết activity; không kéo thả/write |
| `486:3102`, `486:3174`, `486:3246` | Desktop timeline viewport VERTICAL, 414px bình thường/280px short laptop; focusable list + keyboard scroll |
| `317:2033` | Mobile activity cards/time spine, natural document scroll, day row cuộn ngang, shared Web drawer/header/title trong content; native bars/section switcher/bottom tabs không dùng |

PlanRepository.getPlan → PlanViewModel: tripId/planVersion/exportRevision, activity ID/type/title/nullable description-location-times/status/source/creator-completion fields, selected location ID/name/nullable address, permissions canRead/canEdit/canComplete. Nullable decorative cover là presentation target chung interface, Gateway chưa có enrichment. TripRepository.getTrip compose metadata và membershipRevision; revision mismatch chặn snapshot với conflict. Common fixture/Gateway interface; production Gateway mặc định unavailable, no HTTP.

Fixture Đà Nẵng dùng bốn activity source và sáu selected locations (hai chưa xếp), **dates/name giữ canonical Trip List**: ngày đầu 22/09/2026, bốn ngày đến25/09. Ngày còn lại và trip khác empty; không tạo cùng activities Đà Nẵng cho Phú Quốc/Đà Lạt. Metrics derive đúng bốn activities, không chép số sáu của source bao gồm locations chưa xếp. Không bịa travel duration/address/presence/budget. Member có canComplete độc lập canEdit; selected Plan Editor fixture unit có canEdit, không cấp quyền theo system role.

Activity disclosure read preview giữ focus và natural flow, không mutation. Add/edit/delete/reorder/completion/map/add-day disabled dù canEdit. PlanWriteIntent giữ idempotencyKey/expectedPlanVersion cho integration sau; không tạo key hoặc operation receipt giả. Pending/unknown chỉ presentation, không đổi dữ liệu/revision hoặc báo saved. Chọn ngày/unscheduled expansion giữ qua read error/recovery.

Overview cập nhật composition ngày đầu qua cùng PlanRepository/PlanSummary; metadata vẫn đọc riêng, errors/permissions/revisions được kiểm tra trước hiển thị summary. Finance/weather/fare/map/packing vẫn unavailable. TripHero dùng lại ở Overview và Plan, không thay shell behavior.

Read coverage loading/ready/empty/error/forbidden/not-found/conflict/unavailable; metadata guard trước Plan query, cancellation và retry. Desktop main/nav trong viewport, timeline riêng; short/tablet co spacing/columns, Mobile 402/320 không clip. Screenshots ignored `test-results/plan-preview-Plan-preview-*/plan.png`.

Static Backend `d8c02cb`: plan-proxy.ts projectPlan/projectActivity → PlanGrpcHandlers/PlanService.getPlan/readPlanLists, activity_type là string ≤40, permissions từ active membership/plan policy/archive. Read runtime-candidate; create/update/delete/reorder/completion có expected_plan_version + Idempotency-Key nhưng Phase 3 không gọi. Selected locations source/address và thumbnail enrichment không bị suy ra từ Figma thành API runtime. Figma Desktop motion none, Mobile motion chỉ native tab đã loại khỏi Web. Kết quả kiểm tra cuối cùng trong Figma matrix.
