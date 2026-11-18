import { useEffect, useMemo, useRef, useState } from 'react';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GeoapifyMap.module.css';
import { CLUSTER_MAX_ZOOM, clusterPoints } from './map-cluster';
import type { MapBounds } from './places';
export interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  number: number;
  scheduled?: boolean;
  /** POI-OVERTURE W12: `true` lets the point join a grid cluster (curated/saved stay single). */
  clusterable?: boolean;
  /** POI-OVERTURE W13: adds the Overture credit while such a point is in the frame. */
  overture?: boolean;
}
export interface MapViewportChange {
  bounds: MapBounds;
  zoom: number;
}
/**
 * Leaflet only maps Enter on a marker to popups; focusable markers (role=button) also need
 * Enter/Space to act like a click for keyboard users.
 */
function activates(event: L.LeafletEvent) {
  if (event.type !== 'keydown') return true;
  const key = (event as L.LeafletKeyboardEvent).originalEvent;
  if (key.key !== 'Enter' && key.key !== ' ') return false;
  key.preventDefault();
  return true;
}
const OVERTURE_CREDIT = '© <a href="https://overturemaps.org/">Overture Maps Foundation</a>';
export type MapCenter = { latitude: number; longitude: number };
/** Ordered line between stops; `estimated` draws a dashed straight-line fallback. */
export interface MapRoute {
  coordinates: readonly MapCenter[];
  estimated: boolean;
}
export function GeoapifyMap({
  points,
  selectedId,
  onSelect,
  onCenter,
  onPin,
  focus,
  route,
  embedded = false,
  autoFit = true,
  onViewport,
}: {
  points: readonly MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onCenter?: (point: MapCenter) => void;
  onPin?: ((point: MapCenter) => void) | undefined;
  focus?: MapCenter | undefined;
  route?: MapRoute | null | undefined;
  embedded?: boolean;
  /** `false` (bbox explore) never refits to the point set; the user owns the frame. */
  autoFit?: boolean;
  /** Fired on load and after every move/zoom with the visible bounds. */
  onViewport?: (change: MapViewportChange) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const library = useRef<typeof L | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const fittedKey = useRef<string | null>(null);
  // Parent state (map center, notices) must not rebuild marker DOM or steal keyboard focus.
  const pointsKey = JSON.stringify(points);
  const stablePoints = useMemo(() => JSON.parse(pointsKey) as readonly MapPoint[], [pointsKey]);
  const routeKey = JSON.stringify(route ?? null);
  const stableRoute = useMemo(() => JSON.parse(routeKey) as MapRoute | null, [routeKey]);
  const handlers = useRef({ onSelect, onCenter, onPin, onViewport });
  handlers.current = { onSelect, onCenter, onPin, onViewport };
  const pointsRef = useRef(stablePoints);
  pointsRef.current = stablePoints;
  const overtureCredit = useRef(false);
  const pannedId = useRef<string | null | undefined>(undefined);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [zoom, setZoom] = useState(12);
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
        const emitViewport = () => {
          const b = m.getBounds();
          handlers.current.onViewport?.({
            bounds: {
              west: b.getWest(),
              south: b.getSouth(),
              east: b.getEast(),
              north: b.getNorth(),
            },
            zoom: m.getZoom(),
          });
        };
        m.on('moveend', () => {
          const c = m.getCenter();
          handlers.current.onCenter?.({ latitude: c.lat, longitude: c.lng });
          syncOvertureCredit(m);
          emitViewport();
        });
        m.on('zoomend', () => setZoom(m.getZoom()));
        m.on('click', (event: L.LeafletMouseEvent) =>
          handlers.current.onPin?.({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
        );
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => m.invalidateSize());
          observer.observe(node.current);
        }
        setReady(true);
        emitViewport();
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      layer.current = null;
      routeLayer.current = null;
      fittedKey.current = null;
      overtureCredit.current = false;
      pannedId.current = undefined;
      setReady(false);
    };
  }, [key]);
  useEffect(() => {
    const m = map.current,
      l = library.current;
    if (!ready || !m || !l) return;
    layer.current?.remove();
    const group = l.layerGroup();
    // Callers decide what may cluster (`clusterable`), e.g. not the place the user picked.
    const items = clusterPoints(stablePoints, zoom);
    for (const item of items) {
      if (item.kind === 'cluster') {
        const label = document.createElement('span');
        label.textContent = String(item.count);
        const size = item.count < 10 ? 36 : item.count < 100 ? 42 : 48;
        const title = `${item.count} địa điểm — phóng to`;
        l.marker([item.latitude, item.longitude], {
          icon: l.divIcon({
            html: label,
            className: styles.cluster,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          title,
          alt: title,
          keyboard: true,
          zIndexOffset: -100,
        })
          .on('click keydown', (event: L.LeafletEvent) => {
            if (!activates(event)) return;
            const bounds = l.latLngBounds(
              item.points.map((p) => [p.latitude, p.longitude] as [number, number]),
            );
            if (bounds.getNorthEast().equals(bounds.getSouthWest()))
              m.setView(bounds.getCenter(), Math.min(m.getZoom() + 2, CLUSTER_MAX_ZOOM));
            else m.fitBounds(bounds, { padding: [40, 40], maxZoom: CLUSTER_MAX_ZOOM });
          })
          .addTo(group);
        continue;
      }
      const p = item.point;
      const label = document.createElement('span');
      label.textContent = String(p.number);
      const icon = l.divIcon({
        html: label,
        className: `${styles.pin} ${p.scheduled ? styles.scheduled : ''} ${p.id === selectedId ? styles.selected : ''}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      l.marker([p.latitude, p.longitude], { icon, title: p.name, alt: p.name, keyboard: true })
        .on('click keydown', (event: L.LeafletEvent) => {
          if (activates(event)) handlers.current.onSelect?.(p.id);
        })
        .addTo(group);
    }
    layer.current = group.addTo(m);
    const selected = stablePoints.find((p) => p.id === selectedId);
    const selectionChanged = pannedId.current !== selectedId;
    pannedId.current = selectedId;
    if (!autoFit) {
      // bbox explore: results follow the frame, so refitting would loop moveend -> reload.
      fittedKey.current = pointsKey;
      if (
        selected &&
        selectionChanged &&
        !m.getBounds().contains([selected.latitude, selected.longitude])
      )
        m.panTo([selected.latitude, selected.longitude]);
    } else if (fittedKey.current !== pointsKey && stablePoints.length) {
      // Fit once per point set; a selection change alone only pans.
      fittedKey.current = pointsKey;
      if (selected && stablePoints.length === 1) m.panTo([selected.latitude, selected.longitude]);
      else
        m.fitBounds(
          stablePoints.map((p) => [p.latitude, p.longitude] as [number, number]),
          { padding: [28, 28], maxZoom: 14 },
        );
    } else if (selected && selectionChanged) m.panTo([selected.latitude, selected.longitude]);
    syncOvertureCredit(m);
  }, [stablePoints, pointsKey, selectedId, ready, zoom, autoFit]);
  useEffect(() => {
    const m = map.current,
      l = library.current;
    if (!ready || !m || !l) return;
    routeLayer.current?.remove();
    routeLayer.current = null;
    if (!stableRoute || stableRoute.coordinates.length < 2) return;
    routeLayer.current = l.layerGroup().addTo(m);
    l.polyline(
      stableRoute.coordinates.map((c) => [c.latitude, c.longitude] as [number, number]),
      {
        className: stableRoute.estimated ? styles.routeEstimated : styles.route,
        color: '#0b7f99',
        weight: 4,
        opacity: 0.85,
        interactive: false,
        ...(stableRoute.estimated ? { dashArray: '8 8' } : {}),
      },
    ).addTo(routeLayer.current); // overlayPane sits below markerPane, so pins stay on top.
  }, [stableRoute, ready]);
  useEffect(() => {
    if (ready && focus) map.current?.setView([focus.latitude, focus.longitude], 13);
  }, [focus, ready]);
  /** W13: credit Overture only while at least one Overture point is inside the frame. */
  function syncOvertureCredit(m: L.Map) {
    const bounds = m.getBounds();
    const visible = pointsRef.current.some(
      (p) => p.overture && bounds.contains([p.latitude, p.longitude]),
    );
    if (visible === overtureCredit.current) return;
    overtureCredit.current = visible;
    if (visible) m.attributionControl?.addAttribution(OVERTURE_CREDIT);
    else m.attributionControl?.removeAttribution(OVERTURE_CREDIT);
  }
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
