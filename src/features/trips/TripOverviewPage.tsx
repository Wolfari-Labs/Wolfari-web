import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTripRepository } from './repositories/repository-context';
import {
  tripDetailScenarios,
  type TripDetailScenario,
  type TripDetailViewModel,
} from './model/trip-detail';
import { tripDateLabel } from './model/trip-list-query';
import { Button } from '../../shared/components/Button';
import { ContentState } from '../../shared/components/ContentState';
import { Select } from '../../shared/components/Select';
import { paths } from '../../app/route-paths';
import type { RouteContext } from '../../app/route-context';
import styles from './TripOverviewPage.module.css';

const status = {
  UPCOMING: 'Sắp tới',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};
function Unavailable({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      <p className={styles.unavailable}>Chưa khả dụng</p>
      {children}
    </section>
  );
}
export function TripOverview({ trip }: { trip: TripDetailViewModel }) {
  return (
    <>
      <section
        className={styles.hero}
        aria-label="Thông tin chuyến đi"
        style={
          trip.presentation.cover
            ? ({
                '--trip-cover': `url("${trip.presentation.cover.src}")`,
                '--trip-mobile-cover': `url("${trip.presentation.cover.mobileSrc ?? trip.presentation.cover.src}")`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className={styles.paper}>
          <h2>{trip.name}</h2>
          <div className={styles.meta}>
            <span>{tripDateLabel(trip)}</span>
            <Link to={paths.members(trip.id)}>
              {trip.presentation.memberCount === null
                ? 'Thành viên'
                : `${trip.presentation.memberCount} thành viên`}
            </Link>
            <span>{status[trip.lifecycle]}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" disabled title="Chỉnh sửa chưa được kết nối">
            Chỉnh sửa
          </Button>
          <Button disabled title="Chia sẻ chưa được kết nối">
            Chia sẻ
          </Button>
        </div>
      </section>
      {trip.description && <p>{trip.description}</p>}
      <div className={styles.summaries}>
        <Unavailable title="Lịch trình trong ngày">
          <Link to={paths.plan(trip.id)}>Xem lịch trình →</Link>
        </Unavailable>
        <Unavailable title="Thời tiết" />
        <Unavailable title="Ngân sách / Quỹ nhóm" />
        <Unavailable title="Tiến độ Packing list" />
      </div>
      <div className={styles.workspace}>
        <Unavailable title="Lịch trình">
          <p>Chọn lịch trình để xem bản đọc và hoạt động.</p>
          <Link to={paths.plan(trip.id)}>Xem chi tiết lịch trình →</Link>
        </Unavailable>
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
        <TripOverview trip={trip} />
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
