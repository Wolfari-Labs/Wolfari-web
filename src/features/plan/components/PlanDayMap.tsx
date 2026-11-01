import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import type { PlanViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import { validCoordinates } from '../../map/trip-map';
import { loadGoogleMapsSdk } from '../../map/google-places';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import styles from './PlanDayMap.module.css';

type GoogleMapsRuntime = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => {
    fitBounds: (bounds: unknown, padding: number) => void;
  };
  LatLngBounds: new () => { extend: (coordinate: { lat: number; lng: number }) => void };
  Marker: new (options: Record<string, unknown>) => { setMap: (map: null) => void };
  SymbolPath: { CIRCLE: unknown };
};

function googleMaps(): GoogleMapsRuntime | null {
  const maps = (window as unknown as { google?: { maps?: GoogleMapsRuntime } }).google?.maps;
  return maps?.Map && maps.Marker && maps.LatLngBounds ? maps : null;
}

export function dayMapLocations(
  plan: Pick<PlanViewModel, 'activities' | 'selectedLocations'>,
  day: string,
  timezone: string,
) {
  const linked = new Set(
    plan.activities
      .filter((activity) => {
        const scheduledDay = activity.startsAt
          ? localDate(activity.startsAt, timezone)
          : activity.scheduledDate;
        return scheduledDay && (day === 'ALL' || scheduledDay === day);
      })
      .map((activity) => activity.selectedLocationId)
      .filter((id): id is string => id !== null),
  );
  return plan.selectedLocations.filter((location) => linked.has(location.id));
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [providerState, setProviderState] = useState<'unavailable' | 'loading' | 'ready'>(
    'unavailable',
  );
  const locations = useMemo(
    () => dayMapLocations(plan, day, trip.timezone),
    [plan, day, trip.timezone],
  );
  const markers = useMemo(
    () =>
      locations.flatMap((location) => {
        const coordinates = validCoordinates(location);
        return coordinates ? [{ location, coordinates }] : [];
      }),
    [locations],
  );
  const configured = Boolean(
    (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim(),
  );

  useEffect(() => {
    if (!configured || markers.length === 0) {
      setProviderState('unavailable');
      return;
    }
    let active = true;
    setProviderState('loading');
    void loadGoogleMapsSdk().then((loaded) => {
      if (active) setProviderState(loaded && googleMaps() ? 'ready' : 'unavailable');
    });
    return () => {
      active = false;
    };
  }, [configured, markers.length]);

  useEffect(() => {
    if (providerState !== 'ready' || !canvasRef.current) return;
    const maps = googleMaps();
    if (!maps || markers.length === 0) {
      setProviderState('unavailable');
      return;
    }
    const first = markers[0]!.coordinates;
    const map = new maps.Map(canvasRef.current, {
      center: { lat: first.latitude, lng: first.longitude },
      zoom: 12,
      mapTypeId: 'roadmap',
      mapId: (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });
    const bounds = new maps.LatLngBounds();
    const renderedMarkers = markers.map(({ location, coordinates }, index) => {
      const position = { lat: coordinates.latitude, lng: coordinates.longitude };
      bounds.extend(position);
      return new maps.Marker({
        map,
        position,
        title: location.name,
        label: { text: String(index + 1), color: '#fff', fontWeight: '700' },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: '#0e8e69',
          fillOpacity: 1,
          strokeColor: '#087052',
          strokeWeight: 2,
        },
      });
    });
    if (markers.length > 1) map.fitBounds(bounds, 36);
    return () => renderedMarkers.forEach((marker) => marker.setMap(null));
  }, [providerState, markers]);

  const dayNumber = planDays(trip.startAt, trip.endAt, trip.timezone).indexOf(day) + 1;
  const title =
    day === 'ALL'
      ? 'Bản đồ lịch trình cả chuyến'
      : day === 'POOL'
        ? 'Bản đồ nhóm chưa chọn ngày'
        : `Bản đồ lịch trình ngày ${dayNumber || day}`;
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
      {providerState === 'ready' ? (
        <div ref={canvasRef} className={styles.map} aria-hidden="true" />
      ) : (
        <div className={styles.unavailable} role="status">
          <strong>
            {providerState === 'loading' ? 'Đang tải bản đồ nền' : 'Bản đồ nền chưa khả dụng'}
          </strong>
          <p>
            {markers.length === 0
              ? 'Ngày đang xem chưa có địa điểm gắn với hoạt động và tọa độ hợp lệ.'
              : 'Xem danh sách địa điểm bên dưới. Chưa có đường đi hoặc thời gian di chuyển được xác nhận.'}
          </p>
        </div>
      )}
      <div className={styles.listRegion}>
        <h4>Địa điểm trong lịch trình</h4>
        {locations.length ? (
          <ol className={styles.list}>
            {locations.map((location) => (
              <li key={location.id}>
                <strong>{location.name}</strong>
                <span>{location.address ?? 'Chưa có địa chỉ'}</span>
                {!validCoordinates(location) && <small>Chưa có tọa độ hợp lệ</small>}
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
