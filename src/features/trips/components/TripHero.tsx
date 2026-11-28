import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { TripDetailViewModel } from '../model/trip-detail';
import { tripDateLabel } from '../model/trip-list-query';
import { paths } from '../../../app/route-paths';
import { Icon } from '../../../shared/components/Icon';
import editAsset from '../../../shared/assets/figma/trips-plan/edit.svg';
import shareAsset from '../../../shared/assets/figma/trips-plan/share.svg';
import styles from './TripHero.module.css';
import { useTripCoverImage } from '../hooks/use-trip-cover-image';

const labels = {
  UPCOMING: 'Sắp tới',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};

/**
 * Web v2 `W/Trip header` (Figma 937:7647): the trip card at the top of every trip page.
 * Unavailable presence is never replaced with the sample people's identities from Figma.
 */
export function TripHero({
  trip,
  compact = false,
  variant = 'landscape',
  showCover = true,
}: {
  trip: TripDetailViewModel;
  compact?: boolean;
  variant?: 'photo' | 'schedule' | 'landscape';
  showCover?: boolean;
}) {
  const canEdit = trip.permissions.canUpdate && trip.lifecycle !== 'ARCHIVED';
  const cover = useTripCoverImage(trip.id, showCover && trip.presentation.coverAvailable);
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
          showCover && cover.src
            ? ({ '--trip-cover': `url("${cover.src}")` } as CSSProperties)
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
          <span className={styles.presence} title="Chưa có dữ liệu hiện diện trực tuyến">
            {' '}
            · Trạng thái online chưa khả dụng
          </span>
        </p>
      </div>
      <div className={styles.actions}>
        <Link
          className={styles.memberStack}
          to={paths.members(trip.id)}
          aria-label="Xem thành viên chuyến đi"
          title="Ảnh thành viên chưa khả dụng"
        >
          <Icon name="members" size={18} />
          <span>{trip.presentation.memberCount ?? '—'}</span>
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
