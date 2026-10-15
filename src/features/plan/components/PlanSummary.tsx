import { Link } from 'react-router';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { PlanViewModel } from '../model/plan';
import type { ReadResult } from '../../../shared/types/result';
import { ContentState } from '../../../shared/components/ContentState';
import { activityTime, activitiesForDay, localDate } from '../model/plan-presentation';
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
  const valid =
    plan?.permissions.canRead &&
    plan.tripId === trip.id &&
    plan.planVersion === trip.planVersion &&
    plan.exportRevision === trip.exportRevision;
  const items =
    plan && valid
      ? activitiesForDay(plan.activities, localDate(trip.startAt, trip.timezone), trip.timezone)
      : [];
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
          <p className={styles.count}>{items.length} hoạt động ngày đầu</p>
          {!compact && (
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
          )}
        </>
      )}
      <Link to={paths.plan(trip.id)}>Xem {compact ? 'lịch trình' : 'chi tiết lịch trình'} →</Link>
    </div>
  );
}
