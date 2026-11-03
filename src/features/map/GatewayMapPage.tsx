import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { TripHero } from '../trips/components/TripHero';
import { loadGoogleMapsSdk } from './google-places';
import {
  mapLocationPresentations,
  normalizedPlaceText,
  placeStatus,
  sortPlacePresentations,
  validCoordinates,
} from './trip-map';
import styles from './GatewayMapPage.module.css';

type MapFilter = 'ALL' | 'SCHEDULED' | 'UNSCHEDULED';
type GoogleMapsRuntime = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => {
    fitBounds: (bounds: unknown, padding: number) => void;
  };
  LatLngBounds: new () => { extend: (coordinate: { lat: number; lng: number }) => void };
  Marker: new (options: Record<string, unknown>) => {
    setMap: (map: null) => void;
    addListener: (eventName: string, listener: () => void) => void;
  };
  SymbolPath: { CIRCLE: unknown };
};

function mapsRuntime(): GoogleMapsRuntime | null {
  const maps = (window as unknown as { google?: { maps?: GoogleMapsRuntime } }).google?.maps;
  return maps?.Map && maps.Marker && maps.LatLngBounds ? maps : null;
}

export function GatewayMapPage() {
  const { tripId = '' } = useParams();
  const snapshot = useTripPlanSnapshot(tripId, 'success');
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MapFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [providerState, setProviderState] = useState<'unavailable' | 'loading' | 'ready'>(
    'unavailable',
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const locations = data?.plan.selectedLocations;
  const activities = data?.plan.activities;
  const all = useMemo(
    () => sortPlacePresentations(mapLocationPresentations(locations ?? [], activities ?? [])),
    [locations, activities],
  );
  const visible = useMemo(() => {
    const search = normalizedPlaceText(query.trim());
    return all.filter((item) => {
      if (filter === 'SCHEDULED' && !item.scheduled) return false;
      if (filter === 'UNSCHEDULED' && item.scheduled) return false;
      return (
        !search ||
        normalizedPlaceText(`${item.location.name} ${item.location.address ?? ''}`).includes(search)
      );
    });
  }, [all, filter, query]);
  const selected = visible.find((item) => item.location.id === selectedId) ?? visible[0] ?? null;
  const markers = useMemo(
    () =>
      visible.flatMap((item) => {
        const coordinates = validCoordinates(item.location);
        return coordinates ? [{ item, coordinates }] : [];
      }),
    [visible],
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
      if (active) setProviderState(loaded && mapsRuntime() ? 'ready' : 'unavailable');
    });
    return () => {
      active = false;
    };
  }, [configured, markers.length]);

  useEffect(() => {
    if (providerState !== 'ready' || !canvasRef.current) return;
    const maps = mapsRuntime();
    if (!maps || !markers.length) {
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
    const rendered = markers.map(({ item, coordinates }) => {
      const position = { lat: coordinates.latitude, lng: coordinates.longitude };
      bounds.extend(position);
      const marker = new maps.Marker({
        map,
        position,
        title: item.location.name,
        label: { text: String(item.markerNumber), color: '#fff', fontWeight: '700' },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: item.scheduled ? '#0e8e69' : '#da9b0a',
          fillOpacity: 1,
          strokeColor: item.scheduled ? '#087052' : '#9a6900',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => setSelectedId(item.location.id));
      return marker;
    });
    if (markers.length > 1) map.fitBounds(bounds, 48);
    return () => rendered.forEach((marker) => marker.setMap(null));
  }, [providerState, markers]);

  return (
    <section className={styles.page} data-flow="gateway-map-read">
      <nav className={styles.breadcrumb} aria-label="Đường dẫn">
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span aria-hidden="true">›</span>
        <span>Bản đồ & địa điểm</span>
      </nav>
      {data && <TripHero trip={data.trip} variant="landscape" />}
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        {data && (
          <>
            {snapshot.refreshFailed && (
              <CapabilityNote tone="warning">
                Chưa tải được dữ liệu mới. Danh sách đang hiển thị bản đã xem trước đó.
                <Button variant="outline" onClick={() => void snapshot.retry()}>
                  Tải lại
                </Button>
              </CapabilityNote>
            )}
            <div className={styles.workspace}>
              <section className={styles.placePanel} aria-labelledby="gateway-map-list-title">
                <header className={styles.panelHeader}>
                  <h1 id="gateway-map-list-title">Tìm kiếm & chọn địa điểm</h1>
                  <p>{all.length} địa điểm đã lưu trong chuyến đi · tìm trong danh sách này</p>
                </header>
                <label className={styles.search}>
                  <span className={styles.visuallyHidden}>Tìm địa điểm đã lưu</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm địa điểm đã lưu..."
                    type="search"
                  />
                </label>
                <div className={styles.filters} role="group" aria-label="Lọc địa điểm đã lưu">
                  {(
                    [
                      ['ALL', 'Tất cả'],
                      ['SCHEDULED', 'Trong lịch'],
                      ['UNSCHEDULED', 'Chưa xếp'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {visible.length ? (
                  <ul className={styles.placeList}>
                    {visible.map((item) => (
                      <li key={item.location.id}>
                        <button
                          type="button"
                          className={styles.placeButton}
                          aria-pressed={selected?.location.id === item.location.id}
                          onClick={() => setSelectedId(item.location.id)}
                        >
                          <span className={styles.markerNumber}>{item.markerNumber}</span>
                          <span className={styles.placeText}>
                            <strong>{item.location.name}</strong>
                            <small>{item.location.address ?? 'Chưa có địa chỉ'}</small>
                          </span>
                          <span className={styles.status}>
                            {placeStatus(item) === 'IN_SCHEDULE'
                              ? 'Trong lịch'
                              : 'Đã chọn · Chưa xếp'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.empty} role="status">
                    {all.length
                      ? 'Không có địa điểm đã lưu phù hợp. Thử tìm hoặc lọc lại.'
                      : 'Chuyến đi chưa có địa điểm đã lưu.'}
                  </p>
                )}
              </section>
              <section className={styles.mapPanel} aria-labelledby="gateway-map-panel-title">
                <header className={styles.mapHeader}>
                  <h2 id="gateway-map-panel-title">Bản đồ địa điểm đã lưu</h2>
                  <span>{markers.length} địa điểm có tọa độ hợp lệ</span>
                </header>
                {providerState === 'ready' ? (
                  <div ref={canvasRef} className={styles.mapCanvas} />
                ) : (
                  <div className={styles.unavailable} role="status">
                    <strong>
                      {providerState === 'loading'
                        ? 'Đang tải bản đồ nền'
                        : 'Bản đồ nền chưa khả dụng'}
                    </strong>
                    <p>
                      {markers.length
                        ? 'Danh sách và chi tiết địa điểm vẫn xem được. Chưa có đường đi hoặc thời gian di chuyển được xác nhận.'
                        : 'Chưa có địa điểm với tọa độ hợp lệ để hiển thị trên bản đồ.'}
                    </p>
                  </div>
                )}
                {selected && (
                  <article className={styles.detail} aria-label="Chi tiết địa điểm đã chọn">
                    <h3>{selected.location.name}</h3>
                    <p>{selected.location.address ?? 'Chưa có địa chỉ'}</p>
                    <p>
                      {selected.scheduled
                        ? 'Địa điểm đã gắn với hoạt động trong lịch trình.'
                        : 'Đã lưu · Chưa xếp vào lịch trình.'}
                    </p>
                    {!validCoordinates(selected.location) && <small>Chưa có tọa độ hợp lệ</small>}
                    {selected.activities.length > 0 && (
                      <Link to={paths.plan(tripId)}>Xem hoạt động trong lịch trình</Link>
                    )}
                  </article>
                )}
              </section>
            </div>
            <CapabilityNote>
              Chỉ xem địa điểm đã lưu. Tìm kiếm và lọc chỉ áp dụng trong danh sách hiện tại; chức
              năng thêm, bỏ chọn hoặc lưu địa điểm chưa khả dụng ở trang này.
            </CapabilityNote>
          </>
        )}
      </TripPlanBoundary>
    </section>
  );
}
