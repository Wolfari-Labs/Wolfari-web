import { useEffect, useMemo, useRef, useState } from 'react';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GeoapifyMap.module.css';
export interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  number: number;
  scheduled?: boolean;
}
export type MapCenter = { latitude: number; longitude: number };
export function GeoapifyMap({
  points,
  selectedId,
  onSelect,
  onCenter,
  onPin,
  focus,
  embedded = false,
}: {
  points: readonly MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onCenter?: (point: MapCenter) => void;
  onPin?: ((point: MapCenter) => void) | undefined;
  focus?: MapCenter | undefined;
  embedded?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const library = useRef<typeof L | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  // Parent state (map center, notices) must not rebuild marker DOM or steal keyboard focus.
  const pointsKey = JSON.stringify(points);
  const stablePoints = useMemo(() => JSON.parse(pointsKey) as readonly MapPoint[], [pointsKey]);
  const handlers = useRef({ onSelect, onCenter, onPin });
  handlers.current = { onSelect, onCenter, onPin };
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const key = (import.meta.env.VITE_GEOAPIFY_BROWSER_KEY as string | undefined)?.trim();
  useEffect(() => {
    if (!key || !node.current) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import('leaflet')
      .then((l) => {
        if (disposed || !node.current) return;
        library.current = l;
        const m = l.map(node.current, { scrollWheelZoom: false }).setView([16.0544, 108.2022], 12);
        map.current = m;
        l.tileLayer(
          `https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`,
          {
            maxZoom: 20,
            attribution:
              '<a href="https://www.geoapify.com/">Powered by Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            referrerPolicy: 'strict-origin-when-cross-origin',
          },
        )
          .on('tileerror', () => setFailed(true))
          .addTo(m);
        m.on('moveend', () => {
          const c = m.getCenter();
          handlers.current.onCenter?.({ latitude: c.lat, longitude: c.lng });
        });
        m.on('click', (event: L.LeafletMouseEvent) =>
          handlers.current.onPin?.({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
        );
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => m.invalidateSize());
          observer.observe(node.current);
        }
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      layer.current = null;
      setReady(false);
    };
  }, [key]);
  useEffect(() => {
    const m = map.current,
      l = library.current;
    if (!ready || !m || !l) return;
    layer.current?.remove();
    layer.current = l.layerGroup().addTo(m);
    for (const p of stablePoints) {
      const label = document.createElement('span');
      label.textContent = String(p.number);
      const icon = l.divIcon({
        html: label,
        className: `${styles.pin} ${p.scheduled ? styles.scheduled : ''} ${p.id === selectedId ? styles.selected : ''}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      l.marker([p.latitude, p.longitude], { icon, title: p.name, alt: p.name, keyboard: true })
        .on('click', () => handlers.current.onSelect?.(p.id))
        .addTo(layer.current);
    }
    const selected = stablePoints.find((p) => p.id === selectedId);
    if (selected) m.panTo([selected.latitude, selected.longitude]);
    else if (stablePoints.length)
      m.fitBounds(
        stablePoints.map((p) => [p.latitude, p.longitude] as [number, number]),
        { padding: [28, 28], maxZoom: 14 },
      );
  }, [stablePoints, selectedId, ready]);
  useEffect(() => {
    if (ready && focus) map.current?.setView([focus.latitude, focus.longitude], 13);
  }, [focus, ready]);
  if (!key)
    return (
      <div
        className={styles.notice}
        role="status"
        style={
          embedded
            ? { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
            : undefined
        }
      >
        <strong>Bản đồ nền chưa khả dụng</strong>
        <p>Chưa có browser key Geoapify. Danh sách địa điểm vẫn dùng được.</p>
      </div>
    );
  return (
    <div className={styles.wrapper} style={embedded ? { height: '100%' } : undefined}>
      <div
        ref={node}
        className={styles.map}
        style={embedded ? { height: '100%' } : undefined}
        aria-label="Bản đồ địa điểm"
      />
      {failed && (
        <p
          role="status"
          style={
            embedded
              ? {
                  position: 'absolute',
                  bottom: 110,
                  left: 12,
                  right: 8,
                  zIndex: 2,
                  background: 'var(--color-surface)',
                }
              : undefined
          }
        >
          Chưa tải được một số ô bản đồ. Danh sách và pin đã lưu vẫn dùng được.
        </p>
      )}
    </div>
  );
}
