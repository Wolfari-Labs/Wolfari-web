# Trip Overview fixture — Phase 3

Route `/trips/:tripId`, actor active Member/Owner. Figma Desktop `3:31`/`3:32` là chuẩn cho sidebar mở/thu; Mobile `317:2032` là Web adaptation của cùng route. AppShell/Drawer dùng chung, TripOverviewPage → TripOverview nhận domain props; không thêm route target-only. Refinement được thực hiện trên `ui/trip-overview-width` trước khi merge vào `develop`.

`TripRepository.getTrip` → `TripDetailViewModel` dùng cùng canonical catalog và thời gian với Trip List. Description/publicDescription nullable, archivedAt/planEditPolicy, membership/permissions và planVersion/membershipRevision/exportRevision giữ contract. Cover là nullable presentation enrichment; Overview Desktop/Mobile dùng assets đúng frame, không đổi record metadata theo viewport. Unknown/denied ID đều not-found; Guest/Admin không được suy ra quyền Trip. Gateway/fixture cùng interface, Gateway chưa nối HTTP.

Finance/weather/fare/map/packing aggregates chưa có read projection → unavailable, không mượn số Figma làm dữ liệu runtime. Plan/Members dùng semantic links tới route đã chốt; Edit/Share disabled dù có Owner fixture. Không write intent hoặc fake saved/pending receipt. Read có loading/success/empty/error/forbidden/not-found/conflict/unavailable, correlationId/retry policy.

## Geometry contract

- Trang Overview chiếm toàn bộ chiều rộng main còn lại sau sidebar, với gutter trái `18px` và phải `22px`. Hero, summary cards và workspace dùng cùng hai mép. Ở 1440px: sidebar mở `220px` → hero `x=238,width=1180`; sidebar thu `72px` → hero `x=90,width=1328`.
- Hero giữ minimum `170px`. Workspace desktop giữ ba cột co giãn theo tỉ lệ `578:314:260`, gap `14px`, và minimum `408px` khi `min-width:1101px`. Itinerary dùng padding `12px 15px 0`, heading gap 12px, tabs minimum 46px, activity rows minimum 62px/gap 2px, liên kết cuối minimum 44px; fare minimum 190px; postcard minimum 204px. Các giá trị là minimum để giữ nhịp Figma, không cắt nội dung hay ép chiều cao cố định.
- Khi có ngày/hoạt động dài hoặc activity thứ năm, workspace tăng chiều cao. Desktop chỉ cuộn ở `main`; workspace, itinerary, fare và postcard không có nested vertical scroll. Dãy ngày có thể cuộn ngang. Mobile (`≤768px`) dùng một cột, document scroll và drawer; không overflow ngang, nội dung cuối và vùng bấm ≥44px vẫn truy cập được.
- `1101px` là ngưỡng giữ layout/minimum desktop; `1100px` trở xuống giữ cấu trúc tablet hiện có. Các ca resize/short laptop phải kiểm tra cả hai phía ngưỡng.

## Runtime and states

Static evidence Backend `d8c02cb`: `trip-proxy.ts` projectTrip → TripGrpcController/TripService.get, active member scope, metadata+revisions+permissions; GET runtime-candidate, aggregate dashboard unavailable. Không gọi Backend hoặc sửa Backend/Mobile.

Fixture read có loading/success/empty/error/forbidden/not-found/conflict/unavailable và không tạo mutation receipt. `PlanSummary` giữ đủ bốn activity canonical; kiểm thử DOM-side thêm activity dài để xác nhận layout tăng theo dữ liệu mà không sửa fixture chuẩn.

## Verification

Browser contract suite có 17 ca Chromium: viewport `2560/1920/1440/1366/1200/1101/1100/1024/820/768/402/320`, sidebar mở/thu, geometry alignment, column ratio, minimum heights, fifth-activity growth, final-link reachability, no horizontal overflow, state/navigation và API request guard. Screenshot chỉ là evidence cho hai trạng thái 1440px sau review; artifact nằm dưới `test-results/trip-overview-Trip-overview-*/`.

Reconcile: giữ Auth/Home/Trip List đúng; repository không thêm mutation. Vitest giới hạn hai workers để tránh timeout do nhiều jsdom instances tranh CPU. Router lazy-load feature bodies, giữ shell và loading boundary.
