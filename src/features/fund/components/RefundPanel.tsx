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
import { Badge } from '../../../shared/components/Ui';
import styles from './FinanceRecords.module.css';
import { canOfferRefundVerifier, isRefundConfirmationCandidate } from '../model/refund-candidates';
const vnd = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
const tones: Record<Refund['status'], 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  HOLDER_REPORTED: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
  REVERSED: 'neutral',
};
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
  const active = members.filter((m) => m.leftAt === null);
  const modeLabel: Record<NonNullable<Refund['confirmation_mode']>, string> = {
    RECIPIENT: 'Người nhận tự xác nhận',
    OWNER: 'Chủ chuyến kiểm chứng thay người nhận (người nhận là người giữ quỹ)',
    ASSIGNED_MEMBER: 'Thành viên được chỉ định kiểm chứng độc lập',
    SELF_UNVERIFIED: 'Tự xác nhận — chuyến chỉ có một thành viên, không có kiểm chứng độc lập',
  };
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
        : kind === 'refund-assign-verifier'
          ? [
              {
                key: 'verifier_user_id',
                label: 'Người kiểm chứng',
                required: true,
                ...(row?.verifier_user_id ? { initial: row.verifier_user_id } : {}),
                options: active
                  .filter((m) => m.userId !== row?.member_user_id)
                  .map((m) => ({ value: m.userId, label: name(m.userId) })),
              },
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
                      ? 'Lý do đảo (đã yêu cầu trước đó)'
                      : 'Lý do thao tác',
                  required: true,
                  ...(kind === 'refund-reverse' && row?.reversal_reason
                    ? { initial: row.reversal_reason }
                    : {}),
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
            ? row?.reversal_reason
              ? 'Lý do đảo được điền sẵn từ yêu cầu đảo mà người nhận đã đồng ý; giữ nguyên để backend chấp nhận.'
              : 'Nhập đúng lý do đã gửi khi yêu cầu đảo; không dùng lý do hoàn tiền ban đầu.'
            : kind === 'refund-assign-verifier'
              ? 'Người nhận đồng thời là chủ chuyến và người giữ quỹ, nên một thành viên khác phải kiểm chứng việc đã hoàn tiền.'
              : 'Không tự chuyển tiền hoặc giải phóng khoản giữ. Chỉ xác nhận việc đã thực sự kiểm tra.'
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
        Đang giữ cho hoàn tiền: <strong>{vnd(fund.reserved_refund)}</strong> · Có thể chi:{' '}
        <strong>{vnd(fund.available_balance)}</strong>
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
              {name(row.member_user_id)} · {vnd(row.amount)}
            </h3>
            <p>
              <Badge tone={tones[row.status]}>{labels[row.status]}</Badge>
            </p>
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
                {row.reversal_reason ? ` · Lý do đảo: ${row.reversal_reason}` : ''}
              </p>
            )}
            {(row.status === 'PENDING' || row.status === 'HOLDER_REPORTED') && (
              <p>
                Hệ thống kiểm tra quyền theo người đã trả tiền và thành viên hiện tại khi xác nhận,
                kể cả sau bàn giao quỹ. Người trả không tự kiểm chứng khi có người khác đủ điều
                kiện.
                {row.verifier_user_id &&
                  ` Người kiểm chứng được chỉ định: ${name(row.verifier_user_id)}.`}
              </p>
            )}
            {row.confirmation_mode && (
              <p>
                Cách xác nhận: {modeLabel[row.confirmation_mode]}
                {row.confirmed_by_user_id ? ` · ${name(row.confirmed_by_user_id)}` : ''}
              </p>
            )}
            <p>
              Cập nhật:{' '}
              {new Date(row.updated_at).toLocaleString('vi-VN', { timeZone: trip.timezone })} ·
              Phiên bản {row.version}
            </p>
            <div className={styles.actions}>
              {holder &&
                row.status === 'PENDING' &&
                action('refund-report-paid', 'Báo đã hoàn tiền', row)}
              {canOfferRefundVerifier(row, actor, owner) &&
                active.some((m) => m.userId !== row.member_user_id) &&
                action(
                  'refund-assign-verifier',
                  row.verifier_user_id ? 'Đổi người kiểm chứng' : 'Chỉ định người kiểm chứng',
                  row,
                )}
              {isRefundConfirmationCandidate(row, actor, owner) &&
                action(
                  'refund-confirm-received',
                  actor === row.member_user_id
                    ? 'Xác nhận nhận hoàn tiền'
                    : 'Xác nhận đã hoàn tiền (kiểm chứng)',
                  row,
                )}
              {actor === row.member_user_id &&
                row.status === 'HOLDER_REPORTED' &&
                !row.nonreceipt_confirmed_at &&
                action('refund-confirm-nonreceipt', 'Báo chưa nhận hoàn tiền', row)}
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
