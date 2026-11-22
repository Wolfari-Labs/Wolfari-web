import { Link, useNavigate } from 'react-router';
import { paths } from '../../../app/route-paths';
import type { TripLifecycle, TripListItem } from '../model/trip-list';
import { tripDateLabel } from '../model/trip-list-query';
import { ActionMenu } from '../../../shared/components/Ui';
import { Icon } from '../../../shared/components/Icon';
import mascot from '../../../shared/assets/v2/mascot-waving.png';
import styles from './TripCard.module.css';

const lifecycle: Record<TripLifecycle, string> = {
  UPCOMING: 'Sắp tới',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};

/** Day N of M for an ongoing trip in the trip timezone; null when it cannot be derived. */
function tripDayProgress(trip: TripListItem, now = new Date()) {
  if (trip.lifecycle !== 'ONGOING') return null;
  const dayNumber = (value: Date) => {
    const iso = new Intl.DateTimeFormat('en-CA', { timeZone: trip.timezone }).format(value);
    return Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
  };
  const start = dayNumber(new Date(trip.startAt));
  const end = dayNumber(new Date(Date.parse(trip.endAt) - 1));
  const total = end - start + 1;
  const current = dayNumber(now) - start + 1;
  if (!Number.isFinite(total) || total < 1 || current < 1 || current > total) return null;
  return { current, total };
}

/** Web v2 W/Trip card (Figma 932:6935) and the featured card of W02 (932:6959). */
export function TripCard({ trip, featured }: { trip: TripListItem; featured: boolean }) {
  const navigate = useNavigate();
  const cover = trip.presentation.cover;
  const owner = trip.currentMembership.role === 'OWNER';
  const members = trip.presentation.memberCount;
  const progress = featured ? tripDayProgress(trip) : null;
  return (
    <article className={`${styles.card} ${featured ? styles.featured : ''}`} data-trip-id={trip.id}>
      {featured && <img className={styles.mascot} src={mascot} alt="" aria-hidden="true" />}
      <Link
        to={paths.trip(trip.id)}
        className={styles.link}
        aria-label={`Mở chuyến đi ${trip.name}`}
      >
        <div className={styles.photo}>
          {cover ? (
            <img src={cover.src} alt={cover.alt} />
          ) : (
            <span className={styles.noCover} aria-label="Chưa có ảnh chuyến đi" />
          )}
          <span className={styles.status} data-lifecycle={trip.lifecycle}>
            {trip.lifecycle === 'ONGOING' && <i aria-hidden="true" />}
            {lifecycle[trip.lifecycle]}
          </span>
        </div>
        <div className={styles.body}>
          <h2>{trip.name}</h2>
          {featured ? (
            <p className={styles.featuredMeta}>
              {tripDateLabel(trip)}
              {members !== null && ` · ${members} thành viên`}
              {' · '}
              <span>{owner ? 'Chủ chuyến' : 'Thành viên'}</span>
            </p>
          ) : (
            <div className={styles.metadata}>
              <span>
                <Icon name="calendar" size={15} strokeWidth={2} />
                {tripDateLabel(trip)}
              </span>
              {members !== null && (
                <span>
                  <Icon name="members" size={15} strokeWidth={2} />
                  {members} người
                </span>
              )}
            </div>
          )}
          {progress && (
            <div className={styles.progress}>
              <span className={styles.track} aria-hidden="true">
                <span style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </span>
              <span>
                Ngày {progress.current}/{progress.total}
              </span>
            </div>
          )}
          <div className={styles.footer}>
            {featured ? (
              <span className={styles.open}>
                Mở chuyến đi
                <Icon name="chevronRight" size={18} strokeWidth={2.2} />
              </span>
            ) : (
              <>
                <span className={styles.role} data-owner={owner}>
                  {owner ? 'Chủ chuyến' : 'Thành viên'}
                </span>
                <span className={styles.go} aria-hidden="true">
                  <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                </span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className={styles.more}>
        <ActionMenu
          label={`Thao tác ${trip.name}`}
          items={[
            { label: 'Xem chuyến đi', action: () => navigate(paths.trip(trip.id)) },
            { label: 'Cài đặt chuyến đi', action: () => navigate(paths.settings(trip.id)) },
          ]}
        />
      </div>
    </article>
  );
}
