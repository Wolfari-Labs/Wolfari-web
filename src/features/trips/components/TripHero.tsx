import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { TripDetailViewModel } from '../model/trip-detail';
import { tripDateLabel } from '../model/trip-list-query';
import { paths } from '../../../app/route-paths';
import { Button } from '../../../shared/components/Button';
import styles from '../TripOverviewPage.module.css';
const labels = {
  UPCOMING: 'Sắp tới',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};
export function TripHero({
  trip,
  compact = false,
}: {
  trip: TripDetailViewModel;
  compact?: boolean;
}) {
  return (
    <section
      className={styles.hero}
      data-compact={compact}
      aria-label="Thông tin chuyến đi"
      style={
        trip.presentation.cover
          ? ({
              '--trip-cover': `url("${trip.presentation.cover.src}")`,
              '--trip-mobile-cover': `url("${trip.presentation.cover.mobileSrc ?? trip.presentation.cover.src}")`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className={styles.paper}>
        <h2>{trip.name}</h2>
        <div className={styles.meta}>
          <span>{tripDateLabel(trip)}</span>
          <Link to={paths.members(trip.id)}>
            {trip.presentation.memberCount === null
              ? 'Thành viên'
              : `${trip.presentation.memberCount} thành viên`}
          </Link>
          <span>{labels[trip.lifecycle]}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="outline" disabled title="Chỉnh sửa chưa được kết nối">
          Chỉnh sửa
        </Button>
        <Button disabled title="Chia sẻ chưa được kết nối">
          Chia sẻ
        </Button>
      </div>
    </section>
  );
}
