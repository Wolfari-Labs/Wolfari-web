import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { OverviewHero } from './components/OverviewHero';
import { OverviewProgress } from './components/OverviewProgress';
import { OverviewFundSummary } from './components/OverviewFundSummary';
import { OverviewEmptyFare } from './components/OverviewEmptyFare';
import { PlanSummary } from '../plan/components/PlanSummary';
import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import type { TripDetailViewModel } from './model/trip-detail';
import { ContentState } from '../../shared/components/ContentState';
import { paths } from '../../app/route-paths';
import { localDate, planDays } from '../plan/model/plan-presentation';
import { Icon, type IconName } from '../../shared/components/Icon';
import mapArt from '../../shared/assets/figma/trips-plan/overview-map.svg';
import calendarIcon from '../../shared/assets/figma/trips-plan/calendar.svg';
import walletIcon from '../../shared/assets/figma/trips-plan/wallet.svg';
import luggageIcon from '../../shared/assets/figma/trips-plan/luggage.svg';
import planeIcon from '../../shared/assets/figma/trips-plan/plane.svg';
import sunIcon from '../../shared/assets/figma/trips-plan/sun.svg';
import styles from './TripDashboard.module.css';

/** Web v2 `D/Icon badge`: a gradient square with a white glyph (decorative). */
function IconBadge({ icon, tone }: { icon: IconName; tone: 'blue' | 'green' | 'amber' | 'coral' }) {
  const asset = { calendar: calendarIcon, fund: walletIcon, luggage: luggageIcon, price: planeIcon }[icon as 'calendar' | 'fund' | 'luggage' | 'price'];
  return (
    <span className={styles.badge} data-tone={tone} aria-hidden="true">
      {asset ? <img src={asset} alt="" /> : <Icon name={icon} size={22} strokeWidth={2} />}
    </span>
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
    return (
      <OverviewProgress percent={null} label="Chưa có dữ liệu hành lý">
        <p className={styles.summaryDetail}>Chưa có dữ liệu hành lý.</p>
      </OverviewProgress>
    );
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
    <OverviewProgress
      percent={total ? Math.round((completed / total) * 100) : null}
      label={`${completed}/${total} món đã chuẩn bị`}
    >
      <p className={styles.summaryValue}>
        {completed}/{total} món
      </p>
      <p className={styles.summaryDetail}>
        {total ? `${Math.round((completed / total) * 100)}% đã chuẩn bị` : 'Chưa có món hành lý'}
      </p>
    </OverviewProgress>
  );
}

export function TripOverview({
  trip,
  plan,
  onRetry,
  fundContent,
  memberFeedback,
  fareContent,
}: {
  trip: TripDetailViewModel;
  plan: ReadResult<PlanViewModel> | { status: 'loading' };
  onRetry: () => void;
  fundContent?: ReactNode;
  memberFeedback?: ReactNode;
  fareContent?: ReactNode;
}) {
  const [selectedDay, setSelectedDay] = useState(() => localDate(trip.startAt, trip.timezone));
  const days = planDays(trip.startAt, trip.endAt, trip.timezone);
  const dayIndex = days.indexOf(selectedDay);
  return (
    <>
      <OverviewHero
        trip={trip}
        dayLabel={dayIndex >= 0 ? `Ngày ${dayIndex + 1}/${days.length}` : undefined}
      />
      {trip.description && (
        <details className={styles.description}>
          <summary>Giới thiệu chuyến đi</summary>
          <p>{trip.description}</p>
        </details>
      )}
      {memberFeedback && <div className={styles.memberFeedback}>{memberFeedback}</div>}
      <div className={styles.dashboard}>
        <div className={styles.summaries} data-region="trip-overview-summaries">
          <section className={`${styles.stat} ${styles.dayCard}`} data-region="trip-overview-day">
            <Link
              className={styles.cardLink}
              to={paths.plan(trip.id)}
              aria-label="Lịch trình trong ngày"
            />
            <div className={styles.statHead}>
              <IconBadge icon="calendar" tone="blue" />
              <h2>Lịch trình hôm nay</h2>
            </div>
            <div className={styles.cardContent}>
              <PlanSummary
                trip={trip}
                result={plan}
                compact
                overview
                selectedDay={selectedDay}
                onRetry={onRetry}
              />
            </div>
          </section>
          <section className={`${styles.stat} ${styles.fundCard}`} data-region="trip-overview-fund">
            <Link
              className={styles.cardLink}
              to={paths.fund(trip.id)}
              aria-label="Ngân sách / Quỹ nhóm"
            />
            <div className={styles.statHead}>
              <IconBadge icon="fund" tone="green" />
              <h2>Quỹ nhóm</h2>
            </div>
            <div className={styles.cardContent}>
              {fundContent ?? <OverviewFundSummary fund={undefined} />}
            </div>
          </section>
          <section
            className={`${styles.stat} ${styles.packingCard}`}
            data-region="trip-overview-packing"
          >
            <Link
              className={styles.cardLink}
              to={paths.packing(trip.id)}
              aria-label="Tiến độ hành lý"
            />
            <div className={styles.statHead}>
              <IconBadge icon="luggage" tone="amber" />
              <h2>Hành lý đã sẵn</h2>
            </div>
            <div className={styles.cardContent}>
              <PackingSummary trip={trip} plan={plan} onRetry={onRetry} />
            </div>
          </section>
          <section className={`${styles.stat} ${styles.fareCard}`} data-region="trip-overview-fare">
            <Link
              className={styles.cardLink}
              to={paths.priceWatch(trip.id)}
              aria-label="Theo dõi giá vé"
            />
            <div className={styles.statHead}>
              <IconBadge icon="price" tone="coral" />
              <h2>Theo dõi giá vé</h2>
            </div>
            <div className={styles.cardContent}>{fareContent ?? <OverviewEmptyFare />}</div>
          </section>
        </div>
        <div className={styles.workspace} data-region="trip-overview-workspace">
          <section
            className={`${styles.panel} ${styles.itineraryPanel}`}
            data-region="trip-overview-itinerary"
          >
            <Link className={styles.cardLink} to={paths.plan(trip.id)} aria-label="Lịch trình" />
            <h2>Lịch trình hôm nay</h2>
            <PlanSummary
              trip={trip}
              result={plan}
              overview
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
              onRetry={onRetry}
            />
          </section>
          <section className={`${styles.panel} ${styles.mapPanel}`} data-region="trip-overview-map">
            <header className={styles.panelHeading}>
              <h2>Bản đồ hành trình</h2>
              <Link
                className={styles.mapLink}
                to={paths.map(trip.id)}
                aria-label="Xem bản đồ địa điểm"
              >
                Mở
              </Link>
            </header>
            <div className={styles.mapArtwork}>
              <img
                src={mapArt}
                alt="Bản đồ minh họa, không thể hiện lộ trình thực tế của chuyến đi"
              />
              <span>Minh họa</span>
            </div>
          </section>
          <aside className={styles.aside} aria-label="Giá vé và thời tiết">
            <section className={`${styles.panel} ${styles.farePanel}`}>
              <Link className={styles.cardLink} to={paths.priceWatch(trip.id)} aria-label="Chi tiết theo dõi giá vé" />
              <IconBadge icon="price" tone="coral" />
              <h2>Theo dõi giá vé</h2>
              <div className={styles.cardContent}>{fareContent ?? <OverviewEmptyFare />}</div>
            </section>
            <section className={`${styles.panel} ${styles.weatherPanel}`} aria-label="Thời tiết chưa khả dụng">
              <span className={styles.badge} data-tone="amber" aria-hidden="true"><img src={sunIcon} alt="" /></span>
              <h2>Thời tiết hôm nay</h2>
              <p className={styles.weatherValue}>—</p>
              <span className={styles.weatherUnavailable}>Chưa có dữ liệu</span>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
