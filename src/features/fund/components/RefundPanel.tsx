import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { FundRuntime, RuntimeFund, Refund } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { MembershipViewModel } from '../../members/model/members';
import type { FinanceCommandKind } from '../../../shared/types/operations';
import { FinanceAction, type FinanceField } from './FinanceAction';
import { Button } from '../../../shared/components/Button';
import { Select } from '../../../shared/components/Select';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';
const labels: Record<Refund['status'], string> = {
  PENDING: 'Chờ Holder chuyển',
  HOLDER_REPORTED: 'Chờ người nhận xác nhận / đối chiếu',
  CONFIRMED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
  REVERSED: 'Đã đảo',
};
export function RefundPanel({
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
  const [status, setStatus] = useState<Refund['status'] | ''>('');
  const actor = trip.currentMembership.userId,
    owner = trip.currentMembership.role === 'OWNER',
    holder = actor === fund.holder_user_id;
  const session = runtime.commands.forScope(actor, trip.id);
  const query = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'refunds', fund.id, status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      runtime.refunds!(fund.id, pageParam, signal, status || undefined),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const name = (id: string) =>
    members.find((m) => m.userId === id)?.presentation.displayName ?? `User ${id.slice(0, 8)}`;
  const action = (kind: FinanceCommandKind, label: string, row?: Refund) => {
    const fields: FinanceField[] =
      kind === 'refund-create'
        ? [
            {
              key: 'member_user_id',
              label: 'Người nhận hoàn tiền',
              required: true,
              options: members
                .filter((m) => m.leftAt === null)
                .map((m) => ({ value: m.userId, label: name(m.userId) })),
            },
            { key: 'amount', label: 'Số tiền hoàn VND', required: true },
            { key: 'reason', label: 'Lý do hoàn tiền', required: true },
          ]
        : [
              'refund-confirm-nonreceipt',
              'refund-cancel',
              'refund-request-reversal',
              'refund-reverse',
            ].includes(kind)
          ? [
              {
                key: 'reason',
                label:
                  kind === 'refund-reverse'
                    ? 'Nhập lại đúng lý do đã yêu cầu đảo'
                    : 'Lý do thao tác',
                required: true,
              },
            ]
          : [];
    return (
      <FinanceAction
        key={kind}
        label={label}
        session={session}
        disabled={blocked || query.isFetching || query.isError}
        fields={fields}
        description={
          kind === 'refund-reverse'
            ? 'API chưa trả lại lý do yêu cầu đảo. Nhập đúng lý do đã gửi trước đó; không dùng lý do hoàn tiền ban đầu. Sai lý do sẽ bị backend từ chối.'
            : 'Không tự chuyển tiền hoặc giải phóng khoản giữ. Chỉ xác nhận việc đã thực sự kiểm tra trong dữ liệu TEST.'
        }
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
    <section className={styles.panel} aria-label="Quy trình hoàn tiền">
      <p>
        Khoản giữ hoàn tiền: {fund.reserved_refund} VND · Số dư khả dụng: {fund.available_balance}{' '}
        VND (theo backend).
      </p>
      {owner && action('refund-create', 'Tạo phương án hoàn tiền')}
      {loadMoreMembers && (
        <Button disabled={blocked} onClick={loadMoreMembers}>
          Tải thêm người nhận
        </Button>
      )}
      <Select
        label="Trạng thái hoàn tiền"
        value={status}
        onChange={(e) => setStatus(e.target.value as Refund['status'] | '')}
      >
        <option value="">Tất cả</option>
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {query.isPending && <p role="status">Đang tải hoàn tiền…</p>}
      {query.isError && (
        <ContentState
          state="error"
          error={toDomainError(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data?.pages.every((p) => !p.items.length) && <p>Chưa có khoản hoàn tiền phù hợp.</p>}
      {query.data?.pages
        .flatMap((p) => p.items)
        .map((row) => (
          <article
            key={row.id}
            className={styles.record}
            aria-label={'Hoàn tiền ' + name(row.member_user_id)}
          >
            <h3>
              {name(row.member_user_id)} · {row.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫
            </h3>
            <p>{labels[row.status]}</p>
            <p>Lý do hoàn tiền: {row.reason}</p>
            {row.nonreceipt_confirmed_at && (
              <p>
                Người nhận báo chưa nhận tiền. Chờ đối chiếu; Web không tự giải phóng khoản giữ.
              </p>
            )}
        {row.reversal_requested_at && (
              <p>
                {row.reversal_consented_at
                  ? 'Người nhận đã đồng ý đảo'
                  : 'Đã yêu cầu đảo, chờ người nhận đồng ý'}
              </p>
            )}
            {row.member_user_id === fund.holder_user_id && (
              <p>Người nhận cũng là Holder. Backend hiện chưa có kiểm chứng độc lập theo SRS.</p>
            )}
            <p>
              Cập nhật:{' '}
              {new Date(row.updated_at).toLocaleString('vi-VN', { timeZone: trip.timezone })} ·
              Phiên bản {row.version}
            </p>
            <div className={styles.actions}>
              {holder &&
                row.status === 'PENDING' &&
                action('refund-report-paid', 'Báo đã hoàn TEST', row)}
              {actor === row.member_user_id && row.status === 'HOLDER_REPORTED' && (
                <>
                  {action('refund-confirm-received', 'Xác nhận nhận hoàn tiền', row)}
                  {!row.nonreceipt_confirmed_at &&
                    action('refund-confirm-nonreceipt', 'Báo chưa nhận hoàn tiền', row)}
                </>
              )}
              {owner &&
                (row.status === 'PENDING' ||
                  (row.status === 'HOLDER_REPORTED' && row.nonreceipt_confirmed_at)) &&
                action('refund-cancel', 'Hủy hoàn tiền', row)}
              {holder &&
                row.status === 'CONFIRMED' &&
                !row.reversal_requested_at &&
                action('refund-request-reversal', 'Yêu cầu đảo hoàn tiền', row)}
              {actor === row.member_user_id &&
                row.status === 'CONFIRMED' &&
                row.reversal_requested_at &&
                !row.reversal_consented_at &&
                action('refund-consent-reversal', 'Đồng ý đảo hoàn tiền', row)}
              {holder &&
                row.status === 'CONFIRMED' &&
                row.reversal_requested_at &&
                row.reversal_consented_at &&
                action('refund-reverse', 'Đảo hoàn tiền', row)}
            </div>
          </article>
        ))}
      {query.hasNextPage && (
        <Button disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
          Tải thêm hoàn tiền
        </Button>
      )}
      <Button variant="plain" disabled={query.isFetching} onClick={() => void query.refetch()}>
        Tải lại hoàn tiền
      </Button>
    </section>
  );
}
