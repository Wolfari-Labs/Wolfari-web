import styles from '../TripDashboard.module.css';

/** No watch yet: the tile (a link to Price Watch) invites the real next step instead of a dash. */
export function OverviewEmptyFare() {
  return (
    <>
      <p className={styles.summaryValue}>Chưa theo dõi</p>
      <p className={styles.summaryLink}>Tạo theo dõi giá →</p>
    </>
  );
}
