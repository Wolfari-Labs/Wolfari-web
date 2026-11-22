import styles from '../TripDashboard.module.css';
import type { ReactNode } from 'react';

/** A measured value shows its track; unknown data shows only the copy (no empty bar). */
export function OverviewProgress({
  percent,
  label,
  children,
}: {
  percent: number | null;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.progressSummary}>
      <div className={styles.progressCopy}>{children}</div>
      {percent !== null && (
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.max(0, percent))}
          aria-valuetext={label}
        >
          <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      )}
    </div>
  );
}
