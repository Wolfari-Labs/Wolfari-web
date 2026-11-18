/**
 * Grid clustering for Leaflet markers (POI-OVERTURE W12, AC-PL02). Written in-house: the task
 * forbids adding `leaflet.markercluster`. Points are projected to Web Mercator pixels at the
 * current zoom and grouped per `cellPx` square cell; cells with ≥ 2 clusterable points become
 * one numbered cluster. Non-clusterable points (curated Wolfari pins, saved places, the
 * selected place) always stay individual.
 */
export interface ClusterInput {
  id: string;
  latitude: number;
  longitude: number;
  /** Only `true` joins clusters; anything else (Plan day maps, saved pins) stays single. */
  clusterable?: boolean;
}
export type ClusterItem<T extends ClusterInput> =
  | { kind: 'point'; point: T }
  | {
      kind: 'cluster';
      id: string;
      count: number;
      latitude: number;
      longitude: number;
      points: readonly T[];
    };

/** From this zoom on, nothing is clustered (identical coordinates would never split). */
export const CLUSTER_MAX_ZOOM = 18;
export const CLUSTER_CELL_PX = 60;

const MAX_LATITUDE = 85.0511287798;
/** Web Mercator world pixels (256 px tiles) for a coordinate at `zoom`. */
export function projectPx(latitude: number, longitude: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  const lat = (Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude)) * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * size,
  };
}

export function clusterPoints<T extends ClusterInput>(
  points: readonly T[],
  zoom: number,
  cellPx = CLUSTER_CELL_PX,
): ClusterItem<T>[] {
  if (zoom >= CLUSTER_MAX_ZOOM) return points.map((point) => ({ kind: 'point' as const, point }));
  const cells = new Map<string, T[]>();
  const order: (T | string)[] = [];
  for (const point of points) {
    if (point.clusterable !== true) {
      order.push(point);
      continue;
    }
    const { x, y } = projectPx(point.latitude, point.longitude, zoom);
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`;
    const cell = cells.get(key);
    if (cell) cell.push(point);
    else {
      cells.set(key, [point]);
      order.push(key);
    }
  }
  return order.map((entry): ClusterItem<T> => {
    if (typeof entry !== 'string') return { kind: 'point', point: entry };
    const members = cells.get(entry)!;
    if (members.length === 1) return { kind: 'point', point: members[0]! };
    return {
      kind: 'cluster',
      id: `cluster:${zoom}:${entry}`,
      count: members.length,
      latitude: members.reduce((sum, p) => sum + p.latitude, 0) / members.length,
      longitude: members.reduce((sum, p) => sum + p.longitude, 0) / members.length,
      points: members,
    };
  });
}
