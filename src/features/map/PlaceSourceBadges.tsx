import { Tip } from '../../shared/components/Ui';
import {
  OVERTURE_NOTE,
  placeDatasetLabel,
  provenanceDate,
  provenanceTooltip,
  type PlaceDataset,
  type PlaceProvenance,
} from './places';
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
}: {
  dataset: PlaceDataset | 'manual';
  coordVerified: boolean | null;
}) {
  return (
    <span className={styles.placeMeta}>
      <span
        className={styles.sourceBadge}
        data-source={sourceAttribute[dataset]}
        title={dataset === 'overture' ? OVERTURE_NOTE : undefined}
      >
        {placeDatasetLabel(dataset)}
      </span>
      {dataset === 'golden' && coordVerified === false && (
        <span className={styles.unverifiedBadge}>Chưa xác minh vị trí</span>
      )}
    </span>
  );
}

/**
 * One line in the selected-place card (FR-TI01): "<loại> · <tỉnh> · Nguồn: <badge> (dd/MM/yyyy)".
 * The record attribution and review notes live in the badge tooltip (hover and keyboard focus),
 * so the card grows by one line at most; the category/province part truncates first.
 */
export function PlaceProvenanceLine({ provenance }: { provenance: PlaceProvenance }) {
  const facts = [provenance.categoryLabel, provenance.provinceName].filter(Boolean).join(' · ');
  const date = provenanceDate(provenance);
  const tooltip = provenanceTooltip(provenance);
  const unverified = provenance.dataset === 'golden' && provenance.coordVerified === false;
  const badge = (
    <span
      className={`${styles.sourceBadge} ${unverified ? styles.unverifiedBadge : ''}`}
      data-source={sourceAttribute[provenance.dataset]}
      tabIndex={tooltip ? 0 : undefined}
    >
      {placeDatasetLabel(provenance.dataset)}
    </span>
  );
  return (
    <span className={`${styles.placeMeta} ${styles.cardProvenance}`} data-region="place-provenance">
      {facts && (
        <span className={styles.cardFacts} title={facts}>
          {facts} ·
        </span>
      )}
      <span className={styles.cardSource}>
        Nguồn: {tooltip ? <Tip label={tooltip}>{badge}</Tip> : badge}
        {date && ` (${date})`}
      </span>
    </span>
  );
}
