import type { PlaceRoute, RouteMode } from './places';
import styles from './RouteAttribution.module.css';

export const routeModeLabels: Record<RouteMode, string> = {
  DRIVING: 'Ô tô',
  WALKING: 'Đi bộ',
  CYCLING: 'Xe đạp',
};

export function RouteAttribution({ route }: { route: PlaceRoute | null }) {
  const source = route?.source;
  if (!source || (!source.stale && !source.attribution.length)) return null;
  return (
    <p className={styles.credit}>
      {source.stale && <span>Dữ liệu tuyến cũ · </span>}
      {source.attribution.map((credit, index) => (
        <span key={`${credit.text}:${credit.url}`}>
          {index > 0 && ' · '}
          {credit.url ? (
            <a href={credit.url} target="_blank" rel="noreferrer">
              {credit.text}
            </a>
          ) : (
            credit.text
          )}
        </span>
      ))}
    </p>
  );
}
