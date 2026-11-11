import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Expense, FundRuntime, RuntimeFund } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { FinanceAction, type FinanceField } from './FinanceAction';
import type { FinanceCommandKind } from '../../../shared/types/operations';
import { Button } from '../../../shared/components/Button';
import { Select } from '../../../shared/components/Select';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';

const statuses = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Chờ xác nhận',
  CONFIRMED: 'Đã ghi sổ',
  REJECTED: 'Đã từ chối',
  REVERSED: 'Đã đảo',
};
export function ExpensePanel({
  runtime,
  fund,
  trip,
  blocked,
  name,
}: {
  runtime: FundRuntime;
  fund: RuntimeFund;
  trip: TripDetailViewModel;
  blocked: boolean;
  name: (id: string) => string;
}) {
  const actor = trip.currentMembership.userId,
    owner = trip.currentMembership.role === 'OWNER',
    holder = actor === fund.holder_user_id;
  const session = runtime.commands.forScope(actor, trip.id);
  const [status, setStatus] = useState<Expense['status'] | ''>('');
  const query = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'expenses', fund.id, status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      runtime.expenses!(fund.id, pageParam, signal, status || undefined),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const action = (
    kind: FinanceCommandKind,
    label: string,
    row?: Expense,
    fields?: FinanceField[],
  ) => (
    <FinanceAction
      label={label}
      session={session}
      disabled={blocked || query.isFetching || query.isError}
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
      {...(fields ? { fields } : {})}
    />
  );
  const editFields = (row?: Expense): FinanceField[] => [
    {
      key: 'title',
      label: 'Tên khoản chi',
      required: true,
      maxLength: 200,
      initial: row?.title ?? '',
    },
    { key: 'amount', label: 'Số tiền VND', required: true, initial: row?.amount ?? '' },
    { key: 'description', label: 'Mô tả', maxLength: 10000, initial: row?.description ?? '' },
    { key: 'category', label: 'Danh mục', maxLength: 80, initial: row?.category ?? '' },
  ];
  return (
    <section aria-label="Danh sách khoản chi" className={styles.panel}>
      <p>
        Đề nghị và bản nháp chưa trừ số dư. Chỉ người giữ quỹ xác nhận ghi sổ; không xóa giao dịch
        đã ghi sổ.
      </p>
      {action('expense-create', 'Tạo đề nghị chi', undefined, editFields())}
      <Select
        label="Lọc trạng thái khoản chi"
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
      >
        <option value="">Tất cả</option>
        {Object.entries(statuses).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
      {query.isPending && <p role="status">Đang tải khoản chi…</p>}
      {query.isError && (
        <ContentState
          state="error"
          headingLevel={2}
          error={toDomainError(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.pages.every((p) => !p.items.length) && <p>Chưa có khoản chi.</p>}
      {query.data?.pages
        .flatMap((p) => p.items)
        .map((row) => (
          <article key={row.id} className={styles.record} aria-label={row.title}>
            <h3>{row.title}</h3>
            <p>
              {row.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫ · {statuses[row.status]}
            </p>
            <p>
              Người đề nghị: {name(row.created_by_user_id)} ·{' '}
              {new Date(row.created_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}
            </p>
            {row.description && <p>{row.description}</p>}
            {row.rejected_reason && <p>Lý do: {row.rejected_reason}</p>}
            <div className={styles.actions}>
              {row.status === 'DRAFT' && (owner || actor === row.created_by_user_id) && (
                <>
                  {action('expense-edit', 'Sửa nháp', row, editFields(row))}
                  {action('expense-delete', 'Xóa nháp', row)}
                  {action('expense-submit', 'Gửi đề nghị', row)}
                </>
              )}
              {row.status === 'SUBMITTED' &&
                actor === row.created_by_user_id &&
                action('expense-withdraw', 'Rút đề nghị', row)}
              {row.status === 'SUBMITTED' && holder && (
                <>
                  {action('expense-confirm', 'Xác nhận khoản chi', row, [
                    {
                      key: 'paid_at',
                      label: 'Thời điểm chi (giờ máy)',
                      type: 'datetime-local',
                      required: true,
                    },
                    {
                      key: 'payment_method',
                      label: 'Phương thức chi',
                      required: true,
                      maxLength: 30,
                    },
                  ])}
                  {action('expense-reject', 'Từ chối khoản chi', row, [
                    { key: 'reason', label: 'Lý do', required: true, maxLength: 1024 },
                  ])}
                </>
              )}
              {row.status === 'CONFIRMED' &&
                holder &&
                action('expense-reverse', 'Đảo khoản chi', row, [
                  { key: 'reason', label: 'Lý do', required: true, maxLength: 1024 },
                ])}
            </div>
          </article>
        ))}
      {query.hasNextPage && (
        <Button disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
          Tải thêm khoản chi
        </Button>
      )}
      <Button variant="plain" disabled={query.isFetching} onClick={() => void query.refetch()}>
        Tải lại khoản chi
      </Button>
    </section>
  );
}
