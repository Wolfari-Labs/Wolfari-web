import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ContentState } from '../../shared/components/ContentState';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { useOptionalSessionManager } from '../../app/session-context';
import { paths } from '../../app/route-paths';
import { useMembersRepositories } from './repositories/members-context';
import { invitationResponseAttempt, invitationToken } from './invitation-token';
import type { DomainError } from '../../shared/types/result';
import { invitationErrorMessage, refreshInvitationProjections } from './invitation-feedback';
import styles from './Invitations.module.css';

const noSubscription = () => () => undefined;
const authenticated = () => 'authenticated';
export function InvitationPage() {
  const manager = useOptionalSessionManager();
  const session = useSyncExternalStore(
    manager?.subscribe ?? noSubscription,
    manager?.status ?? authenticated,
  );
  const revision = useSyncExternalStore(invitationToken.subscribe, invitationToken.revision);
  const [declined, setDeclined] = useState(false);
  const token = invitationToken.read();
  useEffect(() => {
    if (session === 'anonymous' || session === 'expired') invitationResponseAttempt.clear();
  }, [session]);
  // Remount the request owner across session/token changes to discard stale results.
  if (declined && !token)
    return (
      <section className={styles.response}>
        <h1>Đã từ chối lời mời</h1>
        <Link to={paths.trips}>Đến danh sách chuyến đi</Link>
      </section>
    );
  if (!token)
    return (
      <section className={styles.response}>
        <h1>Không có lời mời hợp lệ</h1>
        <p>Hãy mở lại liên kết gốc. Vì bảo mật, tải lại trang sẽ không giữ lời mời đang mở.</p>
      </section>
    );
  if (session === 'unknown') return <ContentState state="loading" headingLevel={1} />;
  if (session !== 'authenticated')
    return (
      <section className={styles.response}>
        <h1>Lời mời chuyến đi</h1>
        <p>Đăng nhập bằng tài khoản nhận lời mời để tiếp tục.</p>
        <Link to="/login?returnTo=%2Finvitations">Đăng nhập</Link> ·{' '}
        <Link to="/register?returnTo=%2Finvitations">Đăng ký</Link>
      </section>
    );
  return (
    <InvitationResponse
      key={`${revision}:${session}`}
      token={token}
      tokenRevision={revision}
      onDeclined={() => {
        setDeclined(true);
        invitationToken.clear();
      }}
    />
  );
}

function InvitationResponse({
  token,
  tokenRevision,
  onDeclined,
}: {
  token: string;
  tokenRevision: number;
  onDeclined: () => void;
}) {
  const { invitation } = useMembersRepositories();
  const manager = useOptionalSessionManager();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(() => invitationResponseAttempt.read(token));
  const [error, setError] = useState<DomainError | null>(() =>
    attempt ? { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true } : null,
  );
  const [pending, setPending] = useState(false);
  const [authorityStale, setAuthorityStale] = useState(false);
  const active = useRef<AbortController | null>(null);
  const previewQuery = useQuery({
    // This revision is non-secret; the token is read only inside the request function.
    queryKey: ['invitation', 'preview', tokenRevision],
    queryFn: () => {
      if (!invitation.previewInvitation) throw new Error('Invitation unavailable');
      // Do not consume React Query's StrictMode mount signal: the in-flight read is
      // shared across the development remount. Token/session revisions use a new
      // key and ignore the old result, so it can never update the new flow.
      return invitation.previewInvitation({ token, signal: new AbortController().signal });
    },
    enabled: !attempt,
    retry: false,
  });
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (
      previewQuery.data?.status === 'error' &&
      previewQuery.data.error.code === 'UNAUTHENTICATED'
    ) {
      invitationResponseAttempt.clear(token);
      manager?.clear?.();
    }
  }, [manager, previewQuery.data, token]);

  async function refreshPreview() {
    const refreshed = await previewQuery.refetch();
    if (refreshed.data?.status === 'success') {
      setAuthorityStale(false);
      setError(null);
      return true;
    }
    setAuthorityStale(true);
    return false;
  }

  async function respond(action: 'accept' | 'decline') {
    if (active.current || authorityStale || (attempt && attempt.action !== action)) return;
    const requested = attempt ?? ({ token, action, idempotencyKey: crypto.randomUUID() } as const);
    const intent = invitationResponseAttempt.acquire(requested);
    if (!intent || intent.action !== action) return;
    setAttempt(intent);
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError(null);
    try {
      const request = { token, idempotencyKey: intent.idempotencyKey, signal: controller.signal };
      const result =
        action === 'accept'
          ? await invitation.acceptInvitation!(request)
          : await invitation.declineInvitation!(request);
      if (controller.signal.aborted) return;
      if (result.status === 'error') {
        if (result.error.code === 'SERVICE_UNAVAILABLE') {
          if (invitationResponseAttempt.isCurrent(token, intent.idempotencyKey))
            setError(result.error);
        } else if (invitationResponseAttempt.settle(token, intent.idempotencyKey)) {
          setError(result.error);
          setAttempt(null);
          setAuthorityStale(true);
          if (result.error.code === 'UNAUTHENTICATED') {
            queryClient.removeQueries({ queryKey: ['invitation', 'preview', tokenRevision] });
            manager?.clear?.();
            return;
          }
          await refreshPreview();
        }
        return;
      }
      if (!invitationResponseAttempt.settle(token, intent.idempotencyKey)) return;
      const tripId = 'membership' in result.data ? result.data.membership.tripId : undefined;
      // The receipt is authoritative; preview would reject a consumed token.
      void refreshInvitationProjections(queryClient, tripId);
      setAttempt(null);
      if (tripId) {
        invitationToken.clear();
        navigate(paths.trip(tripId), { replace: true });
      } else onDeclined();
    } catch {
      if (
        !controller.signal.aborted &&
        invitationResponseAttempt.isCurrent(token, intent.idempotencyKey)
      )
        setError({ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true });
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setPending(false);
      }
    }
  }
  if (
    !invitation.previewInvitation ||
    !invitation.acceptInvitation ||
    !invitation.declineInvitation
  )
    return <ContentState state="unavailable" headingLevel={1} />;
  const preview =
    !authorityStale && previewQuery.data?.status === 'success' ? previewQuery.data.data : null;
  const previewError =
    previewQuery.data?.status === 'error'
      ? previewQuery.data.error
      : previewQuery.isError
        ? ({
            code: 'SERVICE_UNAVAILABLE',
            correlationId: null,
            retryable: true,
          } satisfies DomainError)
        : null;
  const visibleError = error ?? previewError;
  return (
    <section className={styles.response}>
      <h1>Lời mời chuyến đi</h1>
      {((!attempt && previewQuery.isPending) || (authorityStale && previewQuery.isFetching)) && (
        <ContentState state="loading" headingLevel={2} />
      )}
      {visibleError && (
        <Alert tone="warning" live>
          {invitationErrorMessage(visibleError)}
          {visibleError.correlationId && (
            <details>
              <summary>Chi tiết hỗ trợ</summary>
              <small>Mã tra cứu: {visibleError.correlationId}</small>
            </details>
          )}
        </Alert>
      )}
      {preview && (
        <>
          <p>
            {preview.inviterDisplayName || 'Một thành viên'} mời bạn tham gia{' '}
            <strong>{preview.tripName}</strong>.
          </p>
          <p>Hết hạn: {new Date(preview.expiresAt).toLocaleString('vi-VN')}</p>
        </>
      )}
      {((!authorityStale && preview?.status === 'PENDING') || attempt) && (
        <div className={styles.actions}>
          <Button
            disabled={pending || (attempt !== null && attempt.action !== 'accept')}
            onClick={() => void respond('accept')}
          >
            {attempt?.action === 'accept' ? 'Thử lại chấp nhận' : 'Chấp nhận'}
          </Button>
          <Button
            variant="outline"
            disabled={pending || (attempt !== null && attempt.action !== 'decline')}
            onClick={() => void respond('decline')}
          >
            {attempt?.action === 'decline' ? 'Thử lại từ chối' : 'Từ chối'}
          </Button>
        </div>
      )}
      {!attempt && preview && preview.status !== 'PENDING' && (
        <Alert>Lời mời này không còn chờ phản hồi.</Alert>
      )}
      {!previewQuery.isPending && !attempt && (
        <Button variant="outline" disabled={pending} onClick={() => void refreshPreview()}>
          Kiểm tra lại lời mời
        </Button>
      )}
      <p>
        Lời mời qua email yêu cầu tài khoản đúng email và đã xác minh. Bạn có thể kiểm tra email tại{' '}
        <Link to={paths.profile}>Hồ sơ</Link>, rồi quay lại đây.
      </p>
      <Button
        variant="plain"
        disabled={pending}
        onClick={() => {
          active.current?.abort();
          invitationResponseAttempt.clear(token);
          queryClient.removeQueries({ queryKey: ['invitation', 'preview', tokenRevision] });
          manager?.clear?.();
          navigate('/login?returnTo=%2Finvitations');
        }}
      >
        Đổi tài khoản
      </Button>
    </section>
  );
}
