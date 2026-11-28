import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ContentState } from '../../shared/components/ContentState';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Input } from '../../shared/components/Input';
import { useOptionalSessionManager } from '../../app/session-context';
import { paths } from '../../app/route-paths';
import { useMembersRepositories } from './repositories/members-context';
import { invitationResponseAttempt, invitationToken } from './invitation-token';
import {
  formatJoinCode,
  isJoinCode,
  normalizeJoinCode,
  type InvitationPreview,
} from './model/members';
import type { DomainError } from '../../shared/types/result';
import {
  invitationErrorMessage,
  recipientInvitationErrorMessage,
  refreshInvitationProjections,
} from './invitation-feedback';
import styles from './Invitations.module.css';
import mascot from '../../shared/assets/figma/4ff86.png';
import send from '../../shared/assets/figma/ac8db.svg';

const invitationStatus = {
  PENDING: 'Đang chờ phản hồi',
  ACCEPTED: 'Đã chấp nhận',
  DECLINED: 'Đã từ chối',
  EXPIRED: 'Đã hết hạn',
  REVOKED: 'Đã thu hồi',
};
const day = (value: string) => new Date(value).toLocaleDateString('vi-VN');
/** "12/12/2026 – 15/12/2026"; null when the Trip has no dates yet (or an older server). */
function tripDates(preview: InvitationPreview): string | null {
  if (preview.tripStartAt && preview.tripEndAt)
    return `${day(preview.tripStartAt)} – ${day(preview.tripEndAt)}`;
  if (preview.tripStartAt) return `Từ ${day(preview.tripStartAt)}`;
  if (preview.tripEndAt) return `Đến ${day(preview.tripEndAt)}`;
  return null;
}

function ResponseCard({
  title = 'Lời mời chuyến đi',
  tripName,
  subtitle,
  children,
}: {
  title?: string;
  tripName?: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.response} data-flow="invitation-response">
      <header className={styles.responseHeader}>
        <img src={mascot} alt="" width={118} height={118} />
        <div>
          <h1>{title}</h1>
          {tripName && <h2>{tripName}</h2>}
          {subtitle}
        </div>
      </header>
      {children}
    </section>
  );
}

/** A typed join code opens the same preview/accept flow as a share link. */
function CodeEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  return (
    <form
      className={styles.panel}
      aria-label="Nhập mã mời"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const code = normalizeJoinCode(value);
        if (!code) {
          setError('Mã mời gồm 8 ký tự chữ và số, ví dụ ABCD-1234.');
          return;
        }
        invitationToken.open(code);
      }}
    >
      <Input
        label="Mã mời"
        hint="Mã 8 ký tự Owner gửi cho bạn, ví dụ ABCD-1234."
        value={value}
        error={error}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={32}
        onChange={(event) => {
          setValue(event.target.value);
          setError(undefined);
        }}
      />
      <div className={styles.actions}>
        <Button type="submit">Xem lời mời</Button>
      </div>
    </form>
  );
}

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
      <ResponseCard title="Đã từ chối lời mời">
        <Link to={paths.trips}>Đến danh sách chuyến đi</Link>
      </ResponseCard>
    );
  if (!token)
    return (
      <ResponseCard>
        <p>Mở liên kết trong email hoặc nhập mã mời Owner đã gửi.</p>
        <CodeEntry />
        {session === 'authenticated' && <MyInvitations />}
        {(session === 'anonymous' || session === 'expired') && (
          <p>
            Lời mời gửi qua email sẽ hiện ở đây sau khi bạn{' '}
            <Link to="/login?returnTo=%2Finvitations">đăng nhập</Link> bằng đúng email đó.
          </p>
        )}
      </ResponseCard>
    );
  if (session === 'unknown')
    return (
      <ResponseCard>
        <ContentState state="loading" headingLevel={2} />
      </ResponseCard>
    );
  if (session !== 'authenticated')
    return (
      <ResponseCard>
        <p>Đăng nhập bằng tài khoản nhận lời mời để tiếp tục.</p>
        <p>
          Lời mời được giữ trong tab này khoảng 30 phút, kể cả khi bạn đăng ký và xác minh email.
        </p>
        <div>
          <Link to="/login?returnTo=%2Finvitations">Đăng nhập</Link> ·{' '}
          <Link to="/register?returnTo=%2Finvitations">Đăng ký</Link>
        </div>
        <Button variant="plain" onClick={() => invitationToken.clear()}>
          Dùng lời mời khác
        </Button>
      </ResponseCard>
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
  const byCode = isJoinCode(token);
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
    return (
      <ResponseCard>
        <ContentState state="unavailable" headingLevel={2} />
      </ResponseCard>
    );
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
  const dates = preview ? tripDates(preview) : null;
  return (
    <ResponseCard
      {...(preview ? { tripName: preview.tripName } : {})}
      subtitle={
        preview && (
          <p>
            {preview.inviterDisplayName || 'Một thành viên'} mời bạn tham gia{' '}
            <strong>{preview.tripName}</strong>.
          </p>
        )
      }
    >
      {((!attempt && previewQuery.isPending) || (authorityStale && previewQuery.isFetching)) && (
        <ContentState state="loading" headingLevel={2} />
      )}
      {visibleError && (
        <Alert tone="warning" live>
          {recipientInvitationErrorMessage(visibleError, byCode)}
          {visibleError.correlationId && (
            <details>
              <summary>Chi tiết hỗ trợ</summary>
              <small>Mã tra cứu: {visibleError.correlationId}</small>
            </details>
          )}
        </Alert>
      )}
      {preview && (
        <dl className={styles.responseMetadata}>
          {dates && (
            <div>
              <dt>Thời gian chuyến đi</dt>
              <dd>{dates}</dd>
            </div>
          )}
          <div>
            <dt>Hết hạn</dt>
            <dd>{new Date(preview.expiresAt).toLocaleString('vi-VN')}</dd>
          </div>
          <div>
            <dt>Trạng thái lời mời</dt>
            <dd>{invitationStatus[preview.status]}</dd>
          </div>
          <div>
            <dt>Vai trò khi tham gia</dt>
            <dd>Member</dd>
          </div>
          {byCode && (
            <div>
              <dt>Mã mời</dt>
              <dd>{formatJoinCode(token)}</dd>
            </div>
          )}
        </dl>
      )}
      {((!authorityStale && preview?.status === 'PENDING') || attempt) && (
        <div className={styles.responseActions}>
          <Button
            variant="outline"
            disabled={pending || (attempt !== null && attempt.action !== 'decline')}
            onClick={() => void respond('decline')}
          >
            {attempt?.action === 'decline' ? 'Thử lại từ chối' : 'Từ chối'}
          </Button>
          <Button
            icon={<img src={send} alt="" width={18} height={18} />}
            disabled={pending || (attempt !== null && attempt.action !== 'accept')}
            onClick={() => void respond('accept')}
          >
            {attempt?.action === 'accept' ? 'Thử lại chấp nhận' : 'Chấp nhận'}
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
      <div className={styles.actions}>
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
        {!attempt && (
          <Button variant="plain" disabled={pending} onClick={() => invitationToken.clear()}>
            Dùng lời mời khác
          </Button>
        )}
      </div>
    </ResponseCard>
  );
}

/**
 * EMAIL invitations waiting for this account's verified email (`GET /me/invitations`). Each answer
 * is one intent with its own Idempotency-Key; an unknown result is retried with the same key.
 */
function MyInvitations() {
  const { invitation } = useMembersRepositories();
  const manager = useOptionalSessionManager();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ id: string; error: DomainError } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, rerender] = useState(0);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const query = useQuery({
    queryKey: ['invitations', 'mine'],
    queryFn: async ({ signal }) => {
      const result = await invitation.listMyInvitations!({ signal });
      if (result.status === 'error') throw result.error;
      return result.status === 'ready' ? result.data : [];
    },
    enabled: !!invitation.listMyInvitations,
    retry: false,
  });
  if (
    !invitation.listMyInvitations ||
    !invitation.acceptInvitation ||
    !invitation.declineInvitation
  )
    return null;
  async function respond(item: InvitationPreview, action: 'accept' | 'decline') {
    const key = 'id:' + item.id;
    const previous = invitationResponseAttempt.read(key);
    if (active.current || (previous && previous.action !== action)) return;
    const intent = invitationResponseAttempt.acquire(
      previous ?? { token: key, action, idempotencyKey: crypto.randomUUID() },
    );
    if (!intent || intent.action !== action) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(item.id);
    setFailure(null);
    setNotice(null);
    try {
      const request = {
        invitationId: item.id,
        idempotencyKey: intent.idempotencyKey,
        signal: controller.signal,
      };
      const result =
        action === 'accept'
          ? await invitation.acceptInvitation!(request)
          : await invitation.declineInvitation!(request);
      if (controller.signal.aborted) return;
      if (result.status === 'error') {
        // 5xx/timeout may have committed: keep the intent so the retry reuses its key.
        if (result.error.code !== 'SERVICE_UNAVAILABLE')
          invitationResponseAttempt.settle(key, intent.idempotencyKey);
        setFailure({ id: item.id, error: result.error });
        if (result.error.code === 'UNAUTHENTICATED') manager?.clear?.();
        else if (result.error.code !== 'SERVICE_UNAVAILABLE') void query.refetch();
        return;
      }
      if (!invitationResponseAttempt.settle(key, intent.idempotencyKey)) return;
      const tripId = 'membership' in result.data ? result.data.membership.tripId : undefined;
      await refreshInvitationProjections(queryClient, tripId);
      if (tripId) navigate(paths.trip(tripId), { replace: true });
      else setNotice(`Đã từ chối lời mời tham gia “${item.tripName}”.`);
    } catch {
      if (!controller.signal.aborted)
        setFailure({
          id: item.id,
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        });
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setBusy(null);
        rerender((value) => value + 1);
      }
    }
  }
  // An older Gateway has no GET /me/invitations (404): the section is simply not offered.
  if ((query.error as DomainError | null)?.code === 'RESOURCE_NOT_FOUND') return null;
  const items = query.data ?? [];
  // One unresolved answer at a time: it must be retried (same key) before answering another.
  const unresolvedId =
    items.find((item) => invitationResponseAttempt.read('id:' + item.id))?.id ?? null;
  return (
    <section className={styles.panel} aria-label="Lời mời đang chờ bạn">
      <h2>Lời mời đang chờ bạn</h2>
      {query.isPending && <p role="status">Đang tải lời mời của bạn…</p>}
      {query.isError && (
        <Alert tone="warning" live>
          Chưa tải được lời mời của bạn.{' '}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử tải lại
          </Button>
        </Alert>
      )}
      {notice && <Alert live>{notice}</Alert>}
      {query.isSuccess && items.length === 0 && (
        <p>
          Chưa có lời mời nào gửi tới email đã xác minh của bạn. Lời mời qua email chỉ hiện khi bạn
          đăng nhập đúng email đó và đã xác minh.
        </p>
      )}
      <ul className={styles.list}>
        {items.map((item) => {
          const attempt = invitationResponseAttempt.read('id:' + item.id);
          const dates = tripDates(item);
          return (
            <li className={styles.item} key={item.id}>
              <strong>{item.tripName}</strong>
              <span>{item.inviterDisplayName || 'Một thành viên'} mời bạn tham gia.</span>
              {dates && <span>Thời gian chuyến đi: {dates}</span>}
              <span>Hết hạn {new Date(item.expiresAt).toLocaleString('vi-VN')}</span>
              {failure?.id === item.id && (
                <Alert tone="warning" live>
                  {failure.error.code === 'SERVICE_UNAVAILABLE'
                    ? invitationErrorMessage(failure.error)
                    : recipientInvitationErrorMessage(failure.error, false)}
                </Alert>
              )}
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  disabled={
                    busy !== null ||
                    (unresolvedId !== null && unresolvedId !== item.id) ||
                    (attempt !== null && attempt.action !== 'decline')
                  }
                  onClick={() => void respond(item, 'decline')}
                >
                  {attempt?.action === 'decline' ? 'Thử lại từ chối' : 'Từ chối'}
                </Button>
                <Button
                  icon={<img src={send} alt="" width={18} height={18} />}
                  loading={busy === item.id && attempt?.action === 'accept'}
                  disabled={
                    busy !== null ||
                    (unresolvedId !== null && unresolvedId !== item.id) ||
                    (attempt !== null && attempt.action !== 'accept')
                  }
                  onClick={() => void respond(item, 'accept')}
                >
                  {attempt?.action === 'accept' ? 'Thử lại tham gia' : 'Tham gia'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
