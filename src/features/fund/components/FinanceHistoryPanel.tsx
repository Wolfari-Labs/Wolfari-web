import { useInfiniteQuery } from '@tanstack/react-query';
import type { FundRuntime } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { MembershipViewModel } from '../../members/model/members';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';
const actions: Record<string, string> = {
  CREATE_EXPENSE: 'Tạo khoản chi',
  UPDATE_EXPENSE: 'Sửa khoản chi',
  CONFIRM_EXPENSE: 'Xác nhận khoản chi',
  REVERSE_EXPENSE: 'Đảo khoản chi',
  CREATE_REFUND: 'Tạo hoàn tiền',
  REVERSE_REFUND: 'Đảo hoàn tiền',
  CREATE_CLOSURE: 'Bắt đầu chốt',
  CONFIRM_CLOSURE: 'Xác nhận snapshot',
  CANCEL_CLOSURE: 'Hủy đợt chốt',
  REVERSE_CONTRIBUTION: 'Đảo khoản đóng',
};
export function FinanceHistoryPanel({
  runtime,
  fundId,
  trip,
  members,
}: {
  runtime: FundRuntime;
  fundId: string;
  trip: TripDetailViewModel;
  members: readonly MembershipViewModel[];
}) {
  const query = useInfiniteQuery({
    queryKey: ['finance', trip.currentMembership.userId, trip.id, 'history', fundId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => runtime.history!(fundId, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const name = (id: string) =>
    members.find((m) => m.userId === id)?.presentation.displayName ?? `User ${id.slice(0, 8)}`;
  return (
    <section className={styles.panel} aria-label="Lịch sử thao tác">
      <p>
        Nhật ký nghiệp vụ từ backend, không phải sổ giao dịch. Một thao tác không nhất thiết làm
        thay đổi số dư.
      </p>
      {query.isPending && <p role="status">Đang tải lịch sử thao tác…</p>}
      {query.isError && (
        <ContentState
          state="error"
          error={toDomainError(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data?.pages.every((p) => !p.items.length) && <p>Chưa có lịch sử thao tác.</p>}
      {query.data?.pages
        .flatMap((p) => p.items)
        .map((row) => (
          <article key={row.id} className={styles.record}>
            <h3>
              {actions[row.action] ?? row.action.replaceAll('_', ' ')} <small>({row.action})</small>
            </h3>
            <p>
              Người thực hiện:{' '}
              {row.actor_user_id
                ? name(row.actor_user_id)
                : row.system_actor
                  ? `Hệ thống · ${row.system_actor}`
                  : 'Không có thông tin người thực hiện'}
            </p>
            <time dateTime={row.occurred_at}>
              {new Date(row.occurred_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}
            </time>
            <p>
              Đối tượng: {row.entity_type} · {row.entity_id ?? 'Không có ID'}
            </p>
            <p>
              Phiên bản: {row.from_version ?? '—'} → {row.to_version ?? '—'}
            </p>
            <p>Lý do: {row.reason ?? 'Không ghi nhận'}</p>
            <details>
              <summary>Thông tin đối chiếu</summary>
              <p>
                {row.occurred_at} · {row.correlation_id}
              </p>
            </details>
          </article>
        ))}
      {query.hasNextPage && (
        <Button disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
          Tải thêm lịch sử thao tác
        </Button>
      )}
      <Button variant="plain" disabled={query.isFetching} onClick={() => void query.refetch()}>
        Tải lại lịch sử thao tác
      </Button>
    </section>
  );
}
