import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useTripRepository } from './repositories/repository-context';
import { usePlanRepository } from '../plan/repositories/plan-context';
import { useFundRepository } from '../fund/repositories/fund-context';
import { useMembersRepositories } from '../members/repositories/members-context';
import { TripHero } from './components/TripHero';
import { PlanSummary } from '../plan/components/PlanSummary';
import { ContentState } from '../../shared/components/ContentState';
import { paths } from '../../app/route-paths';
import { formatVnd, QueryError } from '../fund/GatewayFundPage';
import { Button } from '../../shared/components/Button';
import styles from '../../shared/styles/DemoWorkspace.module.css';

export function GatewayOverview() {
  const { tripId = '' } = useParams(),
    tripRepo = useTripRepository(),
    planRepo = usePlanRepository(),
    fundRepo = useFundRepository(),
    { membership } = useMembersRepositories();
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
  const plan = planQuery.data?.status === 'ready' ? planQuery.data.data : null;
  return (
    <section className={styles.page} data-flow="trip-overview">
      <Link to={paths.trips}>Chuyến đi của tôi</Link>
      <h1>Tổng quan chuyến đi</h1>
      {!allowed ? (
        tripQuery.isPending ? (
          <ContentState state="loading" />
        ) : (
          <ContentState
            state="error"
            error={
              tripQuery.data?.status === 'error'
                ? tripQuery.data.error
                : { code: 'PERMISSION_DENIED', correlationId: null, retryable: false }
            }
          />
        )
      ) : (
        <>
          <TripHero trip={trip} />
          <p>{trip.description}</p>
          <div className={styles.grid}>
            <section className={styles.panel}>
              <h2>Lịch trình</h2>
              <PlanSummary
                trip={trip}
                result={
                  planQuery.isPending
                    ? { status: 'loading' }
                    : (planQuery.data ?? {
                        status: 'error',
                        error: {
                          code: 'SERVICE_UNAVAILABLE',
                          correlationId: null,
                          retryable: true,
                        },
                      })
                }
                onRetry={() => void planQuery.refetch()}
                compact
              />
              <Link to={paths.plan(tripId)}>Mở lịch trình chung</Link>
            </section>
            <section className={styles.panel}>
              <h2>Ngân sách / Quỹ nhóm</h2>
              {fundQuery.isError ? (
                <QueryError error={fundQuery.error} retry={() => void fundQuery.refetch()} />
              ) : fundQuery.isPending ? (
                <ContentState state="loading" />
              ) : fundQuery.data ? (
                <>
                  <p>TEST · {fundQuery.data.status}</p>
                  <p>Ngân sách: {formatVnd(fundQuery.data.budget_amount)}</p>
                  <p>Số dư ghi sổ: {formatVnd(fundQuery.data.current_balance)}</p>
                  <p>Khả dụng: {formatVnd(fundQuery.data.available_balance)}</p>
                </>
              ) : (
                <p>Chưa bật quỹ</p>
              )}
              <Link to={paths.fund(tripId)}>Mở quỹ nhóm</Link>
            </section>
            <section className={styles.panel}>
              <h2>Thành viên</h2>
              {memberQuery.data?.status === 'ready' ? (
                <p>
                  {memberQuery.data.data.items.length} thành viên
                  {memberQuery.data.data.nextCursor
                    ? ' đã tải, còn trang tiếp theo — chưa phải tổng'
                    : ' đang hoạt động'}
                </p>
              ) : memberQuery.data?.status === 'error' ? (
                <ContentState
                  state="error"
                  error={memberQuery.data.error}
                  onRetry={() => void memberQuery.refetch()}
                />
              ) : (
                <ContentState state="loading" />
              )}
              <Link to={paths.members(tripId)}>Thành viên, quyền và lời mời</Link>
            </section>
            <section className={styles.panel}>
              <h2>Packing list</h2>
              {plan ? (
                <p>
                  {plan.packingItems.filter((i) => i.status === 'COMPLETED').length}/
                  {plan.packingItems.length} mục đã hoàn tất · chỉ đọc, writer sau demo1.
                </p>
              ) : (
                <p>Chưa đọc được dữ liệu Plan. Không suy thành 0.</p>
              )}
              <Link to={paths.packing(tripId)}>Xem danh sách</Link>
            </section>
          </div>
          <section className={styles.panel}>
            <h2>Phạm vi demo1</h2>
            <p>
              Thời tiết, DSS/provider, Export/Share, Admin và thanh toán thật chưa mở. Map/Locations
              và Dress Code chỉ đọc dữ liệu server; không tự xuất bản bản nháp cũ.
            </p>
            <Button variant="outline" disabled title="Sau demo1">
              Export / Chia sẻ công khai — sau demo1
            </Button>
          </section>
        </>
      )}
    </section>
  );
}
