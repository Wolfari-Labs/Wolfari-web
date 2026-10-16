import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { TripDetailViewModel } from '../model/trip-detail';
import { tripDateLabel } from '../model/trip-list-query';
import { paths } from '../../../app/route-paths';
import { Button } from '../../../shared/components/Button';
import calendar from '../../../shared/assets/figma/94ab0.svg';
import members from '../../../shared/assets/figma/fdd6a.svg';
import share from '../../../shared/assets/figma/ac8db.svg';
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
  variant = 'photo',
}: {
  trip: TripDetailViewModel;
  compact?: boolean;
  variant?: 'photo' | 'schedule' | 'landscape';
}) {
  return (
    <section
      className={styles.hero}
      data-compact={compact}
      data-variant={variant}
      aria-label="Thông tin chuyến đi"
      style={
        trip.presentation.cover
          ? ({ '--trip-cover': `url("${trip.presentation.cover.src}")` } as CSSProperties)
          : undefined
      }
    >
      <div className={styles.paper}>
        <h2>{trip.name}</h2>
        <div className={styles.meta}>
          <span>
            <img src={calendar} alt="" />
            {tripDateLabel(trip)}
          </span>
          <Link to={paths.members(trip.id)}>
            <img src={members} alt="" />
            {trip.presentation.memberCount === null
              ? 'Thành viên'
              : `${trip.presentation.memberCount} thành viên`}
          </Link>
          <span className={styles.status}>
            <i aria-hidden="true" />
            {labels[trip.lifecycle]}
          </span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="outline" disabled title="Chỉnh sửa chưa khả dụng">
          Chỉnh sửa
        </Button>
        <Button disabled title="Chia sẻ chưa khả dụng" icon={<img src={share} alt="" />}>
          Chia sẻ
        </Button>
      </div>
    </section>
  );
}
