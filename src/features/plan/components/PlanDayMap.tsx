import { useMemo, useState, type Ref } from 'react';
import type { PlanViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import { validCoordinates } from '../../map/trip-map';
import { GeoapifyMap } from '../../map/GeoapifyMap';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import styles from './PlanDayMap.module.css';
export function dayMapLocations(
  plan: Pick<PlanViewModel, 'activities' | 'selectedLocations'>,
  day: string,
  timezone: string,
) {
  const ids = [
    ...new Set(
      [...plan.activities]
        .sort((a, b) => a.position - b.position)
        .filter((a) => {
          const scheduled = a.startsAt ? localDate(a.startsAt, timezone) : a.scheduledDate;
          return scheduled && (day === 'ALL' || scheduled === day);
        })
        .map((a) => a.selectedLocationId)
        .filter((id): id is string => id !== null),
    ),
  ];
  return ids.flatMap((id) => {
    const location = plan.selectedLocations.find((p) => p.id === id);
    return location ? [location] : [];
  });
}
export function PlanDayMap({
  trip,
  plan,
  day,
  onClose,
  closeRef,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  day: string;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const locations = useMemo(
    () => dayMapLocations(plan, day, trip.timezone),
    [plan, day, trip.timezone],
  );
  const points = useMemo(
    () =>
      locations.flatMap((p, index) => {
        const c = validCoordinates(p);
        return c ? [{ ...c, id: p.id, name: p.name, number: index + 1, scheduled: true }] : [];
      }),
    [locations],
  );
  const number = planDays(trip.startAt, trip.endAt, trip.timezone).indexOf(day) + 1;
  const title =
    day === 'ALL'
      ? 'Bản đồ lịch trình cả chuyến'
      : day === 'POOL'
        ? 'Bản đồ nhóm chưa chọn ngày'
        : `Bản đồ lịch trình ngày ${number || day}`;
  return (
    <section className={styles.panel} aria-label={title} data-plan-day-map={day}>
      <header className={styles.header}>
        <div>
          <h3>{title}</h3>
          <p>{locations.length} địa điểm gắn với hoạt động đã xếp lịch</p>
        </div>
        <Button
          ref={closeRef}
          variant="outline"
          size="icon"
          aria-label="Ẩn bản đồ"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </Button>
      </header>
      <div className={styles.map} style={{ height: 240 }}>
        <GeoapifyMap embedded points={points} selectedId={selected} onSelect={setSelected} />
      </div>
      <div className={styles.listRegion}>
        <h4>Địa điểm trong lịch trình</h4>
        {locations.length ? (
          <ol className={styles.list}>
            {locations.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                <span>{p.address ?? 'Chưa có địa chỉ'}</span>
                {!validCoordinates(p) && <small>Chưa có tọa độ hợp lệ</small>}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.empty}>Chưa có địa điểm nào trong ngày đang xem.</p>
        )}
      </div>
    </section>
  );
}
