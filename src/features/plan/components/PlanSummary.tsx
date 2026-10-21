import { Link } from 'react-router';
import { useState } from 'react';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { PlanViewModel } from '../model/plan';
import type { ReadResult } from '../../../shared/types/result';
import { ContentState } from '../../../shared/components/ContentState';
import { activityTime, activitiesForDay, localDate, planDays } from '../model/plan-presentation';
import { paths } from '../../../app/route-paths';
import styles from './PlanSummary.module.css';
export function PlanSummary({
  trip,
  result,
  compact = false,
  onRetry,
}: {
  trip: TripDetailViewModel;
  result: ReadResult<PlanViewModel> | { status: 'loading' };
  compact?: boolean;
  onRetry: () => void;
}) {
  const plan = result.status === 'ready' ? result.data : null;
  const days = planDays(trip.startAt, trip.endAt, trip.timezone);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const day =
    selectedDay && days.includes(selectedDay)
      ? selectedDay
      : localDate(trip.startAt, trip.timezone);
  const valid =
    plan?.permissions.canRead &&
    plan.tripId === trip.id &&
    plan.planVersion === trip.planVersion &&
    plan.exportRevision === trip.exportRevision;
  const items =
    plan && valid ? activitiesForDay(plan.activities, compact ? days[0]! : day, trip.timezone) : [];
  return (
    <div className={styles.summary}>
      {result.status === 'loading' ? (
        <ContentState state="loading" headingLevel={2} />
      ) : result.status === 'error' ? (
        <ContentState
          state={
            result.error.code === 'SERVICE_UNAVAILABLE' && !result.error.retryable
              ? 'unavailable'
              : 'error'
          }
          error={result.error}
          onRetry={onRetry}
          headingLevel={2}
        />
      ) : !plan ? (
        <ContentState state="empty" headingLevel={2} />
      ) : !valid ? (
        <ContentState
          state="error"
          error={{
            code: plan.permissions.canRead ? 'VERSION_CONFLICT' : 'PERMISSION_DENIED',
            correlationId: null,
            retryable: false,
          }}
          onRetry={onRetry}
          headingLevel={2}
        />
      ) : (
        <>
          {compact ? (
            <>
              <p className={styles.count}>{items.length} hoạt động</p>
              <p>
                Đã đi {items.filter((item) => item.status === 'COMPLETED').length}/{items.length}{' '}
                hoạt động
              </p>
            </>
          ) : (
            <>
              <div className={styles.days} role="group" aria-label="Ngày xem trước lịch trình">
                {days.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === day}
                    onClick={() => setSelectedDay(value)}
                  >
                    Ngày {index + 1}
                    <small>
                      {value.slice(8, 10)}/{value.slice(5, 7)}
                    </small>
                  </button>
                ))}
              </div>
              {items.length === 0 && <p>Chưa có hoạt động trong ngày này.</p>}
              <ol>
                {items.map((a) => (
                  <li key={a.id}>
                    <time dateTime={a.startsAt ?? undefined}>
                      {activityTime(a.startsAt, trip.timezone)}
                    </time>
                    <span>{a.title}</span>
                    {a.presentation.cover && (
                      <img src={a.presentation.cover.src} alt={a.presentation.cover.alt} />
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
      {!compact && <Link to={paths.plan(trip.id)}>Xem chi tiết lịch trình →</Link>}
    </div>
  );
}
