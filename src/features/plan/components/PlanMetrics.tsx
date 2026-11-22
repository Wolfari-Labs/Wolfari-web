import type { PlanViewModel, ActivityViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import { Icon } from '../../../shared/components/Icon';
import styles from './PlanMetrics.module.css';

function activityDay(activity: ActivityViewModel, timezone: string) {
  return activity.startsAt
    ? localDate(activity.startsAt, timezone)
    : (activity.scheduledDate ?? 'POOL');
}

function durationMinutes(activity: ActivityViewModel): number | null {
  if (!activity.startsAt || !activity.endsAt) return null;
  const start = Date.parse(activity.startsAt);
  const end = Date.parse(activity.endsAt);
  const minutes = (end - start) / 60_000;
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function durationLabel(minutes: number) {
  if (minutes <= 0) return '—';
  const rounded = Math.round(minutes);
  if (rounded < 1) return '<1 phút';
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return `${rest} phút`;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

function scopeLabel(trip: TripDetailViewModel, day: string) {
  if (day === 'ALL') return 'Cả chuyến';
  if (day === 'POOL') return 'Chưa chọn ngày';
  const inTrip = planDays(trip.startAt, trip.endAt, trip.timezone).includes(day);
  return inTrip ? `${Number(day.slice(8))}/${Number(day.slice(5, 7))}` : day;
}

export function PlanMetrics({
  trip,
  plan,
  day,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  day: string;
}) {
  const scope = scopeLabel(trip, day);
  const activities =
    day === 'ALL'
      ? plan.activities
      : plan.activities.filter((activity) => activityDay(activity, trip.timezone) === day);
  const linkedLocationIds = new Set(
    activities.map((activity) => activity.selectedLocationId).filter((id): id is string => !!id),
  );
  // The trip-wide count includes selected places that have not become activities yet.
  const locations =
    day === 'ALL'
      ? plan.selectedLocations.length
      : plan.selectedLocations.filter((location) => linkedLocationIds.has(location.id)).length;
  const durations = activities.map(durationMinutes);
  const knownMinutes = durations.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const withoutTime = durations.filter((value) => value === null).length;

  // Web v2 W06 "day stats" (Figma 933:7468): the scope is carried by the region name and the
  // selected day tab, so each metric shows the short Figma label. The Figma "di chuyển" metric is
  // omitted: no travel-time source exists, and a permanent "—" is not information.
  return (
    <section className={styles.strip} aria-label={`Tóm tắt lịch trình · ${scope}`}>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name="calendar" size={18} />
          </span>
          <div className={styles.copy}>
            <strong>{activities.length}</strong>
            <span>hoạt động</span>
          </div>
        </div>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name="map" size={18} />
          </span>
          <div className={styles.copy}>
            <strong>{locations}</strong>
            <span>địa điểm</span>
          </div>
        </div>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name="clock" size={18} />
          </span>
          <div className={styles.copy}>
            <strong>{durationLabel(knownMinutes)}</strong>
            <span>trải nghiệm</span>
            {withoutTime > 0 && <small>{withoutTime} hoạt động chưa tính giờ</small>}
          </div>
        </div>
      </div>
    </section>
  );
}
