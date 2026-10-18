import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/components/Button';
import desktopMapArtwork from '../../shared/assets/figma/a75f2.svg';
import desktopPlaceArtwork from '../../shared/assets/figma/a33fd.svg';
import mobileMapArtwork from '../../shared/assets/figma/316c4.svg';
import destinationPhoto from '../../shared/assets/figma/16cac.png';
import type { MapLocationPresentation } from './trip-map';
import { activityScheduleLabel, validCoordinates } from './trip-map';
import { loadGoogleMapsSdk } from './google-places';
import styles from './TripMapPage.module.css';

function locationPhoto(item: MapLocationPresentation | null, mobile = false) {
  if (!item) return mobile ? destinationPhoto : desktopPlaceArtwork;
  if (item.location.name === 'Bãi biển Mỹ Khê')
    return mobile ? destinationPhoto : desktopPlaceArtwork;
  return (
    item.activities[0]?.presentation.cover?.src ??
    (mobile ? destinationPhoto : desktopPlaceArtwork)
  );
}

export function MapViewport({
  items,
  selectedLocationId,
  timezone,
  previewEnabled,
  mapType = 'roadmap',
  onSelect,
  onOpenDetail,
}: {
  items: readonly MapLocationPresentation[];
  selectedLocationId: string | null;
  timezone: string;
  previewEnabled: boolean;
  mapType?: 'roadmap' | 'satellite';
  onSelect: (locationId: string) => void;
  onOpenDetail: () => void;
}) {
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const [googleMapReady, setGoogleMapReady] = useState(false);
  const markerItems = items.filter((item) => validCoordinates(item.location) !== null);
  const selected =
    items.find((item) => item.location.id === selectedLocationId) ?? items[0] ?? null;
  const primaryActivity = selected?.activities[0];
  const googleConfigured = Boolean((import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim());

  useEffect(() => {
    let disposed = false;
    if (!previewEnabled || markerItems.length === 0) return;
    void loadGoogleMapsSdk().then((available) => { if (!disposed) setGoogleMapReady(available); });
    return () => { disposed = true; };
  }, [markerItems.length, previewEnabled]);

  useEffect(() => {
    if (!googleMapReady || !mapCanvasRef.current) return;
    const googleMaps = (window as Window & { google?: any }).google?.maps;
    if (!googleMaps?.Map) return;
    const coordinates = markerItems.map((item) => validCoordinates(item.location)).filter(Boolean) as { latitude: number; longitude: number }[];
    if (!coordinates.length) return;
    const selectedCoordinate = selected ? validCoordinates(selected.location) : null;
    const center = selectedCoordinate ?? coordinates[0]!;
    const map = new googleMaps.Map(mapCanvasRef.current, {
      center: { lat: center.latitude, lng: center.longitude }, zoom: 12, mapTypeId: mapType,
      mapId: (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined,
      streetViewControl: false, fullscreenControl: false, mapTypeControl: false,
    });
    const bounds = new googleMaps.LatLngBounds();
    markerItems.forEach((item) => {
      const coordinate = validCoordinates(item.location);
      if (!coordinate) return;
      bounds.extend({ lat: coordinate.latitude, lng: coordinate.longitude });
      const marker = new googleMaps.Marker({
        map, position: { lat: coordinate.latitude, lng: coordinate.longitude }, title: item.location.name,
        label: { text: String(item.markerNumber), color: item.scheduled ? '#fff' : '#6c4a00', fontWeight: '700' },
        icon: { path: googleMaps.SymbolPath.CIRCLE, scale: item.location.id === selected?.location.id ? 15 : 11, fillColor: item.scheduled ? '#0098c8' : '#f6b82e', fillOpacity: 1, strokeColor: item.scheduled ? '#007c9f' : '#da9b0a', strokeWeight: 2 },
      });
      marker.addListener('click', () => onSelect(item.location.id));
    });
    if (markerItems.length > 1) map.fitBounds(bounds, 48);
  }, [googleMapReady, mapType, markerItems, onSelect, selected]);

  if (!previewEnabled) {
    return (
      <section
        className={`${styles.viewport} ${styles.unavailableViewport}`}
        aria-labelledby="map-viewport-title"
      >
        <div aria-hidden="true" className={styles.mapPattern} />
        <div className={styles.providerState}>
          <strong id="map-viewport-title">Bản đồ nền chưa được cấu hình</strong>
          <p>
            Danh sách và chi tiết địa điểm vẫn dùng được. Không có tile, script hoặc request
            tới nhà cung cấp bên ngoài.
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
      className={`${styles.viewport} ${googleMapReady ? styles.googleMapActive : ''}`}
      aria-label="Bản đồ hành trình minh họa"
      aria-describedby="map-provider-note"
    >
      {googleMapReady && <div ref={mapCanvasRef} className={styles.googleMapCanvas} aria-label="Google Maps" />}
      {!googleMapReady && <img
        className={styles.desktopMapArtwork}
        src={desktopMapArtwork}
        width="666"
        height="566"
        alt=""
      />}
      {!googleMapReady && !googleConfigured && <span className={styles.providerUnavailableLabel}>Bản đồ nền chưa được cấu hình</span>}
      {!googleMapReady && <img
        className={styles.mobileMapArtwork}
        src={mobileMapArtwork}
        width="354"
        height="428"
        alt=""
      />}

      <div className={styles.mapLabels} aria-hidden="true">
        <span>Sơn Trà</span>
        <span>Bé Mặn</span>
        <span>Mỹ Khê</span>
        <span>BIỂN ĐÔNG</span>
      </div>

      <div className={styles.markers} aria-label="Các địa điểm trên bản đồ">
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
        <span><i className={styles.scheduledDot} />Trong lịch</span>
        <span><i className={styles.unscheduledDot} />Đã chọn · Chưa xếp</span>
      </div>

      {selected && (
        <>
          <article
            className={styles.desktopPlaceCard}
            aria-label={`Đang chọn ${selected.location.name}`}
          >
            <img src={locationPhoto(selected)} width="230" height="90" alt="" />
            <strong>{selected.location.name}</strong>
            <span>⌖ {selected.location.address ?? 'Chưa có địa chỉ'}</span>
            <p>
              {primaryActivity?.description ??
                (selected.scheduled
                  ? 'Địa điểm đã được thêm vào lịch trình của chuyến đi.'
                  : 'Địa điểm đã lưu và chưa được xếp vào lịch trình.')}
            </p>
          </article>

          <article
            className={styles.mobilePlaceCard}
            aria-label={`Đang chọn ${selected.location.name}`}
          >
            <div className={styles.mobilePlaceSummary}>
              <img src={locationPhoto(selected, true)} width="60" height="60" alt="" />
              <div>
                <strong>{selected.location.name}</strong>
                <span>{activityScheduleLabel(primaryActivity, timezone)}</span>
              </div>
            </div>
            <Button className={styles.mobileDetailButton} onClick={onOpenDetail}>
              Xem địa điểm
            </Button>
          </article>
        </>
      )}

      <p className={styles.mapSuggestion}>☀ Khám phá thêm địa điểm gần lộ trình</p>
    </section>
  );
}
