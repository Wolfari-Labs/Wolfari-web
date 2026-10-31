import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { tripDetailScenarios, type TripDetailScenario } from './model/trip-detail';
import { ContentState } from '../../shared/components/ContentState';
import { Select } from '../../shared/components/Select';
import { paths } from '../../app/route-paths';
import type { RouteContext } from '../../app/route-context';
import styles from './TripOverviewPage.module.css';
import { GatewayOverview } from './GatewayOverview';
import { TripOverview } from './TripOverviewContent';

export function TripOverviewPage() {
  const { previewEnabled } = useOutletContext<RouteContext>();
  return previewEnabled ? <PreviewOverviewPage /> : <GatewayOverview />;
}
function PreviewOverviewPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<TripDetailScenario>('success');
  const snapshot = useTripPlanSnapshot(tripId, 'success', scenario);
  const trip = snapshot.state.status === 'ready' ? snapshot.state.trip : null;
  const plan: ReadResult<PlanViewModel> | { status: 'loading' } =
    snapshot.state.status === 'ready'
      ? { status: 'ready', data: snapshot.state.plan }
      : snapshot.state.status === 'error'
        ? { status: 'error', error: snapshot.state.error }
        : snapshot.state.status === 'empty'
          ? { status: 'empty' }
          : { status: 'loading' };
  const error = snapshot.state.status === 'error' ? snapshot.state.error : null;
  return (
    <section className={styles.page} data-flow="trip-overview" data-node-id="3:31">
      <div className={styles.breadcrumb}>
        <Link to={paths.trips}>Chuyến đi của tôi</Link>
        <span aria-hidden="true">›</span>
        <h1>Tổng quan chuyến đi</h1>
      </div>
      {snapshot.state.status === 'loading' ? (
        <ContentState state="loading" headingLevel={2} />
      ) : error ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={snapshot.retry}
        />
      ) : trip ? (
        <TripOverview trip={trip} plan={plan} onRetry={snapshot.retry} />
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details className="preview" data-preview="trip-detail">
          <summary>Trip detail preview · Dữ liệu minh họa</summary>
          {trip && (
            <details className={styles.metadata}>
              <summary>Thông tin và phiên bản</summary>
              <dl>
                <dt>Vai trò trong chuyến đi</dt>
                <dd>{trip.currentMembership.role}</dd>
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
          )}
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
