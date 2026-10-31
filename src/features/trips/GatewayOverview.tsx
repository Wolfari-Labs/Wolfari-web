import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useTripRepository } from './repositories/repository-context';
import { usePlanRepository } from '../plan/repositories/plan-context';
import { useFundRepository } from '../fund/repositories/fund-context';
import { useMembersRepositories } from '../members/repositories/members-context';
import { TripOverview } from './TripOverviewContent';
import type { PlanViewModel } from '../plan/model/plan';
import type { ReadResult } from '../../shared/types/result';
import { ContentState } from '../../shared/components/ContentState';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { paths } from '../../app/route-paths';
import { toDomainError } from '../../shared/lib/runtime-validation';
import { formatVnd } from '../fund/GatewayFundPage';
import styles from './TripOverviewPage.module.css';

const fundStatus = { OPEN: 'Đang mở', CLOSING: 'Đang chốt', CLOSED: 'Đã đóng' } as const;

export function GatewayOverview() {
  const { tripId = '' } = useParams();
  const tripRepo = useTripRepository();
  const planRepo = usePlanRepository();
  const fundRepo = useFundRepository();
  const { membership } = useMembersRepositories();
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepo.getTrip({ tripId, signal, scenario: 'success' }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const actor = trip?.currentMembership.userId;
  const allowed = !!trip && trip.permissions.canRead && !trip.currentMembership.leftAt;
  const planQuery = useQuery({
    queryKey: ['plan', tripId, 'overview', actor],
    enabled: allowed,
    queryFn: ({ signal }) => planRepo.getPlan({ tripId, signal, scenario: 'success' }),
  });
  const fundQuery = useQuery({
    queryKey: ['finance', actor, tripId, 'fund'],
    enabled: allowed && !!fundRepo.runtime,
    queryFn: ({ signal }) => fundRepo.runtime!.fund(tripId, signal),
  });
  const memberQuery = useQuery({
    queryKey: ['members', tripId, 'overview', actor],
    enabled: allowed,
    queryFn: ({ signal }) =>
      membership.listMembers({ tripId, signal, scenario: 'success', limit: 100 }),
  });
  const plan: ReadResult<PlanViewModel> | { status: 'loading' } = planQuery.isPending
    ? { status: 'loading' }
    : planQuery.isError
      ? { status: 'error', error: toDomainError(planQuery.error) }
      : (planQuery.data ?? {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        });
  const members = memberQuery.data?.status === 'ready' ? memberQuery.data.data : null;
  const memberCount = members && !members.nextCursor ? members.items.length : null;
  const displayTrip =
    trip && memberCount !== null
      ? { ...trip, presentation: { ...trip.presentation, memberCount } }
      : trip;
  const memberError = memberQuery.isError
    ? toDomainError(memberQuery.error)
    : memberQuery.data?.status === 'error'
      ? memberQuery.data.error
      : null;
  const memberFeedback = memberError ? (
    <Alert tone="error">
      Không thể tải danh sách thành viên. Xem trang Thành viên để kiểm tra quyền và danh sách.
      {memberError.correlationId && ` Mã đối chiếu: ${memberError.correlationId}.`}
      {memberError.retryable && (
        <Button variant="outline" onClick={() => void memberQuery.refetch()}>
          Tải lại thành viên
        </Button>
      )}
    </Alert>
  ) : members?.nextCursor ? (
    <p>
      Đã tải {members.items.length} thành viên ở trang đầu.{' '}
      <Link to={paths.members(tripId)}>Xem danh sách đầy đủ</Link>
    </p>
  ) : null;
  const fundContent = !fundRepo.runtime ? (
    <p className={styles.unavailable}>Quỹ nhóm chưa khả dụng.</p>
  ) : fundQuery.isPending ? (
    <ContentState state="loading" headingLevel={2} />
  ) : fundQuery.isError ? (
    <ContentState
      state="error"
      error={toDomainError(fundQuery.error)}
      onRetry={() => void fundQuery.refetch()}
      headingLevel={2}
    />
  ) : fundQuery.data === null ? (
    <>
      <p className={styles.summaryDetail}>Chưa bật quỹ nhóm.</p>
      <Link className={styles.summaryLink} to={paths.fund(tripId)}>
        Mở quỹ nhóm
      </Link>
    </>
  ) : fundQuery.data ? (
    <>
      <p className={styles.summaryValue}>{formatVnd(fundQuery.data.budget_amount)}</p>
      <p className={styles.summaryDetail}>Quỹ TEST · {fundStatus[fundQuery.data.status]}</p>
      <p className={styles.summaryDetail}>
        Số dư ghi sổ: {formatVnd(fundQuery.data.current_balance)}
      </p>
      <p className={styles.summaryDetail}>
        Khả dụng: {formatVnd(fundQuery.data.available_balance)}
      </p>
      <Link className={styles.summaryLink} to={paths.fund(tripId)}>
        Mở quỹ nhóm
      </Link>
    </>
  ) : (
    <ContentState state="unavailable" headingLevel={2} />
  );
  const tripError = tripQuery.isError
    ? toDomainError(tripQuery.error)
    : tripQuery.data?.status === 'error'
      ? tripQuery.data.error
      : null;

  return (
    <section className={styles.page} data-flow="trip-overview" data-node-id="3:31">
      <div className={styles.breadcrumb}>
        <Link to={paths.trips}>Chuyến đi của tôi</Link>
        <span aria-hidden="true">›</span>
        <h1>Tổng quan chuyến đi</h1>
      </div>
      {tripQuery.isPending ? (
        <ContentState state="loading" headingLevel={2} />
      ) : tripError ? (
        <ContentState
          state={
            tripError.code === 'SERVICE_UNAVAILABLE' && !tripError.retryable
              ? 'unavailable'
              : 'error'
          }
          error={tripError}
          onRetry={() => void tripQuery.refetch()}
          headingLevel={2}
        />
      ) : tripQuery.data?.status === 'empty' ? (
        <ContentState state="empty" headingLevel={2} />
      ) : !allowed || !displayTrip ? (
        <ContentState
          state="error"
          error={{ code: 'PERMISSION_DENIED', correlationId: null, retryable: false }}
          headingLevel={2}
        />
      ) : (
        <TripOverview
          trip={displayTrip}
          plan={plan}
          onRetry={() => void planQuery.refetch()}
          fundContent={fundContent}
          memberFeedback={memberFeedback}
          mapContent={
            <>
              <p>Xem các địa điểm có trong lịch trình trên trang bản đồ.</p>
              <Link className={styles.summaryLink} to={paths.map(tripId)}>
                Xem bản đồ địa điểm
              </Link>
            </>
          }
          fareContent={
            <>
              <p>Dữ liệu giá và ngưỡng theo dõi được hiển thị ở trang riêng khi có bản ghi.</p>
              <Link className={styles.summaryLink} to={paths.priceWatch(tripId)}>
                Xem dữ liệu theo dõi giá vé
              </Link>
            </>
          }
        />
      )}
    </section>
  );
}
