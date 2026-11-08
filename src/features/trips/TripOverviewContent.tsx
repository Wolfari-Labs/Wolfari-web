import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { TripHero } from './components/TripHero';
import { OverviewProgress } from './components/OverviewProgress';
import { OverviewFundSummary } from './components/OverviewFundSummary';
import { OverviewEmptyFare } from './components/OverviewEmptyFare';
import { PlanSummary } from '../plan/components/PlanSummary';
import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import type { TripDetailViewModel } from './model/trip-detail';
import { ContentState } from '../../shared/components/ContentState';
import { paths } from '../../app/route-paths';
import { localDate } from '../plan/model/plan-presentation';
import styles from './TripDashboard.module.css';

const asset = (name: string) => `/assets/overview-v2/${name}`;

function Artwork({ name, slot }: { name: string; slot: string }) {
  return (
    <img className={styles.artwork} data-art={slot} src={asset(name)} alt="" aria-hidden="true" />
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
      percent={total ? Math.round((completed / total) * 100) : 0}
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
  return (
    <>
      <TripHero trip={trip} compact />
      {trip.description && (
        <details className={styles.description}>
          <summary>Giới thiệu chuyến đi</summary>
          <p>{trip.description}</p>
        </details>
      )}
      {memberFeedback && <div className={styles.memberFeedback}>{memberFeedback}</div>}
      <div className={styles.dashboard}>
        <div className={styles.summaries} data-region="trip-overview-summaries">
          <section className={`${styles.panel} ${styles.dayCard}`} data-region="trip-overview-day">
            <Link
              className={styles.cardLink}
              to={paths.plan(trip.id)}
              aria-label="Lịch trình trong ngày"
            />
            <Artwork name="939b0.png" slot="day-cloud" />
            <Artwork name="df307.png" slot="day-hill" />
            <Artwork name="e0863.png" slot="signpost" />
            <h2>
              <img src={asset('b342a.png')} alt="" />
              Lịch trình trong ngày
            </h2>
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
          <section className={`${styles.panel} ${styles.weatherCard}`}>
            <Artwork name="0dad6.png" slot="beach" />
            <Artwork name="939b0.png" slot="weather-cloud" />
            <Artwork name="9380c.png" slot="palms" />
            <h2>
              <img src={asset('ed7aa.png')} alt="" />
              Thời tiết
            </h2>
            <div className={styles.cardContent}>
              <p className={styles.summaryValue}>—</p>
              <p className={styles.summaryDetail}>Chưa có dữ liệu thời tiết</p>
            </div>
          </section>
          <section
            className={`${styles.panel} ${styles.fundCard}`}
            data-region="trip-overview-fund"
          >
            <Link
              className={styles.cardLink}
              to={paths.fund(trip.id)}
              aria-label="Ngân sách / Quỹ nhóm"
            />
            <Artwork name="f7c5a.png" slot="coins" />
            <h2>
              <img src={asset('adaad.png')} alt="" />
              Ngân sách / Quỹ nhóm
            </h2>
            <div className={styles.cardContent}>
              {fundContent ?? <OverviewFundSummary fund={undefined} />}
            </div>
          </section>
          <section
            className={`${styles.panel} ${styles.packingCard}`}
            data-region="trip-overview-packing"
          >
            <Link
              className={styles.cardLink}
              to={paths.packing(trip.id)}
              aria-label="Tiến độ Packing list"
            />
            <Artwork name="d257b.png" slot="backpack" />
            <h2>
              <img src={asset('bd68f.png')} alt="" />
              Tiến độ Packing list
            </h2>
            <div className={styles.cardContent}>
              <PackingSummary trip={trip} plan={plan} onRetry={onRetry} />
            </div>
          </section>
        </div>
        <div className={styles.workspace} data-region="trip-overview-workspace">
          <section
            className={`${styles.panel} ${styles.itineraryPanel}`}
            data-region="trip-overview-itinerary"
          >
            <Link className={styles.cardLink} to={paths.plan(trip.id)} aria-label="Lịch trình" />
            <h2>
              <img src={asset('da7c7.svg')} alt="" />
              Lịch trình
            </h2>
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
              <h2>
                <img src={asset('17a21.svg')} alt="" />
                Bản đồ hành trình
              </h2>
            </header>
            <div className={styles.mapArtwork}>
              <img
                src={asset('5c5fb.png')}
                alt="Bản đồ minh họa, không thể hiện lộ trình thực tế của chuyến đi"
              />
              <span>Minh họa</span>
            </div>
            <div className={styles.mapCaption}>
              <Link className={styles.mapLink} to={paths.map(trip.id)}>
                Xem bản đồ địa điểm
              </Link>
            </div>
          </section>
          <div className={styles.aside}>
            <section
              className={`${styles.panel} ${styles.farePanel}`}
              data-region="trip-overview-fare"
            >
              <Link
                className={styles.cardLink}
                to={paths.priceWatch(trip.id)}
                aria-label="Theo dõi giá vé"
              />
              <h2>
                <img src={asset('25517.svg')} alt="" />
                Theo dõi giá vé
              </h2>
              <Artwork name="df9de.png" slot="airplane" />
              <div className={styles.fareContent}>{fareContent ?? <OverviewEmptyFare />}</div>
            </section>
            <div className={styles.postcard} data-region="trip-overview-postcard">
              <Artwork name="29ce6.png" slot="mountains" />
              <Artwork name="22b66.png" slot="route" />
              <Artwork name="749b4.png" slot="paper-plane" />
              <Artwork name="5a78f.png" slot="wordmark" />
              <p>
                Mỗi chuyến đi
                <br />
                là một câu chuyện
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
