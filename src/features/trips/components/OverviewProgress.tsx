import styles from '../TripDashboard.module.css';
import type { ReactNode } from 'react';

/** Unknown data keeps the visual track without claiming a measured zero or loading state. */
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
      <div
        className={styles.progressTrack}
        role={percent === null ? 'img' : 'progressbar'}
        aria-label={label}
        aria-valuemin={percent === null ? undefined : 0}
        aria-valuemax={percent === null ? undefined : 100}
        aria-valuenow={percent === null ? undefined : Math.min(100, Math.max(0, percent))}
        aria-valuetext={percent === null ? undefined : label}
      >
        <span style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }} />
      </div>
    </div>
  );
}
