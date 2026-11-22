# POI Integration Matrix — `feat/web-poi-integration`

Backend tham chiếu (chỉ đọc): `Wolfari-backend` `origin/feat/poi-overture` `ef266df`.
Web nguồn POI: `origin/feat/poi-overture-web` `5afb307` (thepiece27), merge vào `origin/develop` `62ea04c`.

## 1. Backend → Web mapping

| Task | Backend API | Web consumer | File | Thay đổi | Test | Trạng thái |
|---|---|---|---|---|---|---|
| POI-01 | `GET /api/v1/trips/{id}/places/search` (`q`, `latitude`, `longitude`, `radius_m`, `category`, `geocode`, `bbox`, `limit`) | Tìm kiếm/khám phá địa điểm | `src/infrastructure/repositories/places.gateway-repository.ts` (`search`, `explore`) | Từ nhánh POI; tham số khớp `ensureQuery` của Gateway, `category` = nhóm `PLACE_SEARCH_GROUPS` | `tests/places*.test.ts(x)` | Xem mục 3 |
| POI-02 | Response `data[]` = Place §4.1 (`selection_token`, `provider`, `tier`, `coord_verified`, `source_dataset`, `category_group`, `province_*`, `confidence`, `data_release`, `fetched_at`) | Decode an toàn từng trường bổ sung | `decodePlace` | Trường bổ sung không hợp lệ → `null`, không bỏ cả kết quả | `places-decode.test.ts`, `places-overture.test.tsx`, `places-province.test.tsx` | Xem mục 3 |
| POI-03 | `meta` (`provider`, `status`, `fetched_at`, `stale`, `snapshot_id`, `data_release`, `bbox_truncated`) | Nguồn dữ liệu/credit Overture, cảnh báo cắt kết quả | `src/infrastructure/http/envelope.ts` → `metadata.placesSource` | Có sẵn trong nhánh POI | `places-explore.test.ts` | Xem mục 3 |
| POI-04 | `400 BBOX_TOO_LARGE` / `INVALID_BBOX` | Yêu cầu phóng to bản đồ | `explore()` + `GatewayMapPage` (`exploreStatus`) | 400 khác → coi như backend cũ, quay về hành vi cũ | `places-explore.test.ts` | Xem mục 3 |
| POI-05 | `POST /api/v1/trips/{id}/selected-locations` với `CreateSignedLocation {selection_token, expected_plan_version}` → `SignedLocationResult` | Lưu địa điểm đã chọn, "Thêm vào ngày" | Plan/Map gateway repository | Giữ `expected_plan_version`, idempotency | `trip-map*.test.tsx`, E2E Gateway map | Xem mục 3 |
| POI-06 | `POST /api/v1/travel/route` (`coordinates`, `mode: DRIVING`), giới hạn 60 req/phút, 503 khi chưa có routing | Ước lượng tuyến OSRM | `route()` + `GeoapifyMap` `route` prop | Từ nhánh POI | `plan-day-map.test.tsx` | Xem mục 3 |
| POI-07 | Price Watch `provider: TRAVELPAYOUTS_CACHE`, `last_check_status`, `last_checked_at`, `next_check_at` | Hiển thị nguồn/độ mới giá | `RuntimePriceWatchPage.tsx`, `runtime-price-watch*` | Bật qua `VITE_PRICE_WATCH_PROVIDER`; mặc định MOCK_FLIGHT không đổi | `price-watch-*.test.ts(x)` | Xem mục 3 |
| POI-08 | `GET /api/v1/travel/places` (text search ngoài Trip) | — | — | Web chưa dùng; không thêm consumer khi chưa có yêu cầu màn hình | — | NOT_REQUIRED |

## 2. Giải conflict (merge `origin/feat/poi-overture-web` → develop)

40 file conflict. Nguyên tắc:

- **POI/Map** (`src/features/map/*`): nền là nhánh POI. Lấy lại từ develop: `TravelTools` (tuyến vẽ qua `GeoapifyMap`), `RecommendationPanel ROUTE_ORDER`, `PreparationStatus`, `PreparationActions module="location"` cho địa điểm đã lưu. Bỏ Google Maps của develop vì Geoapify thay thế. `GatewayMapPage.module.css` bị xóa (không còn import).
- **Plan** (`src/features/plan/*`): giữ cả DnD lưu backend/"Thêm vào ngày"/day map của POI và itinerary alignment/metrics/test hardening của develop.
- **Finance** (`fund/*`, `finance-decoders.ts`, `demo1-finance.test.ts`): lấy hoàn toàn theo develop (VietQR NAPAS `qr_payload`/`qr_svg`, bank directory, MoMo). Bỏ `environment: TEST|LIVE` cũ của POI.
- **Price Watch**: markup develop; giữ phần POI về TRAVELPAYOUTS_CACHE/độ mới và nhãn lỗi provider.
- **Dress/Packing/Settings/Notification**: giữ chức năng develop (quyền ghi dress code, PreparationStatus/Actions, lỗi roster, browser push) + đổi nhãn/breadcrumb declutter của POI. Badge "Chỉ xem" chỉ hiện khi không có `dress_codes_write`.
- **Tổng quan**: lấy theo develop (đã làm lại theo Figma sau khi nhánh POI tách).
- **package.json/lock**: thêm `leaflet`, `@types/leaflet`, override `undici`, giữ `firebase`; lock tạo lại từ lock develop.

## 3. Kết quả kiểm thử

Ghi tại [POI_TEST_REPORT.md](POI_TEST_REPORT.md).

## 4. Backend blockers

Chưa phát hiện thiếu contract buộc phải sửa backend. Ghi chú: `POI-08` có ở backend nhưng Web chưa có màn hình dùng.
