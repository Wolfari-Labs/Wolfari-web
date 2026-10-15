import { Link } from 'react-router';
import { paths } from '../../../app/route-paths';
import type { TripLifecycle, TripListItem } from '../model/trip-list';
import { tripDateLabel } from '../model/trip-list-query';
import calendar from '../../../shared/assets/figma/97b4d.svg';
import people from '../../../shared/assets/figma/38151.svg';
import crown from '../../../shared/assets/figma/7f6be.svg';
import member from '../../../shared/assets/figma/fb720.svg';
import ongoing from '../../../shared/assets/figma/638e7.svg';
import upcoming from '../../../shared/assets/figma/5c5e5.svg';
import completed from '../../../shared/assets/figma/58ea2.svg';
import more from '../../../shared/assets/figma/627d1.svg';
import arrow from '../../../shared/assets/figma/04603.svg';
import styles from './TripCard.module.css';

const lifecycle: Record<TripLifecycle, { label: string; icon: string | null }> = {
  UPCOMING: { label: 'Sắp tới', icon: upcoming },
  ONGOING: { label: 'Đang diễn ra', icon: ongoing },
  COMPLETED: { label: 'Đã kết thúc', icon: completed },
  ARCHIVED: { label: 'Đã lưu trữ', icon: null },
};

export function TripCard({ trip, featured }: { trip: TripListItem; featured: boolean }) {
  const status = lifecycle[trip.lifecycle];
  const cover = trip.presentation.cover;
  const owner = trip.currentMembership.role === 'OWNER';
  return (
    <article className={`${styles.card} ${featured ? styles.featured : ''}`} data-trip-id={trip.id}>
      <Link
        to={paths.trip(trip.id)}
        className={styles.link}
        aria-label={`Mở chuyến đi ${trip.name}`}
      >
        <div className={styles.photo}>
          {cover ? (
            <picture>
              <source media="(max-width: 768px)" srcSet={cover.mobileSrc ?? cover.src} />
              <img src={cover.src} alt={cover.alt} />
            </picture>
          ) : (
            <span className={styles.noCover} aria-label="Chưa có ảnh chuyến đi" />
          )}
        </div>
        <span className={`${styles.status} ${styles[trip.lifecycle]}`}>
          {status.icon && <img src={status.icon} alt="" />}
          {status.label}
        </span>
        <div className={styles.body}>
          <h2>{trip.name}</h2>
          <div className={styles.metadata}>
            <span className={styles.date}>
              <img src={calendar} alt="" />
              {tripDateLabel(trip)}
            </span>
            {trip.presentation.memberCount !== null && (
              <span>
                <img src={people} alt="" />
                {trip.presentation.memberCount} thành viên
              </span>
            )}
            <span className={styles.role}>
              <img src={owner ? crown : member} alt="" />
              {owner ? 'Chủ chuyến' : 'Thành viên'}
            </span>
          </div>
          <span className={styles.open}>Mở chuyến đi →</span>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          <img src={arrow} alt="" />
        </span>
      </Link>
      <button
        className={styles.more}
        disabled
        aria-label={`Thao tác ${trip.name} · Chưa triển khai`}
        title="Sửa, lưu trữ và xóa chuyến đi chưa khả dụng"
      >
        <img src={more} alt="" />
      </button>
    </article>
  );
}
