import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIdentityRepository } from './repositories/identity-context';
import {
  identityScenarios,
  type IdentityScenario,
  type SelfProfileViewModel,
} from './model/identity';
import type { DomainError } from '../../shared/types/result';
import { useOptionalSessionManager } from '../../app/session-context';
import { useIdentityTask } from './use-identity-task';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Select } from '../../shared/components/Select';
import { ContentState } from '../../shared/components/ContentState';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import styles from './ProfilePage.module.css';

const unavailable: DomainError = {
  code: 'SERVICE_UNAVAILABLE',
  correlationId: null,
  retryable: true,
};
class SessionReadError extends Error {
  constructor(readonly domain: DomainError) {
    super(domain.code);
  }
}
function mutationMessage(error: DomainError): string {
  const message =
    error.code === 'VERSION_CONFLICT'
      ? 'Hồ sơ đã thay đổi ở nơi khác. Dữ liệu đã được yêu cầu tải lại; kiểm tra bản nháp rồi lưu lại.'
      : error.code === 'UNAUTHENTICATED'
        ? 'Thông tin xác thực không hợp lệ hoặc phiên đã hết hạn. Kiểm tra thông tin hoặc đăng nhập lại.'
        : error.code === 'VALIDATION_FAILED'
          ? 'Thông tin chưa hợp lệ.'
          : error.code === 'RESOURCE_EXHAUSTED'
            ? 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
            : 'Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.';
  return message + (error.correlationId ? ' Mã hỗ trợ: ' + error.correlationId : '');
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));

export function ProfilePage({ previewEnabled }: { previewEnabled: boolean }) {
  const repository = useIdentityRepository();
  const queryClient = useQueryClient();
  const sessionManager = useOptionalSessionManager();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<IdentityScenario>('success');
  const [draft, setDraft] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirmation: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const { pending, run } = useIdentityTask();
  const busy = pending !== null;
  const profileKey = ['identity', 'self', scenario] as const;
  const sessionsKey = ['identity', 'sessions', scenario] as const;
  const query = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => repository.readSelf({ scenario, signal }),
    enabled: !endingSession,
  });
  const result = query.data;
  const profile = result?.status === 'ready' ? result.data : null;
  const sessionsQuery = useInfiniteQuery({
    queryKey: sessionsKey,
    initialPageParam: null as string | null,
    queryFn: async ({ signal, pageParam }) => {
      const response = await repository.listSessions({
        scenario,
        signal,
        cursor: pageParam,
        limit: 20,
      });
      if (response.status === 'error') throw new SessionReadError(response.error);
      return response.status === 'empty' ? { items: [], nextCursor: null } : response.data;
    },
    getNextPageParam: (last, _pages, _param, params) =>
      last.nextCursor && !params.includes(last.nextCursor) ? last.nextCursor : undefined,
    enabled: showSessions && !!profile && !endingSession,
    retry: false,
  });
  const sessionItems = Array.from(
    new Map(
      (sessionsQuery.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  );

  // The endpoint stays constant after upload; version is the avatar cache boundary.
  const avatarPresent = !!profile?.avatar;
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setAvatarUrl(null);
    setAvatarError(false);
    if (avatarPresent && repository.getAvatar && typeof URL.createObjectURL === 'function') {
      void (async () => {
        try {
          const avatar = await repository.getAvatar!({ signal: controller.signal });
          controller.signal.throwIfAborted();
          if (avatar.status !== 'ready') {
            setAvatarError(true);
            return;
          }
          objectUrl = URL.createObjectURL(
            new Blob([avatar.bytes], { type: avatar.contentType ?? 'image/png' }),
          );
          setAvatarUrl(objectUrl);
        } catch {
          if (!controller.signal.aborted) setAvatarError(true);
        }
      })();
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarPresent, profile?.id, profile?.version, repository]);

  const error = query.isError ? unavailable : result?.status === 'error' ? result.error : null;
  const applyProfile = async (updated: SelfProfileViewModel) => {
    queryClient.setQueryData(profileKey, { status: 'ready', data: updated });
    await queryClient.invalidateQueries({ queryKey: ['shell'] });
  };
  const mutationFailed = async (failure: DomainError, prefix = '') => {
    setFeedback(prefix + mutationMessage(failure));
    if (failure.code === 'VERSION_CONFLICT') await query.refetch();
  };

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const name = (draft ?? profile?.fullName ?? '').trim();
    if (!name || Array.from(name).length > 150) {
      setValidation('Tên hiển thị cần từ 1 đến 150 ký tự.');
      document.getElementById('profile-name')?.focus();
      return;
    }
    if (!repository.updateProfile || !profile) {
      setFeedback('Chưa thể lưu thay đổi lúc này. Identity chưa kết nối; bản nháp chưa được lưu.');
      return;
    }
    setValidation(undefined);
    setFeedback(null);
    void run(
      'profile',
      async (signal) => {
        const update = await repository.updateProfile!({
          intent: { fullName: name, expectedVersion: profile.version },
          signal,
        });
        signal.throwIfAborted();
        if (update.status === 'updated') {
          setDraft(null);
          setFeedback('Đã lưu thông tin cá nhân.');
          await applyProfile(update.profile);
        } else await mutationFailed(update.error);
      },
      () =>
        setFeedback(
          'Chưa thể xác nhận lưu thay đổi. Bản nháp vẫn được giữ; tải lại dữ liệu trước khi thử lại.',
        ),
    );
  };

  const uploadAvatar = (file: File) => {
    if (busy) return;
    if (!repository.uploadAvatar || !repository.updateProfile || !profile) {
      setFeedback('Identity chưa kết nối; ảnh chưa được tải lên.');
      return;
    }
    if (
      !['image/png', 'image/jpeg'].includes(file.type) ||
      file.size < 1 ||
      file.size > 10 * 1024 * 1024
    ) {
      setFeedback('Ảnh phải là PNG/JPEG, không rỗng và không vượt quá 10 MB.');
      return;
    }
    setFeedback(null);
    void run(
      'avatar',
      async (signal) => {
        const uploaded = await repository.uploadAvatar!({ file, filename: file.name, signal });
        signal.throwIfAborted();
        if (uploaded.status !== 'uploaded') {
          await mutationFailed(uploaded.error);
          return;
        }
        const attached = await repository.updateProfile!({
          intent: { expectedVersion: profile.version, avatarObjectKey: uploaded.objectKey },
          signal,
        });
        signal.throwIfAborted();
        if (attached.status === 'updated') {
          setFeedback('Đã cập nhật ảnh đại diện.');
          await applyProfile(attached.profile);
        } else
          await mutationFailed(attached.error, 'Ảnh đã tải lên nhưng chưa được gắn vào hồ sơ. ');
      },
      () => setFeedback('Chưa thể xác nhận thay ảnh. Tải lại hồ sơ để kiểm tra trước khi thử lại.'),
    );
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!repository.changePassword) {
      setPasswordError('Identity chưa kết nối; mật khẩu chưa được đổi.');
      return;
    }
    const invalid = !password.current
      ? 'profile-current-password'
      : Array.from(password.next).length < 15 || Array.from(password.next).length > 128
        ? 'profile-new-password'
        : password.next !== password.confirmation
          ? 'profile-confirm-password'
          : null;
    if (invalid) {
      setPasswordError(
        'Nhập mật khẩu hiện tại; mật khẩu mới cần từ 15 đến 128 ký tự và phải khớp khi nhập lại.',
      );
      document.getElementById(invalid)?.focus();
      return;
    }
    setPasswordError(null);
    void run(
      'password',
      async (signal) => {
        const changed = await repository.changePassword!({
          currentPassword: password.current,
          newPassword: password.next,
          signal,
        });
        signal.throwIfAborted();
        if (changed.status === 'changed') {
          setEndingSession(true);
          setPassword({ current: '', next: '', confirmation: '' });
          // Leave the private route before notifying its guard; otherwise the guard's
          // expiry redirect can replace this explicit success notice/URL.
          await navigate('/login', {
            replace: true,
            flushSync: true,
            state: { identityNotice: 'password-changed' },
          });
          sessionManager?.clear?.();
          await queryClient.cancelQueries();
          queryClient.removeQueries();
        } else setPasswordError(mutationMessage(changed.error));
      },
      () =>
        setPasswordError(
          'Chưa thể xác nhận đổi mật khẩu. Không tự gửi lại yêu cầu; kiểm tra bằng cách đăng nhập.',
        ),
    );
  };

  const resendVerification = () => {
    if (!repository.resendEmailVerification) {
      setFeedback('Identity chưa kết nối; chưa thể gửi lại email xác minh.');
      return;
    }
    void run(
      'verify',
      async (signal) => {
        const resent = await repository.resendEmailVerification!({ signal });
        signal.throwIfAborted();
        setFeedback(
          resent.status === 'accepted'
            ? 'Yêu cầu gửi email xác minh đã được tiếp nhận. Hãy kiểm tra hộp thư.'
            : mutationMessage(resent.error),
        );
      },
      () => setFeedback('Chưa thể gửi lại email xác minh lúc này. Vui lòng thử lại sau.'),
    );
  };

  const revokeSession = (sessionId: string) => {
    if (!repository.revokeSession) return;
    setSessionFeedback(null);
    void run(
      'revoke:' + sessionId,
      async (signal) => {
        const revoked = await repository.revokeSession!({ sessionId, signal });
        signal.throwIfAborted();
        if (revoked.status === 'revoked') {
          setSessionFeedback('Đã thu hồi phiên.');
          await queryClient.resetQueries({ queryKey: sessionsKey, exact: true });
        } else setSessionFeedback(mutationMessage(revoked.error));
      },
      () =>
        setSessionFeedback('Chưa thể xác nhận thu hồi phiên. Tải lại danh sách trước khi thử lại.'),
    );
  };

  return (
    <section className={styles.page} data-node-id="299:1847">
      <h1>Tài khoản của tôi</h1>
      <p className={styles.subtitle}>
        Quản lý thông tin cá nhân, kênh nhận thông báo và thiết bị của riêng bạn.
      </p>
      {query.isPending ? (
        <ContentState state="loading" headingLevel={2} />
      ) : error ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={() => void query.refetch()}
        />
      ) : !profile ? (
        <ContentState state="empty" headingLevel={2} />
      ) : (
        <div className={styles.grid}>
          <form
            id="profile-editor"
            className={styles.panel + ' ' + styles.personal}
            onSubmit={submitProfile}
            noValidate
            aria-label="Thông tin cá nhân"
          >
            <h2>Thông tin cá nhân</h2>
            <div className={styles.avatarRow}>
              <span className={styles.avatar}>
                {profile.avatar && avatarUrl ? (
                  <img className={styles.avatarPhoto} src={avatarUrl} alt={profile.avatar.alt} />
                ) : (
                  <>
                    <img src={art['95b35.svg']} alt="" />
                    <strong>
                      {profile.fullName
                        .split(/\s+/)
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')}
                    </strong>
                  </>
                )}
              </span>
              <Button
                variant="outline"
                loading={pending === 'avatar'}
                disabled={busy || !repository.uploadAvatar}
                title="Upload ảnh"
                onClick={() => avatarInput.current?.click()}
              >
                Đổi ảnh
              </Button>
              <input
                aria-label="Chọn ảnh đại diện"
                ref={avatarInput}
                hidden
                type="file"
                accept="image/png,image/jpeg"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) uploadAvatar(file);
                }}
              />
            </div>
            {avatarError && (
              <Alert tone="info">Chưa tải được ảnh đại diện. Thông tin hồ sơ vẫn được giữ.</Alert>
            )}
            <div className={styles.fields}>
              <Input
                id="profile-name"
                label="Tên hiển thị"
                value={draft ?? profile.fullName}
                disabled={busy}
                error={validation}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setValidation(undefined);
                  setFeedback(null);
                }}
              />
              <Input label="Email" value={profile.email} readOnly type="email" />
            </div>
            {!profile.emailVerifiedAt && (
              <Alert tone="info">
                <p>Email chưa được xác minh.</p>
                <Button
                  variant="outline"
                  disabled={busy || !repository.resendEmailVerification}
                  loading={pending === 'verify'}
                  onClick={resendVerification}
                >
                  Gửi lại email xác minh
                </Button>
              </Alert>
            )}
            <Button
              className={styles.save}
              type="submit"
              loading={pending === 'profile'}
              disabled={busy}
              icon={<img src={art['ac8db.svg']} alt="" />}
            >
              Lưu thay đổi
            </Button>
            {feedback && (
              <div className={styles.feedback}>
                <Alert live>{feedback}</Alert>
              </div>
            )}
            <Button
              variant="outline"
              className={styles.logout}
              disabled
              title="Backend chưa cung cấp session_id của phiên hiện tại"
            >
              Đăng xuất (chưa khả dụng)
            </Button>
          </form>
          <section className={styles.panel} aria-labelledby="profile-notifications">
            <h2 id="profile-notifications">Thông báo & thiết bị</h2>
            <p className={styles.muted}>Mỗi người tự quản lý kênh nhận thông báo của mình.</p>
            <Alert live={false}>
              Cài đặt thông báo và thiết bị chưa có projection Identity khả dụng.
            </Alert>
            <details
              onToggle={(event) => setShowSessions(event.currentTarget.open)}
              className={styles.sessions}
            >
              <summary>Phiên đăng nhập</summary>
              {sessionsQuery.isPending ? (
                <ContentState state="loading" headingLevel={2} />
              ) : (
                <>
                  {sessionsQuery.isError && (
                    <ContentState
                      state="error"
                      headingLevel={2}
                      error={
                        sessionsQuery.error instanceof SessionReadError
                          ? sessionsQuery.error.domain
                          : unavailable
                      }
                      onRetry={() =>
                        void (sessionsQuery.isFetchNextPageError
                          ? sessionsQuery.fetchNextPage()
                          : sessionsQuery.refetch())
                      }
                    />
                  )}
                  {!sessionsQuery.isError && sessionItems.length === 0 && (
                    <ContentState state="empty" headingLevel={2} />
                  )}
                  <ul>
                    {sessionItems.map((session, index) => (
                      <li key={session.id}>
                        <strong>Phiên đăng nhập {index + 1}</strong>
                        <span>Tạo: {formatDate(session.createdAt)}</span>
                        <span>
                          Lần dùng cuối:{' '}
                          {session.lastUsedAt
                            ? formatDate(session.lastUsedAt)
                            : 'Chưa có thông tin'}
                        </span>
                        <Button
                          variant="outline"
                          disabled={busy || !repository.revokeSession}
                          loading={pending === 'revoke:' + session.id}
                          onClick={() => revokeSession(session.id)}
                        >
                          Thu hồi phiên
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {sessionsQuery.hasNextPage && (
                    <Button
                      variant="outline"
                      disabled={busy || sessionsQuery.isFetching}
                      loading={sessionsQuery.isFetchingNextPage}
                      onClick={() => void sessionsQuery.fetchNextPage()}
                    >
                      Tải thêm phiên
                    </Button>
                  )}
                  {sessionFeedback && <Alert live>{sessionFeedback}</Alert>}
                </>
              )}
            </details>
          </section>
          <form
            className={styles.panel + ' ' + styles.ruleNote}
            aria-label="Đổi mật khẩu"
            noValidate
            onSubmit={submitPassword}
          >
            <h2>Đổi mật khẩu</h2>
            <div className={styles.fields}>
              <Input
                id="profile-current-password"
                label="Mật khẩu hiện tại"
                type="password"
                autoComplete="current-password"
                disabled={busy}
                value={password.current}
                onChange={(event) => setPassword({ ...password, current: event.target.value })}
              />
              <Input
                id="profile-new-password"
                label="Mật khẩu mới"
                type="password"
                autoComplete="new-password"
                disabled={busy}
                value={password.next}
                onChange={(event) => setPassword({ ...password, next: event.target.value })}
              />
              <Input
                id="profile-confirm-password"
                label="Nhập lại mật khẩu mới"
                type="password"
                autoComplete="new-password"
                disabled={busy}
                value={password.confirmation}
                onChange={(event) => setPassword({ ...password, confirmation: event.target.value })}
              />
            </div>
            {passwordError && (
              <Alert tone="error" live>
                {passwordError}
              </Alert>
            )}
            <Button
              type="submit"
              variant="outline"
              disabled={busy}
              loading={pending === 'password'}
            >
              Đổi mật khẩu
            </Button>
          </form>
        </div>
      )}
      {previewEnabled && (
        <details className="preview" data-preview="profile">
          <summary>Profile preview · Dữ liệu minh họa</summary>
          {profile && (
            <p>
              Phiên bản hồ sơ: {profile.version} ·{' '}
              {profile.emailVerifiedAt ? 'Email đã xác minh' : 'Email chưa xác minh'}
            </p>
          )}
          <Select
            label="Trạng thái hồ sơ"
            value={scenario}
            disabled={busy}
            onChange={(event) => {
              const next = identityScenarios.find((value) => value === event.target.value);
              if (next) setScenario(next);
            }}
          >
            {identityScenarios.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </details>
      )}
    </section>
  );
}
