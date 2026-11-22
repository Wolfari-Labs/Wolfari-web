import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { TripDetailViewModel } from '../model/trip-detail';
import { tripDateLabel } from '../model/trip-list-query';
import { paths } from '../../../app/route-paths';
import { Icon } from '../../../shared/components/Icon';
import styles from './TripHero.module.css';

const labels = {
  UPCOMING: 'Sắp tới',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};

/**
 * Web v2 `W/Trip header` (Figma 937:7647): the trip card at the top of every trip page. The page
 * breadcrumb (with the page `h1`) is laid over the card's text column by WorkspacePage styles.
 * The Figma avatar stack is omitted: the trip detail carries only a member count, not members.
 */
export function TripHero({
  trip,
  compact = false,
  variant = 'landscape',
}: {
  trip: TripDetailViewModel;
  compact?: boolean;
  variant?: 'photo' | 'schedule' | 'landscape';
}) {
  const canEdit = trip.permissions.canUpdate && trip.lifecycle !== 'ARCHIVED';
  return (
    <section
      className={styles.hero}
      data-region="trip-hero"
      data-compact={compact}
      data-variant={variant}
      aria-label="Thông tin chuyến đi"
    >
      <span
        className={styles.thumb}
        aria-hidden="true"
        style={
          trip.presentation.cover
            ? ({ '--trip-cover': `url("${trip.presentation.cover.src}")` } as CSSProperties)
            : undefined
        }
      />
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <h2>{trip.name}</h2>
          <span className={styles.status} data-lifecycle={trip.lifecycle}>
            <i aria-hidden="true" />
            {labels[trip.lifecycle]}
          </span>
        </div>
        <p className={styles.meta}>
          <span>{tripDateLabel(trip)}</span>
          <span aria-hidden="true"> · </span>
          <Link to={paths.members(trip.id)}>
            {trip.presentation.memberCount === null
              ? 'Thành viên'
              : `${trip.presentation.memberCount} thành viên`}
          </Link>
        </p>
      </div>
      <div className={styles.actions}>
        {canEdit ? (
          <Link className={styles.edit} to={paths.settings(trip.id)}>
            <Icon name="edit" size={17} />
            Chỉnh sửa
          </Link>
        ) : (
          <button
            type="button"
            className={styles.edit}
            disabled
            title="Bạn không có quyền chỉnh sửa chuyến đi"
          >
            <Icon name="edit" size={17} />
            Chỉnh sửa
          </button>
        )}
        {/* Sharing has no Web route yet (W13/W21), so no permanently disabled CTA is shown. */}
      </div>
    </section>
  );
}
