import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { TripDetailViewModel } from '../model/trip-detail';
import { tripDateLabel } from '../model/trip-list-query';
import { paths } from '../../../app/route-paths';
import { Icon } from '../../../shared/components/Icon';
import styles from './OverviewHero.module.css';

const lifecycleLabels = {
  UPCOMING: 'Sắp tới',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};

/**
 * Web v2 W04 overview hero (Figma 932:7293): the trip cover photo with the trip identity and the
 * same edit/share actions as `TripHero`. The page breadcrumb is laid over its top-left corner by
 * the overview styles. The Figma avatar stack and day temperature are omitted: the trip detail has
 * a member count only and the app has no weather data.
 */
export function OverviewHero({
  trip,
  dayLabel,
}: {
  trip: TripDetailViewModel;
  dayLabel?: string | undefined;
}) {
  const canEdit = trip.permissions.canUpdate && trip.lifecycle !== 'ARCHIVED';
  return (
    <section
      className={styles.hero}
      data-region="trip-hero"
      data-variant="photo"
      data-cover={trip.presentation.cover ? 'photo' : 'gradient'}
      aria-label="Thông tin chuyến đi"
      style={
        trip.presentation.cover
          ? ({ '--trip-cover': `url("${trip.presentation.cover.src}")` } as CSSProperties)
          : undefined
      }
    >
      <div className={styles.copy}>
        <h2>{trip.name}</h2>
        <p className={styles.meta}>
          {dayLabel && (
            <span className={styles.dayPill}>
              <Icon name="calendar" size={16} />
              {dayLabel}
            </span>
          )}
          <span className={styles.status} data-lifecycle={trip.lifecycle}>
            <i aria-hidden="true" />
            {lifecycleLabels[trip.lifecycle]}
          </span>
          <span className={styles.dates}>{tripDateLabel(trip)}</span>
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          <Link className={styles.members} to={paths.members(trip.id)}>
            {trip.presentation.memberCount === null
              ? 'Thành viên'
              : `${trip.presentation.memberCount} thành viên`}
          </Link>
        </p>
      </div>
      <div className={styles.actions}>
        {canEdit ? (
          <Link className={styles.edit} to={paths.settings(trip.id)}>
            <Icon name="edit" size={18} />
            Chỉnh sửa
          </Link>
        ) : (
          <button
            type="button"
            className={styles.edit}
            disabled
            title="Bạn không có quyền chỉnh sửa chuyến đi"
          >
            <Icon name="edit" size={18} />
            Chỉnh sửa
          </button>
        )}
      </div>
    </section>
  );
}
