import styles from '../TripDashboard.module.css';

/** Keep the empty fare summary consistent with the weather tile. */
export function OverviewEmptyFare() {
  return (
    <>
      <p className={styles.summaryValue}>—</p>
      <p className={styles.summaryDetail}>Chưa có dữ liệu</p>
      <p className={styles.summaryLink}>Tạo theo dõi giá →</p>
    </>
  );
}
