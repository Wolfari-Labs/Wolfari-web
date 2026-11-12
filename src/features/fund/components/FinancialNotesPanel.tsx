import { useInfiniteQuery } from '@tanstack/react-query';
import type { FinancialNote, FundRuntime, RuntimeFund } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { MembershipViewModel } from '../../members/model/members';
import { FinanceAction, type FinanceField } from './FinanceAction';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';
export function FinancialNotesPanel({
  runtime,
  fund,
  trip,
  blocked,
  members,
  loadMoreMembers,
}: {
  runtime: FundRuntime;
  fund: RuntimeFund;
  trip: TripDetailViewModel;
  blocked: boolean;
  members: readonly MembershipViewModel[];
  loadMoreMembers?: (() => void) | undefined;
}) {
  const actor = trip.currentMembership.userId,
    session = runtime.commands.forScope(actor, trip.id);
  const query = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'notes', fund.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => runtime.notes!(fund.id, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const name = (id: string) =>
    members.find((m) => m.userId === id)?.presentation.displayName ?? `User ${id.slice(0, 8)}`;
  const action = (
    kind: 'note-create' | 'note-edit' | 'note-delete',
    label: string,
    row?: FinancialNote,
  ) => {
    const fields: FinanceField[] =
      kind === 'note-delete'
        ? []
        : [
            {
              key: 'description',
              label: 'Nội dung chi ngoài quỹ',
              required: true,
              initial: row?.description ?? '',
            },
            { key: 'amount', label: 'Số tiền VND (không bắt buộc)', initial: row?.amount ?? '' },
            {
              key: 'payer_user_id',
              label: 'Người chi',
              initial: row?.payer_user_id ?? '',
              options: members
                .filter((m) => m.leftAt === null)
                .map((m) => ({ value: m.userId, label: name(m.userId) })),
            },
          ];
    return (
      <FinanceAction
        label={label}
        session={session}
        disabled={blocked || query.isFetching || query.isError}
        fields={fields}
        description="Ghi chú không trừ số dư, không tạo công nợ hoặc yêu cầu hoàn ứng."
        definition={{
          kind,
          actorId: actor,
          tripId: trip.id,
          fundId: fund.id,
          ...(row ? { resourceId: row.id } : {}),
          body: {
            expected_finance_version: fund.finance_version,
            ...(row ? { expected_version: row.version } : {}),
          },
        }}
      />
    );
  };
  return (
    <section aria-label="Ghi chú ngoài quỹ" className={styles.panel}>
      <p>Không làm thay đổi số dư quỹ. Không phải công nợ hoặc yêu cầu hoàn ứng.</p>
      {action('note-create', 'Thêm chi ngoài quỹ')}
      {loadMoreMembers && (
        <Button disabled={blocked} onClick={loadMoreMembers}>
          Tải thêm thành viên để chọn người chi
        </Button>
      )}
      {query.isPending && <p role="status">Đang tải ghi chú…</p>}
      {query.isError && (
        <ContentState
          state="error"
          error={toDomainError(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data?.pages.every((p) => !p.items.length) && <p>Chưa có ghi chú ngoài quỹ.</p>}
      {query.data?.pages
        .flatMap((p) => p.items)
        .map((row) => (
          <article className={styles.record} key={row.id} aria-label={row.description}>
            <h3>{row.description}</h3>
            <p>
              {row.amount === null
                ? 'Chưa ghi số tiền'
                : row.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫'}
            </p>
            <p>Người chi: {row.payer_user_id ? name(row.payer_user_id) : 'Chưa xác định'}</p>
            <p>
              Người ghi: {name(row.created_by_user_id)} ·{' '}
              {new Date(row.updated_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}
            </p>
            {(trip.currentMembership.role === 'OWNER' || actor === row.created_by_user_id) && (
              <div className={styles.actions}>
                {action('note-edit', 'Sửa ghi chú', row)}
                {action('note-delete', 'Xóa ghi chú', row)}
              </div>
            )}
          </article>
        ))}
      {query.hasNextPage && (
        <Button disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
          Tải thêm ghi chú
        </Button>
      )}
      <Button variant="plain" disabled={query.isFetching} onClick={() => void query.refetch()}>
        Tải lại ghi chú
      </Button>
    </section>
  );
}
