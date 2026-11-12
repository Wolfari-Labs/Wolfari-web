import { Fragment, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { FundRuntime, RuntimeFund, Closure } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { MembershipViewModel } from '../../members/model/members';
import type { FinanceCommandKind } from '../../../shared/types/operations';
import { FinanceAction } from './FinanceAction';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';
const groupLabels: Record<string, string> = {
  contribution_requests: 'Đợt đóng góp',
  contributions: 'Khoản đóng',
  expenses: 'Khoản chi',
  financial_notes: 'Ngoài quỹ',
  refunds: 'Hoàn tiền',
  ledger: 'Sổ giao dịch',
};
const labels = { PENDING_CONFIRMATIONS: 'Chờ xác nhận', CANCELLED: 'Đã hủy', COMPLETED: 'Đã đóng' };
export function ClosurePanel({
  runtime,
  fund,
  trip,
  blocked,
  members,
}: {
  runtime: FundRuntime;
  fund: RuntimeFund;
  trip: TripDetailViewModel;
  blocked: boolean;
  members: readonly MembershipViewModel[];
}) {
  const actor = trip.currentMembership.userId,
    owner = trip.currentMembership.role === 'OWNER',
    session = runtime.commands.forScope(actor, trip.id);
  const [selected, setSelected] = useState<string | null>(null),
    [reviewed, setReviewed] = useState('');
  const list = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'closures', fund.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => runtime.closures!(fund.id, trip.id, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const detail = useQuery({
    queryKey: ['finance', actor, trip.id, 'closure', selected],
    enabled: !!selected,
    queryFn: ({ signal }) => runtime.closure!(selected!, fund.id, trip.id, signal),
  });
  const row = detail.data;
  const name = (id: string) =>
    members.find((m) => m.userId === id)?.presentation.displayName ?? `User ${id.slice(0, 8)}`;
  const action = (
    kind: FinanceCommandKind,
    label: string,
    entry?: Closure,
    extraBlocked = false,
  ) => (
    <FinanceAction
      label={label}
      session={session}
      disabled={
        blocked ||
        list.isFetching ||
        list.isError ||
        extraBlocked ||
        (!!entry && (detail.isFetching || detail.isError))
      }
      fields={
        kind === 'closure-cancel'
          ? [{ key: 'reason', label: 'Lý do hủy đợt chốt', required: true }]
          : []
      }
      description={
        kind === 'closure-remind'
          ? 'Thành công chỉ có nghĩa backend tiếp nhận yêu cầu nhắc, không chứng minh thông báo đã giao.'
          : 'Đóng quỹ là chỉ đọc, không có mở lại. Xác nhận chỉ áp dụng cho snapshot của đợt chốt này.'
      }
      definition={{
        kind,
        actorId: actor,
        tripId: trip.id,
        fundId: fund.id,
        ...(entry ? { resourceId: entry.id } : {}),
        body:
          kind === 'closure-create'
            ? { expected_finance_version: fund.finance_version }
            : kind === 'closure-confirm'
              ? { snapshot_hash: entry!.snapshot_hash }
              : {},
      }}
    />
  );
  return (
    <section aria-label="Đợt chốt quỹ" className={styles.panel}>
      <p>
        Finance {fund.status}. CLOSED chỉ đọc, không có mở lại. Backend kiểm tra số dư bằng 0 và các
        nghĩa vụ còn lại trước khi chốt.
      </p>
      {owner && fund.status === 'OPEN' && action('closure-create', 'Bắt đầu chốt quỹ')}
      {list.isPending && <p role="status">Đang tải đợt chốt…</p>}
      {list.isError && (
        <ContentState
          state="error"
          error={toDomainError(list.error)}
          onRetry={() => void list.refetch()}
        />
      )}
      {list.data?.pages.every((p) => !p.items.length) && <p>Chưa có đợt chốt.</p>}
      {list.data?.pages
        .flatMap((p) => p.items)
        .map((item) => (
          <article key={item.id} className={styles.record}>
            <h3>
              {labels[item.status]} ·{' '}
              {new Date(item.requested_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}
            </h3>
            <p>
              Snapshot phiên bản {item.snapshot_finance_version} · Người yêu cầu:{' '}
              {name(item.requested_by_user_id)}
            </p>
            <Button
              onClick={() => {
                setSelected(item.id);
                setReviewed('');
              }}
            >
              Xem snapshot · {item.id.slice(0, 8)}
            </Button>
          </article>
        ))}
      {list.hasNextPage && (
        <Button disabled={list.isFetching} onClick={() => void list.fetchNextPage()}>
          Tải thêm đợt chốt
        </Button>
      )}
      <Button
        disabled={list.isFetching}
        onClick={() => {
          void list.refetch();
          if (selected) void detail.refetch();
        }}
      >
        Tải lại đợt chốt
      </Button>
      {selected && detail.isPending && <p role="status">Đang tải snapshot…</p>}
      {selected && detail.isError && (
        <ContentState
          state="error"
          error={toDomainError(detail.error)}
          onRetry={() => void detail.refetch()}
        />
      )}
      {row && (
        <section aria-label="Chi tiết snapshot" className={styles.record}>
          <h3>
            {labels[row.status]} · Snapshot v{row.snapshot_finance_version}
          </h3>
          <p>Mã đối chiếu: {row.snapshot_hash}</p>
          <p>
            Số dư chốt: {row.snapshot.fund.current_balance} VND · Ngân sách:{' '}
            {row.snapshot.fund.budget_amount ?? 'Chưa đặt'} · Holder:{' '}
            {name(row.snapshot.fund.holder_user_id)}
          </p>
          {row.cancelled_reason && <p>Lý do hủy: {row.cancelled_reason}</p>}
          <h4>Người cần xác nhận snapshot này</h4>
          <ul>
            {row.confirmations.map((c) => (
              <li key={c.user_id}>
                {name(c.user_id)}:{' '}
                {c.confirmed_at
                  ? `Đã xác nhận ${new Date(c.confirmed_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}`
                  : 'Chưa xác nhận'}
              </li>
            ))}
          </ul>
          {Object.entries(row.snapshot.records).map(([group, records]) => (
            <details key={group}>
              <summary>
                {groupLabels[group]} ({records.length})
              </summary>
              {!records.length && <p>Không có bản ghi.</p>}
              {records.map((record, i) => (
                <dl key={i} className={styles.details}>
                  {Object.entries(record).map(([key, value]) => (
                    <Fragment key={key}>
                      <dt>{key}</dt>
                      <dd>{value === null ? '—' : String(value)}</dd>
                    </Fragment>
                  ))}
                </dl>
              ))}
            </details>
          ))}
          {fund.status === 'CLOSING' && row.status === 'PENDING_CONFIRMATIONS' && (
            <>
              {row.confirmations.some((c) => c.user_id === actor && !c.confirmed_at) && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewed === row.id + row.snapshot_hash}
                      onChange={(e) =>
                        setReviewed(e.target.checked ? row.id + row.snapshot_hash : '')
                      }
                    />{' '}
                    Tôi đã xem snapshot và danh sách xác nhận của đợt chốt này
                  </label>
                  {action(
                    'closure-confirm',
                    'Xác nhận snapshot',
                    row,
                    reviewed !== row.id + row.snapshot_hash,
                  )}
                </>
              )}
              {owner && (
                <div className={styles.actions}>
                  {action('closure-cancel', 'Hủy đợt chốt', row)}
                  {action('closure-remind', 'Yêu cầu nhắc xác nhận', row)}
                </div>
              )}
              <p>Yêu cầu nhắc được tiếp nhận không đồng nghĩa thông báo đã được giao.</p>
            </>
          )}
        </section>
      )}
    </section>
  );
}
