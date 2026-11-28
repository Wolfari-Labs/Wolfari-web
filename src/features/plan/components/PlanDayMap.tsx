import { useMemo, useState, type Ref } from 'react';
import type { PlanViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import { validCoordinates } from '../../map/trip-map';
import { GeoapifyMap, type MapCenter, type MapRoute } from '../../map/GeoapifyMap';
import type { PlaceRoute, RouteMode } from '../../map/places';
import { usePlaceRoute } from '../../map/use-place-route';
import { RouteAttribution } from '../../map/RouteAttribution';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import styles from './PlanDayMap.module.css';
export function dayMapLocations(
  plan: Pick<PlanViewModel, 'activities' | 'selectedLocations'>,
  day: string,
  timezone: string,
) {
  const ids = [
    ...new Set(
      [...plan.activities]
        .sort((a, b) => a.position - b.position)
        .filter((a) => {
          const scheduled = a.startsAt ? localDate(a.startsAt, timezone) : a.scheduledDate;
          return scheduled && (day === 'ALL' || scheduled === day);
        })
        .map((a) => a.selectedLocationId)
        .filter((id): id is string => id !== null),
    ),
  ];
  return ids.flatMap((id) => {
    const location = plan.selectedLocations.find((p) => p.id === id);
    return location ? [location] : [];
  });
}
const kmFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
export function routeSummary(route: PlaceRoute, mode: RouteMode = 'DRIVING') {
  const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
  const time =
    minutes >= 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`;
  const kind =
    mode === 'DRIVING'
      ? 'ước lượng ô tô'
      : mode === 'WALKING'
        ? 'đi bộ ước tính'
        : 'xe đạp ước tính';
  return `${kmFormat.format(route.distanceM / 1000)} km · ${time} (${kind})`;
}
/**
 * Ordered stops of one day → OSRM route when available, otherwise a dashed straight line.
 * Only the stop sequence triggers a request, so marker selection never refetches.
 */
function useDayRoute(stops: readonly MapCenter[]) {
  const { data: current, loading } = usePlaceRoute(stops, 'DRIVING');
  if (stops.length < 2) return { route: null, data: null, summary: null, estimated: false };
  const route: MapRoute = current
    ? { coordinates: current.geometry, estimated: false }
    : { coordinates: stops, estimated: true };
  return {
    route,
    data: current,
    estimated: !current,
    summary: current
      ? routeSummary(current)
      : loading
        ? 'Đang tính đường đi… (tạm nối thẳng)'
        : 'Đường chim bay — chưa kiểm tra di chuyển',
  };
}
export function PlanDayMap({
  trip,
  plan,
  day,
  onClose,
  closeRef,
  compact = false,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  day: string;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const locations = useMemo(
    () => dayMapLocations(plan, day, trip.timezone),
    [plan, day, trip.timezone],
  );
  const points = useMemo(
    () =>
      locations.flatMap((p, index) => {
        const c = validCoordinates(p);
        return c ? [{ ...c, id: p.id, name: p.name, number: index + 1, scheduled: true }] : [];
      }),
    [locations],
  );
  // One day only: joining stops across days or the unscheduled pool would imply travel.
  const stops = useMemo(
    () =>
      day === 'ALL' || day === 'POOL'
        ? []
        : points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [points, day],
  );
  const dayRoute = useDayRoute(stops);
  const number = planDays(trip.startAt, trip.endAt, trip.timezone).indexOf(day) + 1;
  const title =
    day === 'ALL'
      ? 'Bản đồ lịch trình cả chuyến'
      : day === 'POOL'
        ? 'Bản đồ nhóm chưa chọn ngày'
        : `Bản đồ lịch trình ngày ${number || day}`;
  return (
    <div className={`${styles.column} ${compact ? styles.compact : ''}`}>
      <section className={styles.panel} aria-label={title} data-plan-day-map={day}>
        <header className={styles.header}>
          <div>
            <h3>{compact && number > 0 ? `Bản đồ ngày ${number}` : title}</h3>
            <p className={styles.srOnly}>
              {locations.length} địa điểm gắn với hoạt động đã xếp lịch
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="outline"
            size="icon"
            aria-label="Ẩn bản đồ"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </Button>
        </header>
        <div className={styles.map}>
          <GeoapifyMap
            embedded
            scrollWheelZoom
            points={points}
            selectedId={selected}
            onSelect={setSelected}
            route={dayRoute.route}
          />
          <a
            className={styles.mapLink}
            href={`/trips/${encodeURIComponent(trip.id)}/map?day=${encodeURIComponent(day)}`}
          >
            <Icon name="mapFolded" size={14} />
            Mở bản đồ lớn
          </a>
        </div>
        {dayRoute.summary && (
          <p
            className={styles.routeSummary}
            data-route-summary
            data-estimated={dayRoute.estimated || undefined}
          >
            {dayRoute.summary}
          </p>
        )}
        <RouteAttribution route={dayRoute.data} />
      </section>
    </div>
  );
}
