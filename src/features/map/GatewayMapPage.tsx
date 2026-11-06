import { useEffect, useMemo, useRef, useState } from 'react';
import headingPinIcon from '../../shared/assets/figma/trip-map-heading-pin.svg';
import headingCloudArtwork from '../../shared/assets/figma/trip-map-heading-cloud.svg';
import mapSearchIcon from '../../shared/assets/figma/trip-map-search.svg';
import mapFilterIcon from '../../shared/assets/figma/trip-map-filter.svg';
import { Link, useParams } from 'react-router';
import controlInIcon from '../../shared/assets/figma/trip-map-control-in.svg';
import controlSelectedIcon from '../../shared/assets/figma/trip-map-control-selected.svg';
import controlNoneIcon from '../../shared/assets/figma/trip-map-control-none.svg';
import checkIcon from '../../shared/assets/figma/trip-map-check.svg';
import addIcon from '../../shared/assets/figma/trip-map-add.svg';
import mapPlaceArtwork from '../../shared/assets/figma/a33fd.svg';
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
import { TravelTools } from './TravelTools';
import { RecommendationPanel } from '../plan/components/RecommendationPanel';
import type { RouteResult } from '../plan/model/travel';

type MapFilter = 'ALL' | 'SELECTED' | 'SCHEDULED' | 'UNSCHEDULED';
type GoogleMapsRuntime = {
  Polyline?: new (options: Record<string, unknown>) => { setMap: (map: null) => void };
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
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [filter, setFilter] = useState<MapFilter>('ALL');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
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
      mapTypeId: mapType,
      mapId: (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });
    const bounds = new maps.LatLngBounds();
    const line =
      route && maps.Polyline
        ? new maps.Polyline({
            map,
            path: route.geometry.map((c) => ({ lat: c.latitude, lng: c.longitude })),
            strokeColor: '#0e8e69',
            strokeOpacity: 1,
            strokeWeight: 4,
          })
        : null;
    route?.geometry.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
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
          fillColor: item.scheduled ? '#0A89F3' : '#FFB800',
          fillOpacity: 1,
          strokeColor: item.scheduled ? '#066bc3' : '#9a6900',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => setSelectedId(item.location.id));
      return marker;
    });
    if (markers.length > 1) map.fitBounds(bounds, 48);
    return () => {
      rendered.forEach((marker) => marker.setMap(null));
      line?.setMap(null);
    };
  }, [mapType, providerState, markers, route]);

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
                  <span className={styles.panelIcon} aria-hidden="true">
                    <img src={headingPinIcon} width="30" height="36" alt="" />
                  </span>
                  <div className={styles.panelHeaderCopy}>
                    <h1 id="gateway-map-list-title">Tìm kiếm & chọn địa điểm</h1>
                    <p>Tìm kiếm mọi địa điểm. Địa điểm đã chọn sẽ được ghim trên bản đồ.</p>
                  </div>
                  <img className={styles.headingCloud} src={headingCloudArtwork} width="74" height="31" alt="" />
                </header>
                <div className={styles.searchRow}>
                  <label className={styles.search}>
                    <span className={styles.visuallyHidden}>Tìm địa điểm đã lưu</span>
                    <img src={mapSearchIcon} width="22" height="22" alt="" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tìm địa điểm, quán ăn, điểm tham quan..."
                      type="search"
                    />
                  </label>
                  <span className={styles.searchFilterIcon} aria-hidden="true">
                    <img src={mapFilterIcon} width="23" height="23" alt="" />
                  </span>
                </div>
                <div className={styles.filters} role="group" aria-label="Lọc địa điểm đã lưu">
                  {(
                    [
                      ['ALL', 'Tất cả'],
                      ['SELECTED', `Đã chọn (${all.length})`],
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
                          <span
                            className={`${styles.status} ${placeStatus(item) === 'IN_SCHEDULE' ? styles.statusScheduled : styles.statusSelected}`}
                            role="img"
                            aria-label={`${placeStatus(item) === 'IN_SCHEDULE' ? 'Đã thêm vào lịch trình' : 'Đã chọn, chưa xếp lịch'}: ${item.location.name}`}
                          >
                            <img
                              className={styles.statusCircle}
                              src={
                                placeStatus(item) === 'IN_SCHEDULE'
                                  ? controlInIcon
                                  : controlSelectedIcon
                              }
                              alt=""
                            />
                            <img className={styles.statusGlyph} src={checkIcon} alt="" />
                          </span>
                          <span
                            className={`${styles.statusChip} ${placeStatus(item) === 'IN_SCHEDULE' ? styles.statusChipScheduled : styles.statusChipSelected}`}
                          >
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
                <div className={styles.listLegend} aria-label="Chú thích trạng thái địa điểm">
                  <span>
                    <span className={styles.legendIcon} aria-hidden="true">
                      <img src={controlInIcon} width="28" height="28" alt="" />
                      <img src={checkIcon} width="20" height="20" alt="" />
                    </span>
                    Đã thêm vào lịch trình
                  </span>
                  <span>
                    <span className={styles.legendIcon} aria-hidden="true">
                      <img src={controlSelectedIcon} width="28" height="28" alt="" />
                      <img src={checkIcon} width="20" height="20" alt="" />
                    </span>
                    Đã chọn (chưa xếp lịch)
                  </span>
                  <span>
                    <span className={styles.legendIcon} aria-hidden="true">
                      <img src={controlNoneIcon} width="28" height="28" alt="" />
                      <img src={addIcon} width="20" height="20" alt="" />
                    </span>
                    Chưa chọn
                  </span>
                </div>
              </section>
              <section className={styles.mapPanel} aria-labelledby="gateway-map-panel-title">
                <header className={styles.mapHeader}>
                  <h2 id="gateway-map-panel-title" className={styles.visuallyHidden}>
                    Bản đồ địa điểm đã lưu
                  </h2>
                  <span className={styles.routeControl}>Hiển thị lịch trình</span>
                  <div className={styles.mapType} role="group" aria-label="Kiểu bản đồ">
                    <button
                      type="button"
                      aria-pressed={mapType === 'roadmap'}
                      onClick={() => setMapType('roadmap')}
                    >
                      Bản đồ
                    </button>
                    <button
                      type="button"
                      aria-pressed={mapType === 'satellite'}
                      onClick={() => setMapType('satellite')}
                    >
                      Vệ tinh
                    </button>
                  </div>
                </header>
                {providerState === 'ready' ? (
                  <div ref={canvasRef} className={styles.mapCanvas} />
                ) : (
                  <div
                    className={styles.unavailable}
                    role="status"
                    aria-label={
                      markers.length
                        ? route
                          ? 'Danh sách và thông tin tuyến dạng chữ vẫn xem được bên dưới.'
                          : 'Danh sách và chi tiết địa điểm vẫn xem được. Chưa có đường đi hoặc thời gian di chuyển được xác nhận.'
                        : 'Chưa có địa điểm với tọa độ hợp lệ để hiển thị trên bản đồ.'
                    }
                  >
                    <div className={styles.fallbackMapMarkers} aria-hidden="true">
                      {markers.map(({ item }, index) => (
                        <span
                          key={item.location.id}
                          className={`${styles.fallbackMarker} ${item.scheduled ? styles.fallbackMarkerScheduled : styles.fallbackMarkerUnscheduled} ${styles[`fallbackMarker${Math.min(index + 1, 6)}`]}`}
                        >
                          {item.markerNumber}
                        </span>
                      ))}
                    </div>
                    <span className={styles.fallbackMapLabel}>Bản đồ nền chưa khả dụng</span>
                    <div className={styles.fallbackLegend}>
                      <span><i className={styles.legendScheduled} />Trong lịch</span>
                      <span><i className={styles.legendSelected} />Đã chọn · Chưa xếp</span>
                    </div>
                    <p className={styles.fallbackSuggestion}>✴ Khám phá thêm địa điểm gần lộ trình</p>
                  </div>
                )}
                {selected && (
                  <article className={styles.detail} aria-label="Chi tiết địa điểm đã chọn">
                    <img src={mapPlaceArtwork} width="230" height="90" alt="" />
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
            <TravelTools
              trip={data.trip}
              plan={data.plan}
              refresh={snapshot.retry}
              onRoute={setRoute}
            />
            <RecommendationPanel
              type="ROUTE_ORDER"
              trip={data.trip}
              plan={data.plan}
              refresh={snapshot.retry}
            />
            {!data.plan.capabilities?.locations_write && (
              <CapabilityNote>
                Chỉ xem địa điểm đã lưu. Tìm kiếm và lọc chỉ áp dụng trong danh sách hiện tại; chức
                năng thêm, bỏ chọn hoặc lưu địa điểm chưa khả dụng ở trang này.
              </CapabilityNote>
            )}
          </>
        )}
      </TripPlanBoundary>
    </section>
  );
}
