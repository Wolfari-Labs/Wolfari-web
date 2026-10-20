import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/route-paths';
import destinationPhoto from '../../shared/assets/figma/16cac.png';
import heartIcon from '../../shared/assets/figma/a50ed.svg';
import clockIcon from '../../shared/assets/figma/1666f.svg';
import type { MapLocationPresentation } from './trip-map';
import {
  activityDurationLabel,
  activityScheduleLabel,
  validCoordinates,
} from './trip-map';
import styles from './TripMapPage.module.css';

function detailPhoto(item: MapLocationPresentation) {
  if (item.location.name === 'Bãi biển Mỹ Khê') return destinationPhoto;
  return item.activities[0]?.presentation.cover?.src ?? destinationPhoto;
}

export function PlaceDetail({
  item,
  tripId,
  timezone,
  open,
  onClose,
}: {
  item: MapLocationPresentation | null;
  tripId: string;
  timezone: string;
  open: boolean;
  onClose: () => void;
}) {
  const [favorite, setFavorite] = useState(false);
  if (!item) return null;
  const activity = item.activities[0];
  const duration = activityDurationLabel(activity);

  return (
    <aside className={styles.placeDetail} aria-label="Chi tiết địa điểm" hidden={!open}>
      <div className={styles.detailHeader}>
        <button type="button" onClick={onClose} aria-label="Quay lại bản đồ">‹</button>
        <strong>Chi tiết địa điểm</strong>
        <span aria-hidden="true" />
      </div>
      <img
        className={styles.detailCover}
        src={detailPhoto(item)}
        width="354"
        height="228"
        alt=""
      />
      <div className={styles.detailTitle}>
        <h2>{item.location.name}</h2>
        <button
          type="button"
          className={styles.favoriteButton}
          aria-label={favorite ? 'Bỏ yêu thích địa điểm' : 'Yêu thích địa điểm'}
          aria-pressed={favorite}
          onClick={() => setFavorite((value) => !value)}
        >
          <img src={heartIcon} width="22" height="22" alt="" />
        </button>
      </div>
      <p className={styles.scheduleBadge}>
        {item.scheduled ? 'Đã thêm vào lịch trình' : 'Đã lưu · Chưa xếp lịch'}
      </p>
      <p className={styles.detailAddress}>{item.location.address ?? 'Chưa có địa chỉ'}</p>
      <div className={styles.detailFacts}>
        <div>
          <img src={clockIcon} width="22" height="22" alt="" />
          <strong>{duration ?? 'Chưa xác định'}</strong>
          <span>Thời gian gợi ý</span>
        </div>
        <div>
          <span className={styles.sourceIcon} aria-hidden="true">⌖</span>
          <strong>{item.scheduled ? 'Trong lịch' : 'Đã lưu'}</strong>
          <span>{item.location.source === 'PROVIDER' ? 'Nguồn địa điểm' : 'Thủ công'}</span>
        </div>
      </div>
      <section className={styles.detailDescription}>
        <h3>{activity?.title ?? item.location.name}</h3>
        <p>
          {activity?.description ??
            'Thông tin mô tả chi tiết chưa có trong dữ liệu địa điểm đã lưu.'}
        </p>
      </section>
      <section className={styles.detailSchedule}>
        <h3>Trong lịch của bạn</h3>
        <p>{activityScheduleLabel(activity, timezone)}</p>
        {validCoordinates(item.location) ? null : <small>Chưa có tọa độ hợp lệ</small>}
        <Link to={paths.plan(tripId)}>Xem trong lịch trình</Link>
      </section>
    </aside>
  );
}
