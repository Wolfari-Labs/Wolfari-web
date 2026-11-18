import { useEffect, useMemo, useState, type Ref } from 'react';
import type { PlanViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import { validCoordinates } from '../../map/trip-map';
import { GeoapifyMap, type MapCenter, type MapRoute } from '../../map/GeoapifyMap';
import type { PlaceRoute } from '../../map/places';
import { useRuntimeServices } from '../../../app/gateway-context';
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
/** Contract 4.4 accepts 2–25 stops. */
const MAX_ROUTE_STOPS = 25;
const ROUTE_DEBOUNCE_MS = 400;
const kmFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
export function routeSummary(route: PlaceRoute) {
  const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
  const time =
    minutes >= 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`;
  return `${kmFormat.format(route.distanceM / 1000)} km · ${time} (ước lượng ô tô)`;
}
/**
 * Ordered stops of one day → OSRM route when available, otherwise a dashed straight line.
 * Only the stop sequence triggers a request, so marker selection never refetches.
 */
function useDayRoute(stops: readonly MapCenter[]) {
  const service = useRuntimeServices()?.places;
  const key = JSON.stringify(stops);
  const routable = !!service && stops.length >= 2 && stops.length <= MAX_ROUTE_STOPS;
  const [result, setResult] = useState<{ key: string; route: PlaceRoute | null } | null>(null);
  useEffect(() => {
    if (!routable || !service) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      service
        .route(JSON.parse(key) as MapCenter[], controller.signal)
        .then((route) => setResult({ key, route }))
        .catch(() => {
          if (!controller.signal.aborted) setResult({ key, route: null });
        });
    }, ROUTE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, routable, service]);
  if (stops.length < 2) return { route: null, summary: null, estimated: false };
  const current = result?.key === key ? result.route : null;
  const loading = routable && result?.key !== key;
  const route: MapRoute = current
    ? { coordinates: current.geometry, estimated: false }
    : { coordinates: stops, estimated: true };
  return {
    route,
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
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  day: string;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
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
    <section className={styles.panel} aria-label={title} data-plan-day-map={day}>
      <header className={styles.header}>
        <div>
          <h3>{title}</h3>
          <p>{locations.length} địa điểm gắn với hoạt động đã xếp lịch</p>
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
      <div className={styles.map} style={{ height: 240 }}>
        <GeoapifyMap
          embedded
          points={points}
          selectedId={selected}
          onSelect={setSelected}
          route={dayRoute.route}
        />
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
      <div className={styles.listRegion}>
        <h4>Địa điểm trong lịch trình</h4>
        {locations.length ? (
          <ol className={styles.list}>
            {locations.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                <span>{p.address ?? 'Chưa có địa chỉ'}</span>
                {!validCoordinates(p) && <small>Chưa có tọa độ hợp lệ</small>}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.empty}>Chưa có địa điểm nào trong ngày đang xem.</p>
        )}
      </div>
    </section>
  );
}
