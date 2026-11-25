import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import { useMembersRepositories } from './repositories/members-context';
import { useOptionalSessionManager } from '../../app/session-context';
import { invitationEmailError, type InvitationViewModel } from './model/members';
import type { DomainError } from '../../shared/types/result';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { Icon } from '../../shared/components/Icon';
import { invitationErrorMessage, refreshInvitationProjections } from './invitation-feedback';
import {
  invitationManagementAttempt,
  type InvitationManagementAttempt,
} from './invitation-management-attempt';
import styles from './Invitations.module.css';
import send from '../../shared/assets/figma/ac8db.svg';

const labels = {
  PENDING: 'Đang chờ phản hồi',
  ACCEPTED: 'Đã chấp nhận',
  DECLINED: 'Đã từ chối',
  REVOKED: 'Đã thu hồi',
  EXPIRED: 'Đã hết hạn',
};
export function InvitationManagement({
  trip,
  active = true,
}: {
  trip: TripDetailViewModel;
  active?: boolean;
}) {
  const { invitation } = useMembersRepositories();
  const manager = useOptionalSessionManager();
  const client = useQueryClient();
  const attemptScope = `${trip.id}:${trip.currentMembership.id}`;
  const [attempt, setAttempt] = useState<InvitationManagementAttempt | null>(() =>
    invitationManagementAttempt.read(attemptScope),
  );
  const [kind, setKind] = useState<'EMAIL' | 'LINK'>(() =>
    attempt?.action === 'create' ? attempt.intent.invitationType : 'EMAIL',
  );
  const [email, setEmail] = useState(() =>
    attempt?.action === 'create' && attempt.intent.invitationType === 'EMAIL'
      ? attempt.intent.email
      : '',
  );
  const [validation, setValidation] = useState<string>();
  const [filter, setFilter] = useState<InvitationViewModel['status'] | ''>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<DomainError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<InvitationViewModel | null>(null);
  const activeController = useRef<AbortController | null>(null);
  const activeTab = useRef(active);
  activeTab.current = active;
  const canReadInvitations =
    trip.permissions.canRead &&
    (trip.permissions.canInvite === true || trip.currentMembership.role === 'OWNER') &&
    trip.currentMembership.leftAt === null;
  const allowed =
    canReadInvitations &&
    (trip.permissions.canInvite ?? trip.permissions.canUpdate) &&
    trip.archivedAt === null &&
    trip.lifecycle !== 'ARCHIVED';
  useEffect(() => {
    invitationManagementAttempt.enter(attemptScope);
  }, [attemptScope]);
  useEffect(() => {
    const unsubscribe = manager?.subscribe(() => {
      if (manager.status() !== 'authenticated') {
        activeController.current?.abort();
        activeController.current = null;
        setPending(false);
        invitationManagementAttempt.clear(attemptScope);
        setLink(null);
        setAttempt(null);
        setConfirm(null);
      }
    });
    return () => {
      activeController.current?.abort();
      unsubscribe?.();
    };
  }, [attemptScope, manager]);
  useEffect(() => {
    if (!allowed) {
      activeController.current?.abort();
      activeController.current = null;
      setPending(false);
      invitationManagementAttempt.clear(attemptScope);
      setLink(null);
      setAttempt(null);
      setConfirm(null);
    }
  }, [allowed, attemptScope]);
  useEffect(() => {
    if (!active && link) {
      setLink(null);
      setNotice('Liên kết một lần đã bị đóng khi bạn rời tab và không thể hiển thị lại.');
    }
  }, [active, link]);
  const query = useInfiniteQuery({
    queryKey: ['invitations', trip.id, 'management', filter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const result = await invitation.listInvitations({
        tripId: trip.id,
        scenario: 'success',
        signal,
        limit: 20,
        ...(filter ? { status: filter } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      if (result.status === 'error') throw result.error;
      return result.status === 'ready' ? result.data : { items: [], nextCursor: null };
    },
    getNextPageParam: (page, _pages, _param, params) =>
      page.nextCursor && !params.includes(page.nextCursor) ? page.nextCursor : undefined,
    enabled: active && canReadInvitations,
    retry: false,
  });
  const queryErrorCode =
    query.error && typeof query.error === 'object' && 'code' in query.error
      ? query.error.code
      : null;
  const readAuthorityLost =
    queryErrorCode === 'UNAUTHENTICATED' ||
    queryErrorCode === 'PERMISSION_DENIED' ||
    queryErrorCode === 'RESOURCE_NOT_FOUND';
  useEffect(() => {
    if (!canReadInvitations) {
      const queryKey = ['invitations', trip.id, 'management'];
      void client.cancelQueries({ queryKey });
      client.removeQueries({ queryKey });
    }
  }, [canReadInvitations, client, trip.id]);
  useEffect(() => {
    if (readAuthorityLost) {
      activeController.current?.abort();
      activeController.current = null;
      setPending(false);
      invitationManagementAttempt.clear(attemptScope);
      setAttempt(null);
      setLink(null);
      setConfirm(null);
      if (queryErrorCode === 'UNAUTHENTICATED') manager?.clear?.();
    }
  }, [attemptScope, manager, queryErrorCode, readAuthorityLost]);
  const items =
    canReadInvitations && !readAuthorityLost
      ? [
          ...new Map(
            (query.data?.pages ?? [])
              .flatMap((page) => page.items)
              .filter((item) => item.tripId.toLowerCase() === trip.id.toLowerCase())
              .map((item) => [item.id, item]),
          ).values(),
        ]
      : [];

  function canManageInvitation(item: InvitationViewModel) {
    return (
      item.tripId.toLowerCase() === trip.id.toLowerCase() &&
      (trip.currentMembership.role === 'OWNER' ||
        item.invitedByUserId?.toLowerCase() === trip.currentMembership.userId.toLowerCase())
    );
  }
  function canExecute(requested: InvitationManagementAttempt) {
    if (requested.action === 'create') return Boolean(invitation.createInvitation);
    const target = items.find((item) => item.id === requested.id);
    return (
      (trip.currentMembership.role === 'OWNER' || (target && canManageInvitation(target))) &&
      Boolean(
        requested.action === 'resend' ? invitation.resendInvitation : invitation.revokeInvitation,
      )
    );
  }
  async function execute(requested: InvitationManagementAttempt) {
    if (!allowed || activeController.current || !canExecute(requested)) return;
    const controller = new AbortController();
    activeController.current = controller;
    const next = invitationManagementAttempt.acquire(attemptScope, requested);
    if (!canExecute(next)) {
      activeController.current = null;
      return;
    }
    setAttempt(next);
    setPending(true);
    setError(null);
    setNotice(null);
    setLink(null);
    setConfirm(null);
    try {
      const common = { tripId: trip.id, signal: controller.signal };
      const result =
        next.action === 'create'
          ? await invitation.createInvitation!({ ...common, intent: next.intent })
          : await (
              next.action === 'resend' ? invitation.resendInvitation! : invitation.revokeInvitation!
            )({ ...common, invitationId: next.id, intent: next.intent });
      if (controller.signal.aborted) return;
      if (result.status === 'error') {
        // A 5xx/timeout/malformed successful response may have committed. Never
        // allow another operation to replace this unresolved intent.
        if (result.error.code === 'SERVICE_UNAVAILABLE') {
          if (invitationManagementAttempt.isCurrent(attemptScope, next.intent.idempotencyKey))
            setError(result.error);
        } else if (invitationManagementAttempt.settle(attemptScope, next.intent.idempotencyKey)) {
          setError(result.error);
          setAttempt(null);
          if (result.error.code === 'UNAUTHENTICATED') manager?.clear?.();
          if (
            [
              'VERSION_CONFLICT',
              'STATE_CONFLICT',
              'PERMISSION_DENIED',
              'RESOURCE_NOT_FOUND',
            ].includes(result.error.code)
          )
            await refreshInvitationProjections(client, trip.id);
        }
        return;
      }
      if (!invitationManagementAttempt.settle(attemptScope, next.intent.idempotencyKey)) return;
      setAttempt(null);
      if ('oneTimeLink' in result.data) {
        const isLinkCreate = next.action === 'create' && next.intent.invitationType === 'LINK';
        const canRevealLink = isLinkCreate && activeTab.current;
        setLink(canRevealLink ? result.data.oneTimeLink : null);
        setNotice(
          isLinkCreate
            ? result.data.oneTimeLink && !activeTab.current
              ? 'Liên kết một lần đã được tạo khi tab không hoạt động nên đã bị bỏ và không thể hiển thị lại.'
              : result.data.oneTimeLink
                ? 'Liên kết chỉ hiển thị lần này. Hãy sao chép trước khi đóng.'
                : 'Lời mời đã được tạo, nhưng liên kết không được trả lại khi thử lại. Không thể khôi phục liên kết; hãy thu hồi lời mời này trước khi tạo mới.'
            : 'Yêu cầu gửi lời mời đã được tiếp nhận. Chưa xác nhận thư đã được giao.',
        );
      } else
        setNotice(
          next.action === 'resend'
            ? 'Yêu cầu gửi lại đã được tiếp nhận. Liên kết cũ không còn hiệu lực; chưa xác nhận thư đã được giao.'
            : 'Đã thu hồi lời mời.',
        );
      await refreshInvitationProjections(client, trip.id);
    } catch {
      if (
        !controller.signal.aborted &&
        invitationManagementAttempt.isCurrent(attemptScope, next.intent.idempotencyKey)
      )
        setError({ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true });
    } finally {
      if (!controller.signal.aborted) {
        activeController.current = null;
        setPending(false);
      }
    }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    if (pending || attempt || link || !allowed || !invitation.createInvitation) return;
    const invalid = kind === 'EMAIL' ? invitationEmailError(email) : undefined;
    setValidation(invalid);
    if (invalid) {
      document.getElementById('invitation-email')?.focus();
      return;
    }
    const common = {
      idempotencyKey: crypto.randomUUID(),
      expectedMembershipRevision: trip.membershipRevision,
      expiresAt: null,
    };
    void execute({
      action: 'create',
      intent:
        kind === 'EMAIL'
          ? { ...common, invitationType: 'EMAIL', email: email.trim().toLowerCase() }
          : { ...common, invitationType: 'LINK' },
    });
  }
  function version(action: 'revoke' | 'resend', item: InvitationViewModel) {
    if (
      attempt ||
      !allowed ||
      !canManageInvitation(item) ||
      item.status !== 'PENDING' ||
      (action === 'resend' && item.invitationType !== 'EMAIL')
    )
      return;
    void execute({
      action,
      id: item.id,
      intent: { expectedVersion: item.version, idempotencyKey: crypto.randomUUID() },
    });
  }
  const locked = pending || Boolean(attempt) || Boolean(link) || !allowed || query.isError;
  return (
    <div className={styles.workspace}>
      <form
        className={styles.panel}
        aria-label="Mời thành viên"
        noValidate
        onSubmit={create}
        data-cp08-primary
      >
        <div className={styles.cardHeader}>
          <span className={styles.iconBadge} aria-hidden="true">
            <Icon name="userPlus" size={22} />
          </span>
          <div>
            <h2>Mời thành viên</h2>
            <p>
              Người nhận tham gia chuyến đi sau khi chấp nhận. Quyền sửa lịch trình và trách nhiệm
              quỹ không tự đi kèm.
            </p>
          </div>
        </div>
        {!allowed && (
          <Alert>Chỉ chủ chuyến của chuyến đi đang hoạt động mới được quản lý lời mời.</Alert>
        )}
        <Select
          label="Loại lời mời"
          value={kind}
          disabled={locked || Boolean(link)}
          onChange={(event) => {
            setKind(event.target.value === 'LINK' ? 'LINK' : 'EMAIL');
            setValidation(undefined);
          }}
        >
          <option value="EMAIL">Qua email</option>
          <option value="LINK">Bằng liên kết</option>
        </Select>
        {kind === 'EMAIL' && (
          <Input
            id="invitation-email"
            label="Email người nhận"
            type="email"
            autoComplete="off"
            leadingIcon={
              <span className={styles.fieldChip}>
                <Icon name="mail" size={18} />
              </span>
            }
            value={email}
            error={validation}
            disabled={locked}
            onChange={(event) => {
              setEmail(event.target.value);
              setValidation(undefined);
            }}
          />
        )}
        <Button
          type="submit"
          icon={<img src={send} alt="" width={18} height={18} />}
          loading={pending && attempt?.action === 'create'}
          disabled={locked || Boolean(link) || !invitation.createInvitation}
        >
          {kind === 'EMAIL' ? 'Gửi lời mời' : 'Tạo liên kết'}
        </Button>
        {error && (
          <Alert tone="warning" live>
            {invitationErrorMessage(error)}
            {error.correlationId && (
              <details>
                <summary>Chi tiết hỗ trợ</summary>
                <small>Mã tra cứu: {error.correlationId}</small>
              </details>
            )}
          </Alert>
        )}
        {attempt && !pending && (
          <Button disabled={!allowed || !canExecute(attempt)} onClick={() => void execute(attempt)}>
            Thử lại cùng yêu cầu
          </Button>
        )}
        {notice && <Alert live>{notice}</Alert>}
        {active && link && allowed && (
          <section className={styles.secret} aria-label="Liên kết một lần">
            <p>{link}</p>
            <div className={styles.actions}>
              <Button
                onClick={() => {
                  if (!navigator.clipboard?.writeText) {
                    setNotice(
                      'Không thể sao chép tự động. Hãy chọn và sao chép liên kết hiển thị.',
                    );
                    return;
                  }
                  void navigator.clipboard.writeText(link).then(
                    () => setNotice('Đã sao chép liên kết.'),
                    () =>
                      setNotice(
                        'Không thể sao chép tự động. Hãy chọn và sao chép liên kết hiển thị.',
                      ),
                  );
                }}
              >
                Sao chép liên kết
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLink(null);
                  setNotice('Liên kết đã đóng và không thể hiển thị lại.');
                }}
              >
                Đóng liên kết
              </Button>
            </div>
          </section>
        )}
      </form>
      <section className={styles.panel} aria-label="Lời mời hiện có" data-cp08-secondary>
        <div className={styles.cardHeader}>
          <span className={styles.iconBadge} data-tone="amber" aria-hidden="true">
            <Icon name="clock" size={22} />
          </span>
          <h2>Lời mời</h2>
        </div>
        <Select
          label="Trạng thái lời mời"
          value={filter}
          disabled={pending || !canReadInvitations}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
        >
          <option value="">Tất cả</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {!canReadInvitations && <Alert>Bạn không có quyền đọc danh sách lời mời.</Alert>}
        {canReadInvitations && query.isPending && <ContentState state="loading" headingLevel={2} />}
        {canReadInvitations && query.isError && (
          <Alert tone="warning" live>
            Chưa tải được danh sách hoặc trang tiếp theo.{' '}
            <Button
              variant="outline"
              onClick={() =>
                void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
              }
            >
              Thử tải lại lời mời
            </Button>
          </Alert>
        )}
        {canReadInvitations && !query.isPending && !query.isError && items.length === 0 && (
          <p>Chưa có lời mời phù hợp.</p>
        )}
        {canReadInvitations && query.data && !readAuthorityLost && (
          <p className={styles.metadata}>
            {items.length} lời mời đã tải{query.hasNextPage ? ' · Còn trang tiếp theo' : ''}
          </p>
        )}
        <ul className={styles.list}>
          {items.map((item) => (
            <li className={styles.item} key={item.id}>
              <span className={styles.itemAvatar} aria-hidden="true">
                {item.invitationType === 'EMAIL' && item.email ? (
                  item.email.charAt(0).toLocaleUpperCase('vi')
                ) : (
                  <Icon name="share" size={16} />
                )}
              </span>
              <strong>
                {item.invitationType === 'EMAIL' ? item.email : 'Lời mời bằng liên kết'}
              </strong>
              <span className={styles.itemStatus} data-status={item.status}>
                {labels[item.status]}
              </span>
              <span className={styles.itemMeta}>
                Hết hạn{' '}
                {new Date(item.expiresAt).toLocaleString('vi-VN', { timeZone: trip.timezone })}
              </span>
              {canManageInvitation(item) && (
                <div className={styles.actions}>
                  {item.invitationType === 'EMAIL' && (
                    <Button
                      variant="outline"
                      size="compact"
                      disabled={locked || item.status !== 'PENDING' || !invitation.resendInvitation}
                      onClick={() => version('resend', item)}
                    >
                      Gửi lại
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="compact"
                    className={styles.revoke}
                    disabled={locked || item.status !== 'PENDING' || !invitation.revokeInvitation}
                    onClick={() => {
                      if (canManageInvitation(item)) setConfirm(item);
                    }}
                  >
                    Thu hồi
                  </Button>
                </div>
              )}
              {confirm?.id === item.id && canManageInvitation(item) && (
                <div className={styles.confirm} role="group" aria-label="Xác nhận thu hồi">
                  <p>Thu hồi lời mời này? Liên kết sẽ không thể sử dụng.</p>
                  <Button disabled={locked} onClick={() => version('revoke', item)}>
                    Xác nhận thu hồi
                  </Button>
                  <Button variant="plain" onClick={() => setConfirm(null)}>
                    Hủy
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {canReadInvitations && query.hasNextPage && (
          <Button
            loading={query.isFetchingNextPage}
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            Tải thêm lời mời
          </Button>
        )}
      </section>
    </div>
  );
}
