import styles from '../TripDashboard.module.css';

export function OverviewEmptyFare() {
  return (
    <>
      <p className={styles.summaryValue} aria-hidden="true">
        —
      </p>
      <p className={styles.summaryDetail}>Chưa có dữ liệu</p>
    </>
  );
}
