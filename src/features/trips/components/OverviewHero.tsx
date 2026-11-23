import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { TripDetailViewModel } from '../model/trip-detail';
import { tripDateLabel } from '../model/trip-list-query';
import { paths } from '../../../app/route-paths';
import { Icon } from '../../../shared/components/Icon';
import editAsset from '../../../shared/assets/figma/trips-plan/edit.svg';
import shareAsset from '../../../shared/assets/figma/trips-plan/share.svg';
import styles from './OverviewHero.module.css';
import { useTripCoverImage } from '../hooks/use-trip-cover-image';

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
  const cover = useTripCoverImage(trip.id, trip.presentation.coverAvailable);
  return (
    <section
      className={styles.hero}
      data-region="trip-hero"
      data-variant="photo"
      data-cover={cover.src ? 'photo' : 'gradient'}
      aria-label="Thông tin chuyến đi"
      style={
        cover.src
          ? ({ '--trip-cover': `url("${cover.src}")` } as CSSProperties)
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
        </p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.members} to={paths.members(trip.id)} title="Ảnh thành viên chưa khả dụng">
          <Icon name="members" size={18} />
          {trip.presentation.memberCount === null ? 'Thành viên' : `${trip.presentation.memberCount} thành viên`}
        </Link>
        {canEdit ? (
          <Link className={styles.edit} to={paths.settings(trip.id)}>
            <img src={editAsset} alt="" />
            Chỉnh sửa
          </Link>
        ) : (
          <button
            type="button"
            className={styles.edit}
            disabled
            title="Bạn không có quyền chỉnh sửa chuyến đi"
          >
            <img src={editAsset} alt="" />
            Chỉnh sửa
          </button>
        )}
        <Link className={styles.share} to={`/trips/${encodeURIComponent(trip.id)}/share`}>
          <img src={shareAsset} alt="" />
          Chia sẻ
        </Link>
      </div>
    </section>
  );
}
