import { useInfiniteQuery } from '@tanstack/react-query';
import type { FundRuntime } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type { MembershipViewModel } from '../../members/model/members';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';
const actions: Record<string, string> = {
  ENABLE_FUND: 'Bật quỹ',
  UPDATE_FUND_BUDGET: 'Sửa ngân sách',
  CREATE_PAYMENT_DESTINATION: 'Thêm tài khoản nhận',
  UPDATE_PAYMENT_DESTINATION: 'Sửa tài khoản nhận',
  CONFIRM_PAYMENT_DESTINATION: 'Xác nhận tài khoản nhận',
  CREATE_CONTRIBUTION_REQUEST: 'Tạo đợt thu',
  UPDATE_CONTRIBUTION_REQUEST: 'Sửa đợt thu',
  UPDATE_CONTRIBUTION_AMOUNT: 'Sửa số tiền đóng góp',
  WAIVE_CONTRIBUTION: 'Miễn khoản đóng',
  CANCEL_CONTRIBUTION: 'Hủy khoản đóng',
  REPORT_TRANSFER: 'Báo đã chuyển khoản',
  CONFIRM_RECEIVED: 'Xác nhận đã nhận tiền',
  REJECT_TRANSFER: 'Từ chối báo chuyển',
  REVERSE_CONTRIBUTION: 'Đảo khoản đóng',
  CREATE_EXPENSE: 'Tạo khoản chi',
  UPDATE_EXPENSE: 'Sửa khoản chi',
  DELETE_EXPENSE: 'Xóa nháp khoản chi',
  SUBMIT_EXPENSE: 'Gửi đề nghị chi',
  WITHDRAW_EXPENSE: 'Rút đề nghị chi',
  CONFIRM_EXPENSE: 'Xác nhận khoản chi',
  REJECT_EXPENSE: 'Từ chối khoản chi',
  REVERSE_EXPENSE: 'Đảo khoản chi',
  CREATE_FINANCIAL_NOTE: 'Thêm ghi chú ngoài quỹ',
  UPDATE_FINANCIAL_NOTE: 'Sửa ghi chú ngoài quỹ',
  DELETE_FINANCIAL_NOTE: 'Xóa ghi chú ngoài quỹ',
  CREATE_REFUND: 'Tạo hoàn tiền',
  ASSIGN_REFUND_VERIFIER: 'Chỉ định người kiểm chứng hoàn tiền',
  REPORT_REFUND_PAID: 'Báo đã hoàn tiền',
  CONFIRM_REFUND_RECEIVED: 'Xác nhận đã nhận hoàn tiền',
  CONFIRM_REFUND_NONRECEIPT: 'Báo chưa nhận hoàn tiền',
  CANCEL_REFUND: 'Hủy hoàn tiền',
  REQUEST_REFUND_REVERSAL: 'Yêu cầu đảo hoàn tiền',
  CONSENT_REFUND_REVERSAL: 'Đồng ý đảo hoàn tiền',
  REVERSE_REFUND: 'Đảo hoàn tiền',
  CREATE_HOLDER_HANDOVER: 'Đề cử người giữ quỹ mới',
  ACCEPT_HOLDER_HANDOVER: 'Nhận đề cử giữ quỹ',
  REFRESH_HOLDER_HANDOVER: 'Cập nhật bản chốt bàn giao',
  CONFIRM_HOLDER_HANDOVER: 'Xác nhận bàn giao quỹ',
  CANCEL_HOLDER_HANDOVER: 'Hủy bàn giao quỹ',
  CREATE_CLOSURE: 'Bắt đầu chốt quỹ',
  CONFIRM_CLOSURE: 'Xác nhận bản tổng kết',
  CANCEL_CLOSURE: 'Hủy đợt chốt',
  REMIND_CLOSURE: 'Nhắc xác nhận chốt quỹ',
  CREATE_PAYMENT_ATTEMPT: 'Tạo lượt thanh toán trực tuyến',
  RECONCILE_PAYMENT_ATTEMPT: 'Đối soát thanh toán',
  RESOLVE_PAYMENT_EXCEPTION: 'Xử lý ngoại lệ thanh toán',
  CONFIRM_PROVIDER_PAYMENT: 'Ghi nhận thanh toán từ cổng',
  CONFIRM_BANK_TRANSFER: 'Tự xác nhận tiền về ngân hàng',
  LEAVE_MEMBER: 'Thành viên rời chuyến',
  REMOVE_MEMBER: 'Xóa thành viên',
};
const systemActors: Record<string, string> = {
  MOMO_IPN: 'Thông báo từ MoMo',
  MOMO_RECONCILIATION: 'Đối soát MoMo tự động',
  'BANK_WEBHOOK:SEPAY': 'Ngân hàng (SePay) báo tiền về',
  PAYOS_WEBHOOK: 'payOS báo tiền về',
  PAYOS_RECONCILIATION: 'Đối soát payOS tự động',
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
                  ? `Hệ thống · ${systemActors[row.system_actor] ?? row.system_actor}`
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
