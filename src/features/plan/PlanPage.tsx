import { useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripRepository } from '../trips/repositories/repository-context';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import { TripHero } from '../trips/components/TripHero';
import { usePlanRepository } from './repositories/plan-context';
import {
  planScenarios,
  type PlanScenario,
  type PlanViewModel,
  type ActivityViewModel,
} from './model/plan';
import { planDays, activitiesForDay, activityTime } from './model/plan-presentation';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import mountain from '../../shared/assets/figma/eb8f3.svg';
import meal from '../../shared/assets/figma/41563.svg';
import beach from '../../shared/assets/figma/e9568.svg';
import walk from '../../shared/assets/figma/9c64a.svg';
import activityMetric from '../../shared/assets/figma/b75a6.svg';
import locationMetric from '../../shared/assets/figma/12507.svg';
import timeMetric from '../../shared/assets/figma/13a40.svg';
import travelMetric from '../../shared/assets/figma/a6d01.svg';
import styles from './PlanPage.module.css';
const icons: Record<string, string> = {
  SIGHTSEEING: mountain,
  MEAL: meal,
  BEACH: beach,
  WALK: walk,
};

function Activity({
  activity,
  index,
  timezone,
}: {
  activity: ActivityViewModel;
  index: number;
  timezone: string;
}) {
  const icon = icons[activity.activityType];
  return (
    <li className={styles.activity}>
      <span className={styles.step} aria-hidden="true">
        {index + 1}
      </span>
      <div className={styles.card}>
        <time className={styles.time} dateTime={activity.startsAt ?? undefined}>
          {activityTime(activity.startsAt, timezone)}
          <span> – {activityTime(activity.endsAt, timezone)}</span>
        </time>
        {icon && (
          <span className={styles.icon}>
            <img src={icon} alt="" />
          </span>
        )}
        <details className={styles.activityPreview}>
          <summary aria-label={`Xem hoạt động ${activity.title}`}>
            <strong>{activity.title}</strong>
            <small>{activity.description ?? 'Xem hoạt động'}</small>
          </summary>
          <dl>
            <dt>Thời gian</dt>
            <dd>
              {activityTime(activity.startsAt, timezone)} –{' '}
              {activityTime(activity.endsAt, timezone)}
            </dd>
            <dt>Trạng thái</dt>
            <dd>{activity.status === 'TODO' ? 'Chưa hoàn tất' : 'Đã hoàn tất'}</dd>
            <dt>Địa điểm liên kết</dt>
            <dd>{activity.selectedLocationId ? 'Có địa điểm đã chọn' : 'Chưa có địa điểm'}</dd>
          </dl>
          <p>Chỉ xem trước · Chưa gửi thay đổi.</p>
          <Button variant="outline" disabled>
            Chỉnh sửa hoạt động
          </Button>
          <Button variant="plain" disabled>
            Hoàn tất hoạt động
          </Button>
        </details>
        {activity.presentation.cover && (
          <img
            className={styles.cover}
            src={activity.presentation.cover.src}
            alt={activity.presentation.cover.alt}
          />
        )}
        <Button variant="plain" disabled aria-label={`Thao tác ${activity.title}`}>
          ···
        </Button>
      </div>
    </li>
  );
}
export function PlanView({
  trip,
  plan,
  selectedDay,
  onDayChange,
  unscheduledOpen,
  onUnscheduledChange,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  selectedDay: string | null;
  onDayChange: (day: string) => void;
  unscheduledOpen: boolean;
  onUnscheduledChange: () => void;
}) {
  const days = planDays(trip.startAt, trip.endAt, trip.timezone),
    day = selectedDay && days.includes(selectedDay) ? selectedDay : days[0]!;
  const items = activitiesForDay(plan.activities, day, trip.timezone);
  const loose = plan.activities.filter((a) => a.startsAt === null),
    locations = plan.selectedLocations.filter(
      (l) => !plan.activities.some((a) => a.selectedLocationId === l.id),
    );
  return (
    <>
      <div className={styles.hero}>
        <TripHero trip={trip} compact variant="schedule" />
      </div>
      <div className={styles.days} role="group" aria-label="Ngày trong lịch trình">
        {days.map((date, i) => (
          <button
            key={date}
            type="button"
            aria-pressed={date === day}
            onClick={() => onDayChange(date)}
          >
            Ngày {i + 1}
            <small>
              {date.slice(8, 10)}/{date.slice(5, 7)}
            </small>
          </button>
        ))}
        <Button variant="outline" disabled>
          + Thêm ngày
        </Button>
      </div>
      <div className={styles.metrics}>
        <div>
          <span className={styles.metricIcon}>
            <img src={activityMetric} alt="" />
          </span>
          <span>
            <strong>{plan.activities.length}</strong>Hoạt động
          </span>
        </div>
        <div>
          <span className={styles.metricIcon}>
            <img src={locationMetric} alt="" />
          </span>
          <span>
            <strong>{plan.selectedLocations.length}</strong>Địa điểm
          </span>
        </div>
        <div>
          <span className={styles.metricIcon}>
            <img src={timeMetric} alt="" />
          </span>
          <span>
            <strong>
              {items.filter((a) => a.status === 'COMPLETED').length}/{items.length}
            </strong>
            Hoàn tất trong ngày
          </span>
        </div>
        <div>
          <span className={styles.metricIcon}>
            <img src={travelMetric} alt="" />
          </span>
          <span>
            <strong>—</strong>Di chuyển · Chưa khả dụng
          </span>
        </div>
      </div>
      <div className={`${styles.columns} ${unscheduledOpen ? styles.withUnscheduled : ''}`}>
        <section className={styles.timeline} aria-labelledby="plan-day-title">
          <div className={styles.toolbar}>
            <h2 id="plan-day-title">Lịch trình ngày {days.indexOf(day) + 1}</h2>
            <Button variant="outline" disabled>
              Hiện bản đồ
            </Button>
            <Button disabled>Thêm hoạt động</Button>
          </div>
          {items.length ? (
            <ol
              className={styles.timelineViewport}
              tabIndex={0}
              aria-label="Các hoạt động trong ngày"
            >
              {items.map((activity, i) => (
                <Activity
                  key={activity.id}
                  activity={activity}
                  index={i}
                  timezone={trip.timezone}
                />
              ))}
            </ol>
          ) : (
            <ContentState state="empty" headingLevel={2} />
          )}
        </section>
        <section className={styles.unscheduled} aria-label="Chưa xếp lịch">
          <button
            type="button"
            className={styles.unscheduledToggle}
            aria-expanded={unscheduledOpen}
            aria-controls="unscheduled-content"
            onClick={onUnscheduledChange}
          >
            Đã chọn · Chưa xếp lịch <span>{loose.length + locations.length}</span>
          </button>
          {unscheduledOpen && (
            <div id="unscheduled-content">
              <Alert>Chỉ xem trước · Sắp xếp hoặc kéo thả chưa khả dụng.</Alert>
              {loose.length + locations.length === 0 ? (
                <ContentState state="empty" headingLevel={2} />
              ) : (
                <ul>
                  {loose.map((a) => (
                    <li key={a.id}>
                      <strong>{a.title}</strong>
                      <small>Hoạt động chưa xếp giờ</small>
                    </li>
                  ))}
                  {locations.map((l) => (
                    <li key={l.id}>
                      <strong>{l.name}</strong>
                      <small>{l.address ?? 'Chưa có địa chỉ'}</small>
                    </li>
                  ))}
                </ul>
              )}
              <Button disabled>Sắp xếp vào lịch</Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function PlanPage() {
  const { tripId = '' } = useParams(),
    { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository(),
    repository = usePlanRepository();
  const [scenario, setScenario] = useState<PlanScenario>('success'),
    [day, setDay] = useState<string | null>(null),
    [unscheduledOpen, setUnscheduledOpen] = useState(false),
    [commandState, setCommandState] = useState('idle');
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed =
    !!trip?.permissions.canRead &&
    trip.id === tripId &&
    trip.currentMembership.leftAt === null &&
    trip.currentMembership.tripId === tripId;
  const query = useQuery({
    queryKey: ['plan', tripId, scenario],
    queryFn: ({ signal }) => repository.getPlan({ tripId, scenario, signal }),
    enabled: allowed,
  });
  const plan = query.data?.status === 'ready' ? query.data.data : null;
  const conflict =
    plan &&
    trip &&
    (plan.tripId !== tripId ||
      plan.planVersion !== trip.planVersion ||
      plan.exportRevision !== trip.exportRevision);
  const error =
    tripQuery.isError || query.isError
      ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
      : tripQuery.data?.status === 'error'
        ? tripQuery.data.error
        : trip && !allowed
          ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
          : query.data?.status === 'error'
            ? query.data.error
            : plan && !plan.permissions.canRead
              ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
              : conflict
                ? { code: 'VERSION_CONFLICT' as const, correlationId: null, retryable: false }
                : null;
  return (
    <section className={styles.page} data-flow="plan-preview" data-node-id="20:236">
      <div className={styles.breadcrumb}>
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span aria-hidden="true">›</span>
        <h1>Lịch trình</h1>
      </div>
      {error ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={() => {
            void tripQuery.refetch();
            if (allowed) void query.refetch();
          }}
        />
      ) : tripQuery.isPending || (allowed && query.isPending) ? (
        <ContentState state="loading" headingLevel={2} />
      ) : trip && plan ? (
        <PlanView
          trip={trip}
          plan={plan}
          selectedDay={day}
          onDayChange={setDay}
          unscheduledOpen={unscheduledOpen}
          onUnscheduledChange={() => setUnscheduledOpen((o) => !o)}
        />
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details className="preview" data-preview="plan">
          <summary>Plan preview · Dữ liệu minh họa</summary>
          {trip && plan && (
            <p className={styles.revisions}>
              Plan {plan.planVersion} · Membership {trip.membershipRevision} · Export{' '}
              {plan.exportRevision} ·{' '}
              {plan.permissions.canEdit
                ? 'Có quyền sửa lịch trình'
                : 'Không có quyền sửa lịch trình'}{' '}
              · {plan.permissions.canComplete ? 'Có quyền hoàn tất' : 'Không có quyền hoàn tất'}
            </p>
          )}
          <Select
            label="Trạng thái lịch trình"
            value={scenario}
            onChange={(e) => {
              const next = planScenarios.find((s) => s === e.target.value);
              if (next) setScenario(next);
            }}
          >
            {planScenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            label="Trạng thái thao tác preview"
            value={commandState}
            onChange={(e) => setCommandState(e.target.value)}
          >
            {['idle', 'pending', 'unknown'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          {commandState !== 'idle' && (
            <Alert live>
              {commandState === 'pending'
                ? 'Minh họa đang xử lý · Không có request đang gửi.'
                : 'Minh họa kết quả chưa xác định · Chưa xác nhận thay đổi hoặc tăng phiên bản.'}
            </Alert>
          )}
        </details>
      )}
    </section>
  );
}
