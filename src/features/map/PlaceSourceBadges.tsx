import { useLayoutEffect, useRef, useState } from 'react';
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

/** Below this width a shortened category says nothing useful, so it is hidden instead. */
const CATEGORY_MIN_PX = 40;
const GAP_PX = 3;

/**
 * One line in the selected-place card (FR-TI01): "<loại> · <tỉnh> · Nguồn: <badge> (dd/MM/yyyy)".
 * Province and source/date never truncate; when space runs out the category shortens with "…"
 * first and is hidden entirely below CATEGORY_MIN_PX; if province + source still do not fit,
 * the "Nguồn:" label becomes screen-reader-only. The full text, review notes and record
 * attribution live in the badge tooltip (hover and keyboard focus), so the card grows by one
 * line at most.
 */
export function PlaceProvenanceLine({ provenance }: { provenance: PlaceProvenance }) {
  const facts = [provenance.categoryLabel, provenance.provinceName].filter(Boolean).join(' · ');
  const date = provenanceDate(provenance);
  const tooltip = [facts, provenanceTooltip(provenance)].filter(Boolean).join('. ');
  const line = useRef<HTMLSpanElement>(null);
  const category = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const labelWidth = useRef(0);
  const compactRef = useRef(false);
  const [categoryFits, setCategoryFits] = useState(true);
  /** Last resort: "Nguồn:" becomes screen-reader-only; the badge still names the source. */
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const node = line.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      if (!width) return; // not laid out (hidden card, jsdom)
      if (!compactRef.current && label.current) labelWidth.current = label.current.offsetWidth;
      const fixed = [...node.children]
        .filter((child) => child !== category.current)
        .reduce((sum, child) => sum + (child as HTMLElement).offsetWidth + GAP_PX, 0);
      // Width of province + source with the "Nguồn:" label shown.
      const full = fixed + (compactRef.current ? labelWidth.current : 0);
      const nextCompact = width < full;
      compactRef.current = nextCompact;
      setCompact(nextCompact);
      setCategoryFits(!nextCompact && width - full >= CATEGORY_MIN_PX);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [provenance.categoryLabel, provenance.provinceName, date]);
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
    <span
      ref={line}
      className={`${styles.placeMeta} ${styles.cardProvenance}`}
      data-region="place-provenance"
    >
      {provenance.categoryLabel && (
        <span
          ref={category}
          className={styles.cardCategory}
          title={provenance.categoryLabel}
          hidden={!categoryFits}
          data-part="category"
        >
          {`${provenance.categoryLabel} · `}
        </span>
      )}
      {provenance.provinceName && (
        <span className={styles.cardFixed} data-part="province">
          {`${provenance.provinceName} · `}
        </span>
      )}
      <span className={`${styles.cardFixed} ${styles.cardSource}`} data-part="source">
        <span ref={label} className={compact ? styles.visuallyHidden : undefined}>
          Nguồn:
        </span>{' '}
        {tooltip ? <Tip label={tooltip}>{badge}</Tip> : badge}
        {date && ` (${date})`}
      </span>
    </span>
  );
}
