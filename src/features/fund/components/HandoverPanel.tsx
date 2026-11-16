import { useQuery } from '@tanstack/react-query';
import type { FundRuntime, HolderHandover, RuntimeFund } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { MembershipViewModel } from '../../members/model/members';
import type { FinanceCommandKind } from '../../../shared/types/operations';
import { FinanceAction, type FinanceField } from './FinanceAction';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';

const statusLabels: Record<HolderHandover['status'], string> = {
  NOMINATED: 'Đã đề cử, chờ người được đề cử đồng ý',
  ACCEPTED: 'Đã đồng ý, chờ hai bên xác nhận bàn giao',
  COMPLETED: 'Đã hoàn tất bàn giao',
  CANCELLED: 'Đã hủy',
};
const vnd = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';

/**
 * FR-FN06 Holder handover: Owner nominates → nominee accepts (snapshot frozen) → old and new
 * Holder both confirm the same snapshot → backend switches the Holder. Any Finance change after
 * acceptance makes the snapshot stale; someone refreshes it and both confirm again.
 * Money is handed over outside the app; Wolfari records responsibility, it never moves funds.
 */
export function HandoverPanel({
  runtime,
  fund,
  trip,
  members,
  blocked,
}: {
  runtime: FundRuntime;
  fund: RuntimeFund;
  trip: TripDetailViewModel;
  members: readonly MembershipViewModel[];
  blocked: boolean;
}) {
  const actor = trip.currentMembership.userId,
    owner = trip.currentMembership.role === 'OWNER';
  const session = runtime.commands.forScope(actor, trip.id);
  const query = useQuery({
    queryKey: ['finance', actor, trip.id, 'handovers', fund.id],
    queryFn: ({ signal }) => runtime.handovers!(fund.id, signal),
  });
  const name = (id: string) =>
    members.find((m) => m.userId === id)?.presentation.displayName ?? `User ${id.slice(0, 8)}`;
  const rows = query.data ?? [];
  const active = rows.find((row) => row.status === 'NOMINATED' || row.status === 'ACCEPTED');
  const open = fund.status === 'OPEN';
  const action = (
    kind: FinanceCommandKind,
    label: string,
    row?: HolderHandover,
    fields: FinanceField[] = [],
    description?: string,
  ) => (
    <FinanceAction
      key={kind}
      label={label}
      session={session}
      disabled={blocked || !open || query.isFetching || query.isError}
      fields={fields}
      {...(description ? { description } : {})}
      definition={{
        kind,
        actorId: actor,
        tripId: trip.id,
        fundId: fund.id,
        ...(row ? { resourceId: row.id } : {}),
        body: {
          expected_finance_version: fund.finance_version,
          ...(row ? { expected_version: row.version } : {}),
          ...(kind === 'handover-confirm' && row?.snapshot_finance_version
            ? { expected_snapshot_finance_version: row.snapshot_finance_version }
            : {}),
        },
      }}
    />
  );
  const candidates = members.filter((m) => m.leftAt === null && m.userId !== fund.holder_user_id);
  return (
    <section className={styles.panel} aria-label="Bàn giao người giữ quỹ">
      <p>
        Người giữ quỹ hiện tại: <strong>{name(fund.holder_user_id)}</strong>. Bàn giao chỉ đổi người
        chịu trách nhiệm; tiền được chuyển giữa hai người bên ngoài ứng dụng và số dư sổ quỹ không
        đổi.
      </p>
      {!open && (
        <Alert tone="info">
          Quỹ không còn ở trạng thái mở nên không thể bàn giao người giữ quỹ.
        </Alert>
      )}
      {owner &&
        open &&
        !active &&
        !query.isPending &&
        (candidates.length ? (
          action(
            'handover-create',
            'Đề cử người giữ quỹ mới',
            undefined,
            [
              {
                key: 'new_holder_user_id',
                label: 'Người giữ quỹ mới',
                required: true,
                options: candidates.map((m) => ({ value: m.userId, label: name(m.userId) })),
              },
            ],
            'Người được đề cử phải đồng ý; sau đó cả hai người giữ quỹ cũ và mới cùng xác nhận bản chốt số dư.',
          )
        ) : (
          <p>Cần thêm thành viên khác để có thể bàn giao người giữ quỹ.</p>
        ))}
      {query.isPending && <p role="status">Đang tải bàn giao…</p>}
      {query.isError && (
        <ContentState
          state="error"
          error={toDomainError(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && !rows.length && <p>Chưa có lần bàn giao người giữ quỹ nào.</p>}
      {rows.map((row) => {
        const old = actor === row.old_holder_user_id,
          next = actor === row.new_holder_user_id,
          party = owner || old || next,
          s = row.snapshot;
        return (
          <article
            key={row.id}
            className={styles.record}
            aria-label={`Bàn giao từ ${name(row.old_holder_user_id)} sang ${name(row.new_holder_user_id)}`}
          >
            <h3>
              {name(row.old_holder_user_id)} → {name(row.new_holder_user_id)}
            </h3>
            <p>{statusLabels[row.status]}</p>
            <p>
              Đề cử bởi {name(row.nominated_by_user_id)} ·{' '}
              {new Date(row.created_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}
            </p>
            {s && (
              <dl>
                <div>
                  <dt>Số dư sổ quỹ khi chốt</dt>
                  <dd>{vnd(s.current_balance)}</dd>
                </div>
                <div>
                  <dt>Đang giữ chỗ hoàn tiền</dt>
                  <dd>{vnd(s.reserved_refund)}</dd>
                </div>
                <div>
                  <dt>Có thể chi</dt>
                  <dd>{vnd(s.available_balance)}</dd>
                </div>
                <div>
                  <dt>Việc còn dở chuyển sang người mới</dt>
                  <dd>
                    {s.pending_contribution_ids.length} khoản góp · {s.pending_expense_ids.length}{' '}
                    khoản chi · {s.pending_refund_ids.length} hoàn tiền ·{' '}
                    {s.pending_payment_ids.length + s.pending_payment_exception_ids.length} thanh
                    toán cần đối soát
                  </dd>
                </div>
              </dl>
            )}
            {row.status === 'ACCEPTED' && row.snapshot_stale && (
              <Alert tone="warning">
                Số liệu quỹ đã thay đổi sau khi chốt. Cập nhật bản chốt rồi cả hai bên xác nhận lại.
              </Alert>
            )}
            {row.status === 'ACCEPTED' && !row.snapshot_stale && (
              <p>
                Người giữ quỹ cũ:{' '}
                {row.old_holder_confirmed_at ? 'đã xác nhận bàn giao' : 'chưa xác nhận'} · Người giữ
                quỹ mới: {row.new_holder_confirmed_at ? 'đã xác nhận nhận đủ' : 'chưa xác nhận'}
              </p>
            )}
            {row.status === 'COMPLETED' && row.completed_at && (
              <p>
                Hoàn tất lúc{' '}
                {new Date(row.completed_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}
              </p>
            )}
            {row.status === 'CANCELLED' && row.cancellation_reason && (
              <p>Lý do hủy: {row.cancellation_reason}</p>
            )}
            <div className={styles.actions}>
              {row.status === 'NOMINATED' &&
                next &&
                action(
                  'handover-accept',
                  'Đồng ý nhận giữ quỹ',
                  row,
                  [],
                  'Hệ thống chốt số dư hiện tại; sau đó hai bên giao nhận tiền và cùng xác nhận.',
                )}
              {row.status === 'ACCEPTED' &&
                row.snapshot_stale &&
                party &&
                action('handover-refresh-snapshot', 'Cập nhật bản chốt', row)}
              {row.status === 'ACCEPTED' &&
                !row.snapshot_stale &&
                old &&
                !row.old_holder_confirmed_at &&
                action(
                  'handover-confirm',
                  'Xác nhận đã bàn giao tiền',
                  row,
                  [],
                  `Xác nhận bạn đã giao ${s ? vnd(s.current_balance) : 'số dư'} cho ${name(row.new_holder_user_id)}.`,
                )}
              {row.status === 'ACCEPTED' &&
                !row.snapshot_stale &&
                next &&
                !row.new_holder_confirmed_at &&
                action(
                  'handover-confirm',
                  'Xác nhận đã nhận đủ tiền',
                  row,
                  [],
                  `Xác nhận bạn đã nhận ${s ? vnd(s.current_balance) : 'số dư'} từ ${name(row.old_holder_user_id)}. Khi cả hai bên xác nhận, bạn trở thành người giữ quỹ.`,
                )}
              {(row.status === 'NOMINATED' || row.status === 'ACCEPTED') &&
                party &&
                action(
                  'handover-cancel',
                  'Hủy bàn giao',
                  row,
                  [{ key: 'reason', label: 'Lý do hủy', required: true, maxLength: 1024 }],
                  'Hủy không hoàn tác việc giao tiền đã làm bên ngoài ứng dụng; hai bên tự đối chiếu.',
                )}
            </div>
          </article>
        );
      })}
      <Button variant="plain" disabled={query.isFetching} onClick={() => void query.refetch()}>
        Tải lại bàn giao
      </Button>
    </section>
  );
}
