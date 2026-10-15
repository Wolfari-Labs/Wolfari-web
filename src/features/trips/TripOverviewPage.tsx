import { TripHero } from './components/TripHero';
import { usePlanRepository } from '../plan/repositories/plan-context';
import { PlanSummary } from '../plan/components/PlanSummary';
import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import { useState, type ReactNode } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTripRepository } from './repositories/repository-context';
import {
  tripDetailScenarios,
  type TripDetailScenario,
  type TripDetailViewModel,
} from './model/trip-detail';
import { Button } from '../../shared/components/Button';
import { ContentState } from '../../shared/components/ContentState';
import { Select } from '../../shared/components/Select';
import { paths } from '../../app/route-paths';
import type { RouteContext } from '../../app/route-context';
import styles from './TripOverviewPage.module.css';

function Unavailable({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      <p className={styles.unavailable}>Chưa khả dụng</p>
      {children}
    </section>
  );
}
export function TripOverview({
  trip,
  plan,
  onRetry,
}: {
  trip: TripDetailViewModel;
  plan: ReadResult<PlanViewModel> | { status: 'loading' };
  onRetry: () => void;
}) {
  return (
    <>
      <TripHero trip={trip} />
      {trip.description && <p>{trip.description}</p>}
      <div className={styles.summaries}>
        <section className={styles.panel}>
          <h2>Lịch trình ngày đầu</h2>
          <PlanSummary trip={trip} result={plan} compact onRetry={onRetry} />
        </section>
        <Unavailable title="Thời tiết" />
        <Unavailable title="Ngân sách / Quỹ nhóm" />
        <Unavailable title="Tiến độ Packing list" />
      </div>
      <div className={styles.workspace}>
        <section className={styles.panel}>
          <h2>Lịch trình</h2>
          <PlanSummary trip={trip} result={plan} onRetry={onRetry} />
        </section>
        <Unavailable title="Bản đồ hành trình">
          <p>Chưa có projection bản đồ khả dụng.</p>
          <Button variant="plain" disabled>
            Xem chi tiết
          </Button>
        </Unavailable>
        <div className={styles.aside}>
          <Unavailable title="Theo dõi giá vé">
            <Button variant="outline" disabled>
              Đặt ngưỡng
            </Button>
          </Unavailable>
          <div className={styles.postcard}>
            <p>
              Mỗi chuyến đi
              <br />
              là một câu chuyện
            </p>
          </div>
        </div>
      </div>
      <details className={styles.metadata}>
        <summary>Thông tin và phiên bản</summary>
        <dl>
          <dt>Vai trò trong chuyến đi</dt>
          <dd>{trip.currentMembership.role}</dd>
          <dt>Quyền đọc / sửa metadata</dt>
          <dd>
            {trip.permissions.canRead ? 'Có' : 'Không'} /{' '}
            {trip.permissions.canUpdate ? 'Có' : 'Không'}
          </dd>
          <dt>Plan / membership / export revision</dt>
          <dd>
            {trip.planVersion} / {trip.membershipRevision} / {trip.exportRevision}
          </dd>
          <dt>Chính sách sửa lịch trình</dt>
          <dd>{trip.planEditPolicy}</dd>
          <dt>Múi giờ</dt>
          <dd>{trip.timezone}</dd>
        </dl>
      </details>
    </>
  );
}
export function TripOverviewPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const repository = useTripRepository();
  const planRepository = usePlanRepository();
  const [scenario, setScenario] = useState<TripDetailScenario>('success');
  const query = useQuery({
    queryKey: ['trip', 'detail', tripId, scenario],
    queryFn: ({ signal }) => repository.getTrip({ tripId, scenario, signal }),
  });
  const result = query.data;
  const trip = result?.status === 'ready' ? result.data : null;
  const denied =
    trip &&
    (!trip.permissions.canRead ||
      trip.currentMembership.leftAt !== null ||
      trip.currentMembership.tripId !== tripId);
  const planQuery = useQuery({
    queryKey: ['plan', tripId, 'success'],
    queryFn: ({ signal }) => planRepository.getPlan({ tripId, scenario: 'success', signal }),
    enabled: !!trip && !denied,
  });
  const plan: ReadResult<PlanViewModel> | { status: 'loading' } = planQuery.isPending
    ? { status: 'loading' }
    : planQuery.isError
      ? {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        }
      : (planQuery.data ?? { status: 'empty' });
  const error = query.isError
    ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
    : result?.status === 'error'
      ? result.error
      : denied
        ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
        : null;
  return (
    <section className={styles.page} data-flow="trip-overview" data-node-id="3:31">
      <div className={styles.breadcrumb}>
        <Link to={paths.trips}>Chuyến đi của tôi</Link>
        <span aria-hidden="true">›</span>
        <h1>Tổng quan chuyến đi</h1>
      </div>
      {query.isPending ? (
        <ContentState state="loading" headingLevel={2} />
      ) : error ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : trip ? (
        <TripOverview
          trip={trip}
          plan={plan}
          onRetry={() => {
            void query.refetch();
            if (!denied) void planQuery.refetch();
          }}
        />
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details className="preview" data-preview="trip-detail">
          <summary>Trip detail preview · Dữ liệu minh họa</summary>
          <Select
            label="Trạng thái tổng quan"
            value={scenario}
            onChange={(e) => {
              const next = tripDetailScenarios.find((s) => s === e.target.value);
              if (next) setScenario(next);
            }}
          >
            {tripDetailScenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </details>
      )}
    </section>
  );
}
