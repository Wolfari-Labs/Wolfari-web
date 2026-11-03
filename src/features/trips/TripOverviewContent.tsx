import type { ReactNode } from 'react';
import { TripHero } from './components/TripHero';
import { PlanSummary } from '../plan/components/PlanSummary';
import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import type { TripDetailViewModel } from './model/trip-detail';
import { ContentState } from '../../shared/components/ContentState';
import itineraryIcon from '../../shared/assets/figma/44c44.svg';
import weatherIcon from '../../shared/assets/figma/a5eea.svg';
import fundIcon from '../../shared/assets/figma/d6d19.svg';
import packingIcon from '../../shared/assets/figma/000f9.svg';
import styles from './TripOverviewPage.module.css';

function Unavailable({ title, icon }: { title: string; icon?: string }) {
  return (
    <section className={styles.panel}>
      <h2>
        {icon && <img src={icon} alt="" />}
        {title}
      </h2>
      <p className={styles.unavailable}>Chưa khả dụng</p>
    </section>
  );
}

function PackingSummary({
  trip,
  plan,
  onRetry,
}: {
  trip: TripDetailViewModel;
  plan: ReadResult<PlanViewModel> | { status: 'loading' };
  onRetry: () => void;
}) {
  if (plan.status === 'loading') return <ContentState state="loading" headingLevel={2} />;
  if (plan.status === 'error') {
    return <ContentState state="error" error={plan.error} onRetry={onRetry} headingLevel={2} />;
  }
  if (plan.status === 'empty')
    return <p className={styles.summaryDetail}>Chưa có dữ liệu hành lý.</p>;
  const current =
    plan.data.permissions.canRead &&
    plan.data.tripId === trip.id &&
    plan.data.planVersion === trip.planVersion &&
    plan.data.exportRevision === trip.exportRevision;
  if (!current) {
    return (
      <ContentState
        state="error"
        error={{
          code: plan.data.permissions.canRead ? 'VERSION_CONFLICT' : 'PERMISSION_DENIED',
          correlationId: null,
          retryable: false,
        }}
        onRetry={onRetry}
        headingLevel={2}
      />
    );
  }
  const total = plan.data.packingItems.length;
  const completed = plan.data.packingItems.filter((item) => item.status === 'COMPLETED').length;
  return (
    <>
      <p className={styles.summaryValue}>
        {completed}/{total} món
      </p>
      <p className={styles.summaryDetail}>
        {total ? `${Math.round((completed / total) * 100)}% đã chuẩn bị` : 'Chưa có món hành lý'}
      </p>
      {total > 0 && (
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={`${completed}/${total} món đã chuẩn bị`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
        >
          <span style={{ width: `${(completed / total) * 100}%` }} />
        </div>
      )}
    </>
  );
}

export function TripOverview({
  trip,
  plan,
  onRetry,
  fundContent,
  memberFeedback,
  mapContent,
  fareContent,
}: {
  trip: TripDetailViewModel;
  plan: ReadResult<PlanViewModel> | { status: 'loading' };
  onRetry: () => void;
  fundContent?: ReactNode;
  memberFeedback?: ReactNode;
  mapContent?: ReactNode;
  fareContent?: ReactNode;
}) {
  return (
    <>
      <TripHero trip={trip} />
      {trip.description && <p className={styles.description}>{trip.description}</p>}
      {memberFeedback && <div className={styles.memberFeedback}>{memberFeedback}</div>}
      <div className={styles.summaries} data-region="trip-overview-summaries">
        <section className={styles.panel}>
          <h2>
            <img src={itineraryIcon} alt="" />
            Lịch trình ngày đầu
          </h2>
          <PlanSummary trip={trip} result={plan} compact onRetry={onRetry} />
        </section>
        <Unavailable title="Thời tiết" icon={weatherIcon} />
        <section className={styles.panel} data-region="trip-overview-fund">
          <h2>
            <img src={fundIcon} alt="" />
            Ngân sách / Quỹ nhóm
          </h2>
          {fundContent ?? <p className={styles.unavailable}>Chưa khả dụng</p>}
        </section>
        <section className={styles.panel} data-region="trip-overview-packing">
          <h2>
            <img src={packingIcon} alt="" />
            Tiến độ Packing list
          </h2>
          <PackingSummary trip={trip} plan={plan} onRetry={onRetry} />
        </section>
      </div>
      <div className={styles.workspace} data-region="trip-overview-workspace">
        <section
          className={`${styles.panel} ${styles.itineraryPanel}`}
          data-region="trip-overview-itinerary"
        >
          <h2>Lịch trình</h2>
          <PlanSummary trip={trip} result={plan} onRetry={onRetry} />
        </section>
        <section className={styles.panel} data-region="trip-overview-map">
          <h2>Bản đồ hành trình</h2>
          {mapContent ?? <p>Bản đồ hành trình sẽ xuất hiện khi có dữ liệu địa điểm.</p>}
        </section>
        <div className={styles.aside}>
          <section className={styles.panel} data-region="trip-overview-fare">
            <h2>Theo dõi giá vé</h2>
            {fareContent ?? <p className={styles.unavailable}>Chưa khả dụng</p>}
          </section>
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
