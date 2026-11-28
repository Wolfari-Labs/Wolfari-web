import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FundRuntime, RuntimeFund, BankTransfer } from '../model/runtime-fund';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { FinanceAction } from './FinanceAction';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';

const statusLabels: Record<BankTransfer['processing_status'], string> = {
  MATCHED: 'Đã tự khớp',
  UNMATCHED: 'Chưa khớp',
  NEEDS_REVIEW: 'Cần xử lý',
  IGNORED: 'Đã bỏ qua',
  RESOLVED: 'Đã xử lý',
};
const reasonLabels: Record<string, string> = {
  OUTGOING: 'Giao dịch chuyển ra',
  NO_REFERENCE: 'Không có mã tham chiếu',
  UNKNOWN_REFERENCE: 'Không tìm thấy mã tham chiếu',
  MULTIPLE_REFERENCES: 'Có nhiều mã tham chiếu',
  ACCOUNT_MISMATCH: 'Sai tài khoản nhận',
  AMOUNT_MISMATCH: 'Sai số tiền',
  CONTRIBUTION_NOT_PAYABLE: 'Khoản đóng góp không còn phải thu',
  ALREADY_CONFIRMED: 'Khoản đóng góp đã xác nhận',
  FUND_NOT_OPEN: 'Quỹ không còn mở',
  VERSION_LIMIT: 'Không thể khớp do phiên bản',
};

export function BankTransferPanel({
  runtime,
  fund,
  trip,
  blocked,
}: {
  runtime: FundRuntime;
  fund: RuntimeFund;
  trip: TripDetailViewModel;
  blocked: boolean;
}) {
  const actor = trip.currentMembership.userId;
  const holder = fund.holder_user_id === actor;
  const canList = holder || trip.currentMembership.role === 'OWNER';
  const session = runtime.commands.forScope(actor, trip.id);
  const operation = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const transfers = useQuery({
    queryKey: ['finance', actor, trip.id, 'bank-transfers', fund.id],
    enabled: !!runtime.bankTransfers && canList,
    queryFn: ({ signal }) => runtime.bankTransfers!(fund.id, signal),
  });

  const reload = () => void transfers.refetch();
  if (!runtime.bankTransfers) {
    return <p>Đối soát chuyển khoản ngân hàng chưa khả dụng trong chế độ dữ liệu hiện tại.</p>;
  }
  if (!canList) return <p>Chỉ Owner chuyến đi hoặc Fund Holder có thể xem đối soát ngân hàng.</p>;
  return (
    <section className={styles.panel} aria-label="Đối soát chuyển khoản ngân hàng">
      <p>
        Các giao dịch do SePay ghi nhận được che số tài khoản. Chỉ Fund Holder có thể ghi nhận cách
        xử lý giao dịch cần xem xét; thao tác này không tự tạo bút toán.
      </p>
      {transfers.isPending && <p role="status">Đang tải chuyển khoản…</p>}
      {transfers.isError && (
        <ContentState
          state="error"
          error={toDomainError(transfers.error)}
          onRetry={reload}
        />
      )}
      {transfers.data && !transfers.data.length && <p>Chưa có giao dịch ngân hàng được ghi nhận.</p>}
      {transfers.data?.map((transfer) => {
        const reviewable =
          transfer.processing_status === 'NEEDS_REVIEW' && fund.status === 'OPEN';
        return (
          <article key={transfer.id} className={styles.record}>
            <h3>
              {statusLabels[transfer.processing_status]} · {transfer.amount} VND
            </h3>
            <dl className={styles.details}>
              <dt>Nhà cung cấp</dt>
              <dd>{transfer.provider} · {transfer.bank_gateway}</dd>
              <dt>Loại</dt>
              <dd>{transfer.transfer_type === 'IN' ? 'Tiền vào' : 'Tiền ra'}</dd>
              <dt>Tài khoản</dt>
              <dd>{transfer.account_number_masked}</dd>
              <dt>Nội dung</dt>
              <dd>{transfer.content}</dd>
              <dt>Lý do xem xét</dt>
              <dd>{transfer.review_reason ? reasonLabels[transfer.review_reason] ?? transfer.review_reason : '—'}</dd>
              <dt>Nhận lúc</dt>
              <dd>{new Date(transfer.received_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}</dd>
              {transfer.resolution && (
                <>
                  <dt>Kết quả</dt>
                  <dd>{transfer.resolution}</dd>
                  <dt>Ghi chú xử lý</dt>
                  <dd>{transfer.resolution_note}</dd>
                </>
              )}
            </dl>
            {reviewable && holder && (
              <FinanceAction
                label="Ghi nhận cách xử lý"
                session={session}
                disabled={blocked || operation.busy || operation.state === 'NEEDS_REVIEW'}
                fields={[
                  {
                    key: 'resolution',
                    label: 'Kết quả xử lý',
                    required: true,
                    options: [
                      { value: 'RETURNED_TO_SENDER', label: 'Đã chuyển trả người gửi' },
                      { value: 'HANDLED_IN_APP', label: 'Đã xử lý bằng thao tác trong ứng dụng' },
                      { value: 'NOT_OURS', label: 'Không thuộc quỹ này' },
                    ],
                  },
                  { key: 'note', label: 'Ghi chú', required: true, maxLength: 500 },
                ]}
                definition={{
                  kind: 'bank-transfer-resolve',
                  actorId: actor,
                  tripId: trip.id,
                  fundId: fund.id,
                  resourceId: transfer.id,
                  body: { expected_finance_version: fund.finance_version },
                }}
                description="Ghi nhận kết quả đối soát với cùng mã yêu cầu khi cần thử lại."
              />
            )}
          </article>
        );
      })}
      <Button variant="outline" disabled={transfers.isFetching} onClick={reload}>
        Tải lại chuyển khoản
      </Button>
    </section>
  );
}
