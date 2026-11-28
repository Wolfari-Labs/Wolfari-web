import { OVERTURE_NOTE, placeDatasetLabel, type PlaceDataset } from './places';
import styles from './TripMapPage.module.css';

const sourceAttribute = {
  golden: 'WOLFARI',
  overture: 'OVERTURE',
  geoapify: 'GEOAPIFY',
  manual: 'MANUAL',
} as const;

/**
 * Source badge for a place (POI-OVERTURE W10). Overture rows carry the "not hand-checked" note
 * in the tooltip instead of a per-row warning; only curated Wolfari pins show "Chưa xác minh".
 */
export function PlaceSourceBadges({
  dataset,
  coordVerified,
  showSource = true,
}: {
  dataset: PlaceDataset | 'manual';
  coordVerified: boolean | null;
  showSource?: boolean;
}) {
  const unverified = dataset === 'golden' && coordVerified === false;
  if (!showSource && !unverified) return null;

  return (
    <span className={styles.placeMeta}>
      {showSource && (
        <span
          className={styles.sourceBadge}
          data-source={sourceAttribute[dataset]}
          title={dataset === 'overture' ? OVERTURE_NOTE : undefined}
        >
          {placeDatasetLabel(dataset)}
        </span>
      )}
      {unverified && <span className={styles.unverifiedBadge}>Chưa xác minh vị trí</span>}
    </span>
  );
}
