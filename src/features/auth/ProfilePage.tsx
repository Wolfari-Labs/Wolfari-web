import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIdentityRepository } from './repositories/identity-context';
import { identityScenarios, type IdentityScenario } from './model/identity';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Select } from '../../shared/components/Select';
import { ContentState } from '../../shared/components/ContentState';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import styles from './ProfilePage.module.css';

export function ProfilePage({ previewEnabled }: { previewEnabled: boolean }) {
  const repository = useIdentityRepository();
  const [scenario, setScenario] = useState<IdentityScenario>('success');
  const [draft, setDraft] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey: ['identity', 'self', scenario],
    queryFn: ({ signal }) => repository.readSelf({ scenario, signal }),
  });
  const result = query.data;
  const profile = result?.status === 'ready' ? result.data : null;
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    if (profile?.avatar && repository.getAvatar) {
      void repository.getAvatar({ signal: new AbortController().signal }).then((avatar) => {
        if (disposed || avatar.status !== 'ready') return;
        objectUrl = URL.createObjectURL(new Blob([avatar.bytes], { type: avatar.contentType ?? 'image/png' }));
        setAvatarUrl(objectUrl);
      });
    } else {
      setAvatarUrl(null);
    }
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?.avatar, repository]);
  const sessionsQuery = useQuery({
    queryKey: ['identity', 'sessions', scenario],
    queryFn: ({ signal }) => repository.listSessions({ scenario, signal }),
    enabled: showSessions && !!profile,
  });
  const error = query.isError
    ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
    : result?.status === 'error'
      ? result.error
      : null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = (draft ?? profile?.fullName ?? '').trim();
    if (!name || name.length > 150) {
      setValidation('Tên hiển thị cần từ 1 đến 150 ký tự.');
      document.getElementById('profile-name')?.focus();
    } else {
      setValidation(undefined);
      if (!repository.updateProfile) {
        setUnavailable(true);
        return;
      }
      setSaving(true);
      try {
        const result = await repository.updateProfile({
          intent: { fullName: name, expectedVersion: profile?.version ?? 0 },
          signal: new AbortController().signal,
        });
        if (result.status === 'updated') {
          setDraft(null);
          setUnavailable(false);
          await query.refetch();
        } else {
          setUnavailable(true);
        }
      } catch {
        setUnavailable(true);
      } finally {
        setSaving(false);
      }
    }
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
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : !profile ? (
        <ContentState state="empty" headingLevel={2} />
      ) : (
        <div className={styles.grid}>
          <form
            id="profile-editor"
            className={`${styles.panel} ${styles.personal}`}
            onSubmit={submit}
            noValidate
            aria-label="Thông tin cá nhân"
          >
            <h2>Thông tin cá nhân</h2>
            <div className={styles.avatarRow}>
              <span className={styles.avatar}>
                {profile.avatar && avatarUrl ? (
                  <img
                    className={styles.avatarPhoto}
                    src={avatarUrl}
                    alt={profile.avatar.alt}
                  />
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
              <Button variant="outline" disabled={!repository.uploadAvatar} title="Upload ảnh" onClick={() => avatarInput.current?.click()}>
                Đổi ảnh
              </Button>
              {repository.uploadAvatar && (
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file || !repository.uploadAvatar) return;
                    const uploaded = await repository.uploadAvatar({ file, filename: file.name, signal: new AbortController().signal });
                    if (uploaded.status !== 'uploaded' || !repository.updateProfile) {
                      setUnavailable(true);
                      return;
                    }
                    const updated = await repository.updateProfile({
                      intent: { fullName: profile.fullName, expectedVersion: profile.version, avatarObjectKey: uploaded.objectKey },
                      signal: new AbortController().signal,
                    });
                    if (updated.status === 'updated') await query.refetch();
                    else setUnavailable(true);
                  }}
                />
              )}
            </div>
            <div className={styles.fields}>
              <Input
                id="profile-name"
                label="Tên hiển thị"
                value={draft ?? profile.fullName}
                error={validation}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setValidation(undefined);
                  setUnavailable(false);
                }}
              />
              <Input label="Email" value={profile.email} readOnly type="email" />
            </div>
            <div className={styles.ruleNote}>
              <Alert>
                Thay đổi thông tin cá nhân không làm thay đổi vai trò và quyền của bạn trong chuyến
                đi.
              </Alert>
            </div>
            <Button
              className={styles.save}
              type="submit"
              disabled={saving}
              icon={<img src={art['ac8db.svg']} alt="" />}
            >
              Lưu thay đổi
            </Button>
            {unavailable && (
              <div className={styles.feedback}>
                <Alert live>
                  Chưa thể lưu thay đổi lúc này. Bản nháp của bạn vẫn được giữ trên trang.
                </Alert>
              </div>
            )}
            <Button
              variant="outline"
              className={styles.logout}
              disabled
              title="Chức năng đăng xuất chưa khả dụng"
            >
              Đăng xuất
            </Button>
          </form>
          <section className={styles.panel} aria-labelledby="profile-notifications">
            <h2 id="profile-notifications">Thông báo & thiết bị</h2>
            <p className={styles.muted}>Mỗi người tự quản lý kênh nhận thông báo của mình.</p>
            <div className={styles.preferences}>
              {[
                ['Email', 'Nhận nhắc việc và cập nhật qua email'],
                ['Thông báo đẩy', 'Nhận thông báo trên thiết bị đã đăng ký'],
                ['Cảnh báo giá', 'Nhận cảnh báo khi giá vé phù hợp với ngưỡng của bạn'],
              ].map(([label, description]) => (
                <div className={styles.preference} key={label}>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <button type="button" disabled aria-label={`${label} · Chưa khả dụng`}>
                    —
                  </button>
                </div>
              ))}
            </div>
            <section className={styles.devices} aria-labelledby="profile-devices">
              <h3 id="profile-devices">Thiết bị nhận thông báo</h3>
              <Alert live={false}>
                Chưa thể tải cài đặt thông báo và thiết bị của bạn. Vui lòng thử lại sau.
              </Alert>
            </section>
            <details
              onToggle={(e) => setShowSessions(e.currentTarget.open)}
              className={styles.sessions}
            >
              <summary>Phiên đăng nhập</summary>
              {sessionsQuery.isPending ? (
                <ContentState state="loading" headingLevel={2} />
              ) : sessionsQuery.isError || sessionsQuery.data?.status === 'error' ? (
                <ContentState
                  state="error"
                  headingLevel={2}
                  error={
                    sessionsQuery.data?.status === 'error'
                      ? sessionsQuery.data.error
                      : { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true }
                  }
                  onRetry={() => {
                    void sessionsQuery.refetch();
                  }}
                />
              ) : sessionsQuery.data?.status !== 'ready' ||
                sessionsQuery.data.data.items.length === 0 ? (
                <ContentState state="empty" headingLevel={2} />
              ) : (
                <ul>
                  {sessionsQuery.data.data.items.map((session, index) => (
                    <li key={session.id}>
                      <strong>Phiên đăng nhập {index + 1}</strong>
                      <span>
                        Tạo:{' '}
                        {new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'medium',
                          timeZone: 'Asia/Ho_Chi_Minh',
                        }).format(new Date(session.createdAt))}
                      </span>
                      <span>
                        Lần dùng cuối:{' '}
                        {session.lastUsedAt
                          ? new Intl.DateTimeFormat('vi-VN', {
                              dateStyle: 'medium',
                              timeZone: 'Asia/Ho_Chi_Minh',
                            }).format(new Date(session.lastUsedAt))
                          : 'Chưa có thông tin'}
                      </span>
                      <Button
                        variant="outline"
                        disabled={!repository.revokeSession}
                        onClick={async () => {
                          if (!repository.revokeSession) return;
                          const result = await repository.revokeSession({
                            sessionId: session.id,
                            signal: new AbortController().signal,
                          });
                          if (result.status === 'revoked') void sessionsQuery.refetch();
                        }}
                      >
                        Thu hồi phiên
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
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
          <p>
            Thông báo và thiết bị chưa có projection khả dụng. Phiên đăng nhập là dữ liệu riêng.
            Chức năng ghi hồ sơ chưa kết nối.
          </p>
          <Select
            label="Trạng thái hồ sơ"
            value={scenario}
            onChange={(e) => {
              const next = identityScenarios.find((s) => s === e.target.value);
              if (next) setScenario(next);
            }}
          >
            {identityScenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </details>
      )}
    </section>
  );
}
