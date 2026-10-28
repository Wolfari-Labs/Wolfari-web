import { TripHero } from './components/TripHero';
import { PlanSummary } from '../plan/components/PlanSummary';
import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import { useState, type ReactNode } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
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
import itineraryIcon from '../../shared/assets/figma/44c44.svg';
import weatherIcon from '../../shared/assets/figma/a5eea.svg';
import fundIcon from '../../shared/assets/figma/d6d19.svg';
import packingIcon from '../../shared/assets/figma/000f9.svg';
import styles from './TripOverviewPage.module.css';
import { GatewayOverview } from './GatewayOverview';

function Unavailable({
  title,
  icon,
  region,
  children,
}: {
  title: string;
  icon?: string;
  region?: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.panel} data-region={region}>
      <h2>
        {icon && <img src={icon} alt="" />}
        {title}
      </h2>
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
      {trip.description && <p className={styles.description}>{trip.description}</p>}
      <div className={styles.summaries} data-region="trip-overview-summaries">
        <section className={styles.panel}>
          <h2>
            <img src={itineraryIcon} alt="" />
            Lịch trình ngày đầu
          </h2>
          <PlanSummary trip={trip} result={plan} compact onRetry={onRetry} />
        </section>
        <Unavailable title="Thời tiết" icon={weatherIcon} />
        <Unavailable title="Ngân sách / Quỹ nhóm" icon={fundIcon} />
        <Unavailable title="Tiến độ Packing list" icon={packingIcon} />
      </div>
      <div className={styles.workspace} data-region="trip-overview-workspace">
        <section
          className={`${styles.panel} ${styles.itineraryPanel}`}
          data-region="trip-overview-itinerary"
        >
          <h2>Lịch trình</h2>
          <PlanSummary trip={trip} result={plan} onRetry={onRetry} />
        </section>
        <Unavailable title="Bản đồ hành trình">
          <p>Bản đồ hành trình sẽ xuất hiện khi có dữ liệu địa điểm.</p>
          <Button variant="plain" disabled>
            Xem chi tiết
          </Button>
        </Unavailable>
        <div className={styles.aside}>
          <Unavailable title="Theo dõi giá vé" region="trip-overview-fare">
            <Button variant="outline" disabled>
              Đặt ngưỡng
            </Button>
          </Unavailable>
          <div className={styles.postcard} data-region="trip-overview-postcard">
            <p>
              Mỗi chuyến đi
              <br />
              là một câu chuyện
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
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
  const plan: ReadResult<PlanViewModel> | { status: 'loading' } = snapshot.state.status === 'ready'
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
        <TripOverview
          trip={trip}
          plan={plan}
          onRetry={snapshot.retry}
        />
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
