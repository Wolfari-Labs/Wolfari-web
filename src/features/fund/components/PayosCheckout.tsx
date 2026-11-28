import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { FundRuntime } from '../model/runtime-fund';
import {
  isTerminalPayment,
  paymentErrorText,
  paymentLinkLabel,
  paymentLinkOpen,
  paymentStatusLabel,
  type PaymentAttempt,
} from '../model/payment';
import type { CommandSession } from '../../../shared/types/operations';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import { payosReturnKeys, payosReturnUrl, readPayosReturn } from '../../../shared/lib/payos-return';
import { paths } from '../../../app/route-paths';
import styles from './FinanceRecords.module.css';

/** payOS links stay valid for 15 minutes; the page re-reads every 3 s while it is visible. */
const POLL_WINDOW_MS = 15 * 60_000;
const POLL_EVERY_MS = 3000;

/**
 * The Gateway return page for this Trip's Fund page. payOS sends the payer there after paying or
 * cancelling; the page then re-reads the Fund. Undefined when this origin cannot be encoded.
 */
export function fundReturnUrl(tripId: string): string | undefined {
  try {
    const origin = window.location.origin;
    return payosReturnUrl(new URL(paths.fund(tripId), origin).href, origin);
  } catch {
    return undefined;
  }
}

/** Polls one payment attempt; on a terminal state the Fund projections are read again. */
export function usePaymentAttempt(
  runtime: FundRuntime,
  actor: string,
  tripId: string,
  attemptId: string,
): { attempt: UseQueryResult<PaymentAttempt>; check: () => void } {
  const client = useQueryClient();
  const [pollUntil, setPollUntil] = useState(() => Date.now() + POLL_WINDOW_MS);
  useEffect(() => setPollUntil(Date.now() + POLL_WINDOW_MS), [attemptId]);
  const attempt = useQuery({
    queryKey: ['finance', actor, tripId, 'payment-attempt', attemptId],
    enabled: !!attemptId && !!runtime.paymentAttempt,
    queryFn: ({ signal }) => runtime.paymentAttempt!(attemptId, signal),
    retry: 1,
    refetchInterval: (query) =>
      Date.now() < pollUntil &&
      !document.hidden &&
      (!query.state.data || !isTerminalPayment(query.state.data))
        ? POLL_EVERY_MS
        : false,
    refetchIntervalInBackground: false,
  });
  const settled = attempt.data && isTerminalPayment(attempt.data) ? attempt.data.status : null;
  useEffect(() => {
    if (settled)
      void client.invalidateQueries({
        queryKey: ['finance', actor, tripId],
        predicate: (q) => q.queryKey[3] !== 'payment-attempt',
      });
  }, [settled, client, actor, tripId]);
  return {
    attempt,
    check: () => {
      setPollUntil(Date.now() + POLL_WINDOW_MS);
      void attempt.refetch();
    },
  };
}

/**
 * The attempt a member started for one contribution: the receipt of the create command in this
 * session, else the ID saved in this browser session. Saving it lets a reload resume tracking.
 */
export function useContributionPayment(
  runtime: FundRuntime,
  actor: string,
  tripId: string,
  session: CommandSession,
  contributionId: string | null,
) {
  const op = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const receipt =
    contributionId &&
    op.state === 'SUCCEEDED' &&
    op.intent?.kind === 'payment-create' &&
    op.intent.resourceId === contributionId
      ? (op.receipt as PaymentAttempt | null)
      : null;
  const read = () => {
    try {
      if (!runtime.paymentRecovery) throw Error('No recovery storage');
      return { saved: runtime.paymentRecovery.list(actor, tripId), storageError: false };
    } catch {
      return { saved: {} as Record<string, string>, storageError: true };
    }
  };
  const [recovery, setRecovery] = useState(read);
  // PaymentPanel may have saved another attempt while this view was closed.
  useEffect(() => setRecovery(read()), [contributionId]);
  useEffect(() => {
    if (!receipt?.id) return;
    try {
      if (!runtime.paymentRecovery) throw Error('No recovery storage');
      runtime.paymentRecovery.save(actor, tripId, receipt.id, receipt.contribution_id);
      setRecovery({ saved: runtime.paymentRecovery.list(actor, tripId), storageError: false });
    } catch {
      setRecovery((current) => ({ ...current, storageError: true }));
    }
  }, [receipt?.id, receipt?.contribution_id, runtime, actor, tripId]);
  const attemptId = receipt?.id ?? (contributionId ? (recovery.saved[contributionId] ?? '') : '');
  // The create settled through operation recovery without returning the attempt: replaying the
  // same key (same body) returns it, never a second payment.
  const recoveryNeeded =
    !!contributionId &&
    op.state === 'SUCCEEDED' &&
    op.intent?.kind === 'payment-create' &&
    op.intent.resourceId === contributionId &&
    !receipt &&
    !attemptId;
  const { attempt, check } = usePaymentAttempt(runtime, actor, tripId, attemptId);
  // A new payment may start only when nothing is in flight or waiting for reconciliation. An
  // unreadable attempt counts as in flight, except one the server says does not exist.
  const missing = attempt.isError && toDomainError(attempt.error).code === 'RESOURCE_NOT_FOUND';
  const open =
    recoveryNeeded ||
    (!!attemptId &&
      !missing &&
      (!attempt.data || !isTerminalPayment(attempt.data) || attempt.data.needs_reconciliation));
  return {
    attemptId,
    attempt,
    check,
    open,
    recoveryNeeded,
    retry: () => void session.retry(),
    storageError: recovery.storageError,
  };
}

/** Truthful status of one attempt: only the backend projection, never the payOS return query. */
export function PaymentAttemptStatus({
  attempt,
  onCheck,
}: {
  attempt: UseQueryResult<PaymentAttempt>;
  onCheck: () => void;
}) {
  if (attempt.isPending) return <ContentState state="loading" />;
  if (attempt.isError)
    return (
      <ContentState
        state="error"
        error={toDomainError(attempt.error)}
        onRetry={() => void attempt.refetch()}
      />
    );
  const row = attempt.data;
  const payos = row.provider === 'PAYOS';
  return (
    <article className={styles.record} aria-label="Trạng thái thanh toán trực tuyến">
      <strong role="status">{paymentStatusLabel(row)}</strong>
      <p>
        {row.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫ · Cập nhật{' '}
        {new Date(row.updated_at).toLocaleString('vi-VN')}
      </p>
      {row.needs_reconciliation && (
        <Alert tone="warning">Cần người giữ quỹ đối soát. Không tạo thanh toán thay thế.</Alert>
      )}
      {row.error_code && <p>{paymentErrorText(row.error_code)}</p>}
      {paymentLinkOpen(row) && (
        <a href={row.payment_url!} target="_blank" rel="noopener noreferrer">
          {paymentLinkLabel(row.provider)}
        </a>
      )}
      {row.expires_at && !isTerminalPayment(row) && (
        <p>Hạn thanh toán: {new Date(row.expires_at).toLocaleString('vi-VN')}</p>
      )}
      {!isTerminalPayment(row) && (
        <p>
          {payos
            ? 'Tiền thật, vào thẳng tài khoản của người giữ quỹ. Trang payOS có thể hiện số tài khoản ảo của payOS (ví dụ LOCC…); tiền vẫn về tài khoản đó. Thanh toán xong, quay lại đây: khoản đóng chỉ được xác nhận khi hệ thống nhận được tiền.'
            : 'MoMo Sandbox — không chuyển tiền thật. Chỉ dữ liệu hệ thống mới xác nhận kết quả.'}
        </p>
      )}
      <Button variant="outline" disabled={attempt.isFetching} onClick={onCheck}>
        Kiểm tra trạng thái
      </Button>
    </article>
  );
}

/**
 * payOS sends the payer back to the Fund page with `?provider=PAYOS&status=…`. That hint proves
 * nothing: the page re-reads the Fund and the attempt saved in this tab, then drops the query so
 * a reload or shared link does not repeat it.
 */
export function usePayosReturn(
  runtime: FundRuntime,
  actor: string,
  tripId: string,
  refresh: () => void,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hint, setHint] = useState(() => readPayosReturn(searchParams));
  const [attemptId] = useState(() => {
    try {
      return hint ? (runtime.paymentRecovery?.load(actor, tripId) ?? '') : '';
    } catch {
      return '';
    }
  });
  const { attempt, check } = usePaymentAttempt(runtime, actor, tripId, attemptId);
  useEffect(() => {
    const next = readPayosReturn(searchParams);
    if (!next) return;
    setHint(next);
    const rest = new URLSearchParams(searchParams);
    for (const key of payosReturnKeys) rest.delete(key);
    setSearchParams(rest, { replace: true });
    refresh();
  }, [searchParams, setSearchParams, refresh]);
  return { active: hint !== null, attemptId, attempt, check, dismiss: () => setHint(null) };
}

/** Neutral notice after the payOS return: "checking" until the Fund has been read again. */
export function PayosReturnNotice({
  state,
  reading,
  onShowContributions,
  className,
  actionsClassName,
}: {
  state: ReturnType<typeof usePayosReturn>;
  /** The Fund projections are still being read again. */
  reading: boolean;
  onShowContributions?: (() => void) | undefined;
  className?: string | undefined;
  actionsClassName?: string | undefined;
}) {
  if (!state.active) return null;
  const checking = reading || (!!state.attemptId && state.attempt.isPending);
  return (
    <section className={className} aria-label="Kết quả thanh toán payOS">
      {checking ? (
        <Alert tone="info">Đang kiểm tra kết quả thanh toán…</Alert>
      ) : (
        <>
          <Alert tone="info">
            Đã đọc lại quỹ từ hệ thống. Trang payOS không xác nhận khoản đóng: khoản đóng chỉ chuyển
            “Đã xác nhận” khi hệ thống nhận được tiền.
          </Alert>
          {state.attemptId && (
            <PaymentAttemptStatus attempt={state.attempt} onCheck={state.check} />
          )}
          <div className={actionsClassName}>
            {onShowContributions && (
              <Button variant="outline" onClick={onShowContributions}>
                Xem khoản đóng
              </Button>
            )}
            <Button variant="plain" onClick={state.dismiss}>
              Đóng thông báo
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
