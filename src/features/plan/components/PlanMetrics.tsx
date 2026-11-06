import type { PlanViewModel, ActivityViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import activityIcon from '../../../shared/assets/figma/b75a6.svg';
import locationIcon from '../../../shared/assets/figma/12507.svg';
import experienceIcon from '../../../shared/assets/figma/13a40.svg';
import travelIcon from '../../../shared/assets/figma/a6d01.svg';
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

  return (
    <section className={styles.strip} aria-label={`Tóm tắt lịch trình · ${scope}`}>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <img src={activityIcon} width="24" height="24" alt="" />
          </span>
          <div className={styles.copy}>
            <strong>{activities.length}</strong>
            <span>Hoạt động · {scope}</span>
          </div>
        </div>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <img src={locationIcon} width="24" height="24" alt="" />
          </span>
          <div className={styles.copy}>
            <strong>{locations}</strong>
            <span>Địa điểm · {scope}</span>
          </div>
        </div>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <img src={experienceIcon} width="24" height="24" alt="" />
          </span>
          <div className={styles.copy}>
            <strong>{durationLabel(knownMinutes)}</strong>
            <span>Trải nghiệm · {scope}</span>
            {withoutTime > 0 && <small>{withoutTime} hoạt động chưa tính giờ</small>}
          </div>
        </div>
        <div className={styles.metric}>
          <span className={styles.icon} aria-hidden="true">
            <img src={travelIcon} width="24" height="24" alt="" />
          </span>
          <div className={styles.copy}>
            <strong>—</strong>
            <span>Di chuyển · {scope}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
