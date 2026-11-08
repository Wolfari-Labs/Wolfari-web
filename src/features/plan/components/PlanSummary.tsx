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
  overview = false,
  selectedDay: controlledDay,
  onDayChange,
  onRetry,
}: {
  trip: TripDetailViewModel;
  result: ReadResult<PlanViewModel> | { status: 'loading' };
  compact?: boolean;
  overview?: boolean;
  selectedDay?: string;
  onDayChange?: (day: string) => void;
  onRetry: () => void;
}) {
  const plan = result.status === 'ready' ? result.data : null;
  const days = planDays(trip.startAt, trip.endAt, trip.timezone);
  const [internalDay, setSelectedDay] = useState<string | null>(null);
  const selectedDay = controlledDay ?? internalDay;
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
    plan && valid
      ? activitiesForDay(plan.activities, compact && !overview ? days[0]! : day, trip.timezone)
      : [];
  return (
    <div
      className={styles.summary}
      data-overview={overview || undefined}
      data-compact={compact || undefined}
    >
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
                    onClick={() => {
                      setSelectedDay(value);
                      onDayChange?.(value);
                    }}
                  >
                    Ngày {index + 1}
                    <small>
                      {value.slice(8, 10)}/{value.slice(5, 7)}
                    </small>
                  </button>
                ))}
              </div>
              {items.length === 0 && <p>Chưa có hoạt động trong ngày này.</p>}
              <ol tabIndex={overview ? 0 : undefined} aria-label="Các hoạt động trong ngày">
                {items.map((a) => (
                  <li key={a.id}>
                    {overview && (
                      <Link
                        className={styles.activityLink}
                        to={paths.plan(trip.id)}
                        aria-label={`Mở lịch trình: ${a.title}`}
                      />
                    )}
                    <time dateTime={a.startsAt ?? undefined}>
                      {activityTime(a.startsAt, trip.timezone)}
                    </time>
                    {overview && (
                      <img className={styles.stop} src="/assets/overview-v2/504bf.svg" alt="" />
                    )}
                    {overview && overviewTypeIcon(a.activityType) && (
                      <img
                        className={styles.typeIcon}
                        src={overviewTypeIcon(a.activityType)}
                        alt=""
                      />
                    )}
                    <span className={styles.activityCopy}>
                      <span>{a.title}</span>
                      {overview && a.startsAt && a.endsAt && (
                        <small>{durationLabel(a.startsAt, a.endsAt)}</small>
                      )}
                    </span>
                    {a.presentation.cover && (
                      <img
                        className={styles.cover}
                        src={a.presentation.cover.src}
                        alt={a.presentation.cover.alt}
                      />
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

function overviewTypeIcon(type: string) {
  const icons: Record<string, string> = {
    SIGHTSEEING: 'e5f05.png',
    VISIT: 'e26c7.png',
    MEAL: '4807e.png',
    FOOD: '4807e.png',
    BEACH: '8f3a3.png',
    WALK: 'e5f05.png',
  };
  return icons[type] ? `/assets/overview-v2/${icons[type]}` : undefined;
}

function durationLabel(start: string, end: string) {
  const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return 'Chưa rõ thời lượng';
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
