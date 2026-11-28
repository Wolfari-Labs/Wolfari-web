import { useEffect, useState, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FundRuntime, RuntimeFund } from '../model/runtime-fund';
import {
  isTerminalPayment as terminal,
  paymentErrorText,
  paymentLinkLabel,
  paymentLinkOpen,
  paymentStatusLabel,
  type PaymentAttempt,
} from '../model/payment';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { FinanceAction } from './FinanceAction';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Alert } from '../../../shared/components/Alert';
import { OperationStatus } from '../../../shared/components/OperationStatus';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from './FinanceRecords.module.css';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function PaymentPanel({
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
  const actor = trip.currentMembership.userId,
    holder = actor === fund.holder_user_id;
  const [saved, setSaved] = useState<{ id: string; storageError: boolean }>(() => {
    try {
      if (!runtime.paymentRecovery) throw Error('No recovery storage');
      runtime.paymentRecovery.list(actor, trip.id);
      const id = runtime.paymentRecovery.load(actor, trip.id);
      if (id && !uuid.test(id)) return { id: '', storageError: true };
      return { id, storageError: false };
    } catch {
      return { id: '', storageError: true };
    }
  });
  const [lookup, setLookup] = useState('');
  const [known, setKnown] = useState<Record<string, string>>(() => {
    try {
      return runtime.paymentRecovery?.list(actor, trip.id) ?? {};
    } catch {
      return {};
    }
  });
  const [pollUntil, setPollUntil] = useState(() => Date.now() + 120000);
  const client = useQueryClient();
  const session = runtime.commands.forScope(actor, trip.id);
  const op = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const receipt =
    op.state === 'SUCCEEDED' && op.intent?.kind === 'payment-create'
      ? (op.receipt as PaymentAttempt | null)
      : null;
  const attemptId = receipt?.id ?? saved.id;
  const recoveryNeeded =
    op.state === 'SUCCEEDED' &&
    op.intent?.kind === 'payment-create' &&
    !receipt &&
    !known[op.intent.resourceId ?? ''];
  useEffect(() => {
    if (!receipt?.id) return;
    try {
      if (!runtime.paymentRecovery) throw Error('No recovery storage');
      runtime.paymentRecovery.save(actor, trip.id, receipt.id, receipt.contribution_id);
      setKnown(runtime.paymentRecovery.list(actor, trip.id));
      setSaved({ id: receipt.id, storageError: false });
    } catch {
      setSaved({ id: receipt.id, storageError: true });
    }
    setPollUntil(Date.now() + 120000);
  }, [receipt?.id, runtime, actor, trip.id]);
  const attempt = useQuery({
    queryKey: ['finance', actor, trip.id, 'payment-attempt', attemptId],
    enabled: !!attemptId,
    queryFn: ({ signal }) => runtime.paymentAttempt!(attemptId, signal),
    retry: 1,
    refetchInterval: (query) =>
      Date.now() < pollUntil &&
      !document.hidden &&
      (!query.state.data || !terminal(query.state.data))
        ? 3000
        : false,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (attempt.data && terminal(attempt.data))
      void client.invalidateQueries({
        queryKey: ['finance', actor, trip.id],
        predicate: (q) => q.queryKey[3] !== 'payment-attempt',
      });
  }, [attempt.data?.status, client, actor, trip.id]);
  const requests = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'payment-requests', fund.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => runtime.requests(fund.id, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const exceptions = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'payment-exceptions', fund.id],
    initialPageParam: undefined as string | undefined,
    enabled: holder,
    queryFn: ({ pageParam, signal }) => runtime.paymentExceptions!(fund.id, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const common = { actorId: actor, tripId: trip.id, fundId: fund.id };
  const chooseAttempt = (id: string) => {
    try {
      if (!runtime.paymentRecovery) throw Error('No recovery storage');
      runtime.paymentRecovery.save(actor, trip.id, id);
      setSaved({ id, storageError: false });
    } catch {
      setSaved({ id, storageError: true });
    }
    if (receipt) session.dismiss();
    setPollUntil(Date.now() + 120000);
  };
  const canCreate =
    !blocked &&
    !saved.storageError &&
    !recoveryNeeded &&
    (!attemptId ||
      (!!attempt.data && terminal(attempt.data) && !attempt.data.needs_reconciliation));
  const rows =
    requests.data?.pages
      .flatMap((p) => p.items)
      .filter((r) => r.status === 'OPEN')
      .flatMap((r) =>
        r.contributions
          .filter((c) => c.member_user_id === actor && c.status === 'PENDING')
          .map((c) => ({ ...c, title: r.title })),
      ) ?? [];
  const showError = (error: unknown, retry: () => void) => (
    <ContentState state="error" error={toDomainError(error)} onRetry={retry} />
  );
  return (
    <section className={styles.panel} aria-label="Thanh toán MoMo Sandbox">
      <Alert tone="warning">
        Chỉ thử nghiệm MoMo Sandbox, không dùng tiền thật. Khoản đóng phải được cấu hình đích MoMo
        Sandbox; hệ thống kiểm tra trước khi tạo. Không báo chuyển thủ công trong lúc thanh toán
        đang chờ đối soát.
      </Alert>
      <OperationStatus session={session} />
      {saved.storageError && (
        <Alert tone="error">
          Không lưu được mã khôi phục. Đã khóa tạo thanh toán mới; giữ lại mã giao dịch bên dưới để
          đối soát.
        </Alert>
      )}
      {recoveryNeeded && (
        <Button disabled={op.busy} onClick={() => void session.retry()}>
          Khôi phục mã thanh toán từ yêu cầu cũ
        </Button>
      )}
      <h3>Khoản đóng của bạn</h3>
      {requests.isPending && <ContentState state="loading" />}
      {requests.isError && showError(requests.error, () => void requests.refetch())}
      {requests.isSuccess && !rows.length && (
        <p>Không có khoản đóng đang chờ trong các đợt đã tải.</p>
      )}
      {rows.map((row) => (
        <article key={row.id} className={styles.record}>
          <h4>{row.title}</h4>
          <p>{row.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫</p>
          <FinanceAction
            label="Tạo thanh toán MoMo Sandbox"
            payment
            session={session}
            disabled={
              !canCreate ||
              requests.isFetching ||
              requests.isError ||
              (!!known[row.id] && known[row.id] !== attemptId)
            }
            definition={{
              ...common,
              kind: 'payment-create',
              resourceId: row.id,
              body: {
                provider: 'MOMO_SANDBOX',
                expected_version: row.version,
                expected_finance_version: fund.finance_version,
              },
            }}
          />
          {known[row.id] && (
            <Button
              variant="outline"
              disabled={op.busy || recoveryNeeded}
              onClick={() => chooseAttempt(known[row.id]!)}
            >
              Xem thanh toán đã lưu
            </Button>
          )}
          <details>
            <summary>Chi tiết khoản đóng</summary>
            {row.id}
          </details>
        </article>
      ))}
      {requests.hasNextPage && (
        <Button loading={requests.isFetchingNextPage} onClick={() => void requests.fetchNextPage()}>
          Tải thêm đợt thu
        </Button>
      )}
      <h3>Theo dõi thanh toán</h3>
      <p>
        Giữ mã thanh toán để tra cứu. Web lưu mã gần nhất cho từng khoản đóng trong phiên trình
        duyệt này; đây không phải toàn bộ lịch sử thanh toán.
      </p>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!uuid.test(lookup.trim())) return;
          chooseAttempt(lookup.trim());
        }}
      >
        <Input
          label="Mã thanh toán cần tra cứu"
          value={lookup}
          onChange={(e) => setLookup(e.target.value)}
          required
          pattern={uuid.source}
        />
        <Button type="submit" disabled={op.busy || recoveryNeeded}>
          Tra cứu thanh toán
        </Button>
      </form>
      {attemptId && (
        <>
          <details>
            <summary>Mã thanh toán để tra cứu</summary>
            {attemptId}
          </details>
          {attempt.isPending && <ContentState state="loading" />}
          {attempt.isError && showError(attempt.error, () => void attempt.refetch())}
          {attempt.data && (
            <article className={styles.record}>
              <strong>{paymentStatusLabel(attempt.data)}</strong>
              {attempt.data.provider === 'PAYOS' && (
                <p>payOS · tiền thật, vào thẳng tài khoản của người giữ quỹ.</p>
              )}
              <p>
                {attempt.data.amount} VND · Cập nhật{' '}
                {new Date(attempt.data.updated_at).toLocaleString('vi-VN')}
              </p>
              {attempt.data.needs_reconciliation && (
                <Alert tone="warning">
                  Cần người giữ quỹ đối soát. Không tạo thanh toán thay thế.
                </Alert>
              )}
              {attempt.data.error_code && <p>{paymentErrorText(attempt.data.error_code)}</p>}
              {paymentLinkOpen(attempt.data) && (
                <a href={attempt.data.payment_url!} target="_blank" rel="noopener noreferrer">
                  {paymentLinkLabel(attempt.data.provider)}
                </a>
              )}
              {attempt.data.expires_at && (
                <p>Hạn thanh toán: {new Date(attempt.data.expires_at).toLocaleString('vi-VN')}</p>
              )}
              <p>
                Web kiểm tra tự động tối đa 2 phút khi đang mở mục này. Khi quay lại, hãy kiểm tra
                trạng thái; chỉ dữ liệu hệ thống mới xác nhận kết quả.
              </p>
              <Button
                disabled={attempt.isFetching}
                onClick={() => {
                  setPollUntil(Date.now() + 120000);
                  void attempt.refetch();
                }}
              >
                Kiểm tra trạng thái
              </Button>
              {holder && (
                <FinanceAction
                  label="Yêu cầu đối soát"
                  payment={attempt.data.provider === 'PAYOS' ? 'PAYOS' : true}
                  session={session}
                  disabled={blocked || attempt.isFetching || attempt.isError}
                  fields={[
                    { key: 'reason', label: 'Lý do đối soát', required: true, maxLength: 1024 },
                  ]}
                  definition={{
                    ...common,
                    kind: 'payment-reconcile',
                    resourceId: attemptId,
                    body: {},
                  }}
                />
              )}
            </article>
          )}
        </>
      )}
      {holder && (
        <>
          <h3>Ngoại lệ cần xử lý</h3>
          {exceptions.isPending && <ContentState state="loading" />}
          {exceptions.isError && showError(exceptions.error, () => void exceptions.refetch())}
          {exceptions.isSuccess && !exceptions.data.pages.some((p) => p.items.length) && (
            <p>Chưa có ngoại lệ thanh toán.</p>
          )}
          {exceptions.data?.pages
            .flatMap((p) => p.items)
            .map((row) => (
              <article className={styles.record} key={row.id}>
                <strong>
                  {row.processing_status === 'NEEDS_REVIEW'
                    ? 'Cần kiểm tra'
                    : row.processing_status === 'PROCESSED'
                      ? 'Đã xử lý'
                      : 'Không tác động số dư'}
                </strong>
                <p>{row.review_reason}</p>
                <details>
                  <summary>Chi tiết đối soát</summary>
                  <p>Mã ngoại lệ: {row.id}</p>
                  <p>Mã thanh toán: {row.payment_attempt_id ?? 'Chưa xác định'}</p>
                </details>
                {row.processing_status === 'NEEDS_REVIEW' && (
                  <div className={styles.actions}>
                    <FinanceAction
                      label="Liên kết thanh toán"
                      payment
                      session={session}
                      disabled={blocked || exceptions.isFetching || exceptions.isError}
                      fields={[
                        {
                          key: 'linked_attempt_id',
                          label: 'Mã thanh toán đã kiểm chứng',
                          initial: row.payment_attempt_id ?? '',
                          required: true,
                        },
                        { key: 'reason', label: 'Lý do xử lý', required: true, maxLength: 1024 },
                        {
                          key: 'previous_holder_transfer_confirmed',
                          label:
                            'Tôi đã kiểm chứng người giữ quỹ cũ chuyển lại tiền (chỉ chọn nếu thực sự đã kiểm tra).',
                          type: 'checkbox',
                        },
                      ]}
                      definition={{
                        ...common,
                        kind: 'payment-resolve',
                        resourceId: row.id,
                        body: {
                          resolution: 'LINKED',
                          expected_finance_version: fund.finance_version,
                        },
                      }}
                    />
                    <FinanceAction
                      label="Không tác động tài chính"
                      payment
                      session={session}
                      disabled={blocked || exceptions.isFetching || exceptions.isError}
                      fields={[
                        { key: 'reason', label: 'Lý do xử lý', required: true, maxLength: 1024 },
                      ]}
                      definition={{
                        ...common,
                        kind: 'payment-resolve',
                        resourceId: row.id,
                        body: {
                          resolution: 'NO_FINANCIAL_EFFECT',
                          expected_finance_version: fund.finance_version,
                        },
                      }}
                    />
                  </div>
                )}
              </article>
            ))}
          {exceptions.hasNextPage && (
            <Button
              loading={exceptions.isFetchingNextPage}
              onClick={() => void exceptions.fetchNextPage()}
            >
              Tải thêm ngoại lệ
            </Button>
          )}
        </>
      )}
    </section>
  );
}
