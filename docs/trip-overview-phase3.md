# Trip Overview fixture — Phase 3

Branch `ui/trip-overview` từ `develop`/Auth commit `452eef4`. Route `/trips/:tripId`, actor active Member/Owner. Desktop `3:31`/`3:32` expanded/collapsed sidebar, Mobile `317:2032`; AppShell/Drawer giữ nguyên, TripOverviewPage → TripOverview nhận domain props. Hero/panels/metadata mapped, không thêm route target-only.

`TripRepository.getTrip` → TripDetailViewModel dùng cùng canonical catalog và thời gian với Trip List. Description/publicDescription nullable, archivedAt/planEditPolicy, membership/permissions và planVersion/membershipRevision/exportRevision giữ contract. Cover là nullable presentation enrichment; Overview Desktop/Mobile dùng assets đúng frame, không đổi record metadata theo viewport. Unknown/denied ID đều not-found; Guest/Admin không được suy ra quyền Trip. Gateway/fixture cùng interface, Gateway chưa nối HTTP.

Finance/weather/fare/map/packing aggregates chưa có read projection → unavailable, không mượn số Figma làm dữ liệu runtime. Plan/Members dùng semantic links tới route đã chốt; Edit/Share disabled dù có Owner fixture. Không write intent hoặc fake saved/pending receipt. Read có loading/success/empty/error/forbidden/not-found/conflict/unavailable, correlationId/retry policy.

Desktop main/nav scroll trong viewport, four summary cards + three-column workspace; short laptop compact spacing, tablet two-column summaries/workspace, Mobile natural document scroll với hero/two compact cards/full-width timeline, drawer/header và title trong content. Touch/link ≥44px; không native bars/tabs. Figma motion Desktop none; Mobile motion thuộc native tab đã loại khỏi Web.

Static evidence Backend `d8c02cb`: `trip-proxy.ts` projectTrip → TripGrpcController/TripService.get, active member scope, metadata+revisions+permissions; GET runtime-candidate, aggregate dashboard unavailable. Không gọi Backend hoặc sửa Backend/Mobile.

Reconcile: giữ Auth/Home/Trip List đúng; sửa text encoding trong các đoạn docs mới. Repository tests mở rộng read methods listTrips/getTrip, không mutation. Vitest giới hạn hai workers để tránh timeout do nhiều jsdom instances tranh CPU. Router lazy-load feature bodies, giữ shell và loading boundary; giải quyết warning chunk >500kB khi mở rộng.

Browser screenshots ignored: `test-results/trip-overview-Trip-overview-*/overview.png`. Kết quả cuối cùng ghi trong Figma matrix.
