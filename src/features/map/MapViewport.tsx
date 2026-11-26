import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../shared/components/Button';
import desktopMapArtwork from '../../shared/assets/v2/map-art.svg';
import desktopPlaceArtwork from '../../shared/assets/figma/a33fd.svg';
import mobileMapArtwork from '../../shared/assets/figma/316c4.svg';
import destinationPhoto from '../../shared/assets/figma/16cac.png';
import type { MapLocationPresentation } from './trip-map';
import { activityScheduleLabel, validCoordinates } from './trip-map';
import { loadGoogleMapsSdk } from './google-places';
import type { PlaceImage } from './places';
import { PlacePhoto } from './PlacePhoto';
import styles from './TripMapPage.module.css';

type GoogleMapsRuntime = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => {
    fitBounds: (bounds: unknown, padding: number) => void;
  };
  LatLngBounds: new () => { extend: (coordinate: { lat: number; lng: number }) => void };
  Marker: new (options: Record<string, unknown>) => {
    addListener: (eventName: string, listener: () => void) => void;
  };
  SymbolPath: { CIRCLE: unknown };
};

function locationPhoto(item: MapLocationPresentation | null, mobile = false) {
  if (!item) return mobile ? destinationPhoto : desktopPlaceArtwork;
  if (item.location.name === 'Bãi biển Mỹ Khê')
    return mobile ? destinationPhoto : desktopPlaceArtwork;
  return (
    item.activities[0]?.presentation.cover?.src ?? (mobile ? destinationPhoto : desktopPlaceArtwork)
  );
}

export function MapViewport({
  items,
  selectedLocationId,
  selectedScreenPosition,
  timezone,
  previewEnabled,
  mapType = 'roadmap',
  onSelect,
  onOpenDetail,
  runtimeMap,
  selectedActions,
  selectedMeta,
  selectedImage,
  autoSelectFirst = true,
}: {
  items: readonly MapLocationPresentation[];
  selectedLocationId: string | null;
  selectedScreenPosition?: { x: number; y: number } | null;
  timezone: string;
  previewEnabled: boolean;
  mapType?: 'roadmap' | 'satellite';
  onSelect: (locationId: string) => void;
  onOpenDetail: () => void;
  runtimeMap?: ReactNode;
  /** Runtime commands for the selected place, inside the existing selected-place card. */
  selectedActions?: ReactNode;
  /** Runtime source line for the selected place (POI-OVERTURE W10, FR-TI01). */
  selectedMeta?: ReactNode;
  selectedImage?: PlaceImage | null;
  /** `false`: no card until the user picks a place (POI-OVERTURE bbox explore). */
  autoSelectFirst?: boolean;
}) {
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [cardPosition, setCardPosition] = useState<{ left: number; top: number } | null>(null);
  const [googleMapReady, setGoogleMapReady] = useState(false);
  const [mapProviderState, setMapProviderState] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle');
  const markerItems = items.filter((item) => validCoordinates(item.location) !== null);
  const selected =
    items.find((item) => item.location.id === selectedLocationId) ??
    (autoSelectFirst ? items[0] : null) ??
    null;
  const primaryActivity = selected?.activities[0];
  const googleConfigured =
    !runtimeMap &&
    Boolean((import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim());

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const card = cardRef.current;
    if (!viewport || !card) return;
    const updatePosition = () => {
      const viewportBounds = viewport.getBoundingClientRect();
      let point = selectedScreenPosition;
      if (!runtimeMap) {
        const marker = viewport.querySelector<HTMLElement>(
          '[class*="marker"][aria-pressed="true"]',
        );
        if (marker) {
          const bounds = marker.getBoundingClientRect();
          point = {
            x: bounds.left + bounds.width / 2 - viewportBounds.left,
            y: bounds.top + bounds.height / 2 - viewportBounds.top,
          };
        }
      }
      if (!point) {
        setCardPosition(null);
        return;
      }
      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;
      const left =
        point.x + 20 + cardWidth <= viewportBounds.width - 12
          ? point.x + 20
          : Math.max(12, point.x - cardWidth - 20);
      const top = Math.max(
        76,
        Math.min(point.y - cardHeight / 2, viewportBounds.height - cardHeight - 54),
      );
      setCardPosition((previous) =>
        previous?.left === left && previous.top === top ? previous : { left, top },
      );
    };
    updatePosition();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(viewport);
    observer.observe(card);
    return () => observer.disconnect();
  }, [selected?.location.id, selectedScreenPosition, runtimeMap]);

  useEffect(() => {
    let disposed = false;
    if (!googleConfigured || markerItems.length === 0) {
      setMapProviderState('unavailable');
      return;
    }
    setMapProviderState('loading');
    void loadGoogleMapsSdk().then((available) => {
      if (disposed) return;
      setGoogleMapReady(available);
      setMapProviderState(available ? 'ready' : 'unavailable');
    });
    return () => {
      disposed = true;
    };
  }, [googleConfigured, markerItems.length]);

  useEffect(() => {
    if (!googleMapReady || !mapCanvasRef.current) return;
    const googleMaps = (window as unknown as { google?: { maps?: GoogleMapsRuntime } }).google
      ?.maps;
    if (!googleMaps?.Map) return;
    const coordinates = markerItems
      .map((item) => validCoordinates(item.location))
      .filter(Boolean) as { latitude: number; longitude: number }[];
    if (!coordinates.length) return;
    const selectedCoordinate = selected ? validCoordinates(selected.location) : null;
    const center = selectedCoordinate ?? coordinates[0]!;
    const map = new googleMaps.Map(mapCanvasRef.current, {
      center: { lat: center.latitude, lng: center.longitude },
      zoom: 12,
      mapTypeId: mapType,
      mapId: (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });
    const bounds = new googleMaps.LatLngBounds();
    markerItems.forEach((item) => {
      const coordinate = validCoordinates(item.location);
      if (!coordinate) return;
      bounds.extend({ lat: coordinate.latitude, lng: coordinate.longitude });
      const marker = new googleMaps.Marker({
        map,
        position: { lat: coordinate.latitude, lng: coordinate.longitude },
        title: item.location.name,
        label: {
          text: String(item.markerNumber),
          color: item.scheduled ? '#fff' : '#6c4a00',
          fontWeight: '700',
        },
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: item.location.id === selected?.location.id ? 15 : 11,
          fillColor: item.scheduled ? '#0e8e69' : '#f6b82e',
          fillOpacity: 1,
          strokeColor: item.scheduled ? '#087052' : '#da9b0a',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => onSelect(item.location.id));
    });
    if (markerItems.length > 1) map.fitBounds(bounds, 48);
  }, [googleMapReady, mapType, markerItems, onSelect, selected]);

  if (!runtimeMap && !previewEnabled && mapProviderState !== 'ready') {
    return (
      <section
        className={`${styles.viewport} ${styles.unavailableViewport}`}
        aria-labelledby="map-viewport-title"
      >
        <div aria-hidden="true" className={styles.mapPattern} />
        <div className={styles.providerState}>
          <strong id="map-viewport-title">
            {mapProviderState === 'loading'
              ? 'Đang tải Google Maps'
              : 'Bản đồ nền chưa được cấu hình'}
          </strong>
          <p>
            Danh sách và chi tiết địa điểm vẫn dùng được. Không có tile, script hoặc request tới nhà
            cung cấp bên ngoài.
          </p>
          <small>
            {markerItems.length} địa điểm có tọa độ hợp lệ đã sẵn sàng khi provider được duyệt.
          </small>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={viewportRef}
      className={`${styles.viewport} ${googleMapReady ? styles.googleMapActive : ''}`}
      aria-label={runtimeMap ? 'Bản đồ hành trình' : 'Bản đồ hành trình minh họa'}
    >
      {runtimeMap && <div className={styles.googleMapCanvas}>{runtimeMap}</div>}
      {googleMapReady && (
        <div ref={mapCanvasRef} className={styles.googleMapCanvas} aria-label="Google Maps" />
      )}
      {!runtimeMap && !googleMapReady && (
        <img
          className={styles.desktopMapArtwork}
          src={desktopMapArtwork}
          width="680"
          height="700"
          alt=""
        />
      )}
      {!runtimeMap && !googleMapReady && <span className={styles.mapArtLabel}>Minh họa</span>}
      {!runtimeMap && !googleMapReady && (
        <img
          className={styles.mobileMapArtwork}
          src={mobileMapArtwork}
          width="354"
          height="428"
          alt=""
        />
      )}

      <div
        className={styles.mapLabels}
        aria-hidden="true"
        style={runtimeMap ? { display: 'none' } : undefined}
      >
        <span>Sơn Trà</span>
        <span>Bé Mặn</span>
        <span>Mỹ Khê</span>
        <span>BIỂN ĐÔNG</span>
      </div>

      <div
        className={styles.markers}
        aria-label="Các địa điểm trên bản đồ"
        style={runtimeMap ? { display: 'none' } : undefined}
      >
        {markerItems.map((item) => (
          <button
            key={item.location.id}
            type="button"
            className={`${styles.marker} ${
              item.scheduled ? styles.markerScheduled : styles.markerUnscheduled
            } ${styles[`marker${Math.min(item.markerNumber, 6)}`]}`}
            aria-label={`${item.markerNumber}. ${item.location.name}`}
            aria-pressed={item.location.id === selected?.location.id}
            onClick={() => onSelect(item.location.id)}
          >
            {item.markerNumber}
          </button>
        ))}
      </div>

      <div className={styles.legend} aria-label="Chú thích bản đồ">
        <span>
          <i className={styles.scheduledDot} />
          Trong lịch
        </span>
        <span>
          <i className={styles.unscheduledDot} />
          Đã chọn · Chưa xếp
        </span>
      </div>

      {selected && (
        <>
          <article
            ref={cardRef}
            className={styles.desktopPlaceCard}
            style={cardPosition ? { left: cardPosition.left, top: cardPosition.top } : undefined}
            aria-label={`Đang chọn ${selected.location.name}`}
          >
            {runtimeMap ? (
              <PlacePhoto image={selectedImage} name={selected.location.name} linked />
            ) : (
              <img src={locationPhoto(selected)} width="230" height="90" alt="" />
            )}
            <strong>{selected.location.name}</strong>
            <span>⌖ {selected.location.address?.trim() || 'Chưa có địa chỉ'}</span>
            {selectedMeta}
            <p>
              {(runtimeMap && !validCoordinates(selected.location)
                ? 'Chưa có tọa độ hợp lệ'
                : primaryActivity?.description) ??
                (selected.scheduled
                  ? 'Địa điểm đã được thêm vào lịch trình của chuyến đi.'
                  : selected.selected
                    ? 'Địa điểm đã lưu và chưa được xếp vào lịch trình.'
                    : 'Chọn địa điểm để lưu vào chuyến đi.')}
            </p>
            {selectedActions}
          </article>

          <article
            className={styles.mobilePlaceCard}
            aria-label={`Đang chọn ${selected.location.name}`}
          >
            <div className={styles.mobilePlaceSummary}>
              {runtimeMap ? (
                <PlacePhoto image={selectedImage} name={selected.location.name} compact linked />
              ) : (
                <img src={locationPhoto(selected, true)} width="60" height="60" alt="" />
              )}
              <div>
                <strong>{selected.location.name}</strong>
                <span>{activityScheduleLabel(primaryActivity, timezone)}</span>
                {selectedMeta}
              </div>
            </div>
            <Button className={styles.mobileDetailButton} onClick={onOpenDetail}>
              Xem địa điểm
            </Button>
          </article>
        </>
      )}
    </section>
  );
}
