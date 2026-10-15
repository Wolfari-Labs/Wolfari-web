import { useState, type FormEvent } from 'react';
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
import editIcon from '../../shared/assets/figma/55a47.svg';

export function ProfilePage({ previewEnabled }: { previewEnabled: boolean }) {
  const repository = useIdentityRepository();
  const [scenario, setScenario] = useState<IdentityScenario>('success');
  const [draft, setDraft] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: ['identity', 'self', scenario],
    queryFn: ({ signal }) => repository.readSelf({ scenario, signal }),
  });
  const result = query.data;
  const profile = result?.status === 'ready' ? result.data : null;
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
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = (draft ?? profile?.fullName ?? '').trim();
    if (!name || name.length > 150) {
      setValidation('Tên hiển thị cần từ 1 đến 150 ký tự.');
      document.getElementById('profile-name')?.focus();
    } else {
      setValidation(undefined);
      setUnavailable(true);
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
          <div className={styles.mobileSummary}>
            <span className={styles.mobileAvatar}>
              {profile.avatar ? (
                <img src={profile.avatar.src} alt={profile.avatar.alt} />
              ) : (
                profile.fullName
                  .split(/\s+/)
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')
              )}
            </span>
            <div>
              <strong>{profile.fullName}</strong>
              <p>{profile.email}</p>
            </div>
            <Button
              variant="plain"
              aria-label="Chỉnh sửa hồ sơ"
              aria-expanded={editing}
              aria-controls="profile-editor"
              onClick={() => setEditing((open) => !open)}
            >
              <img src={editIcon} alt="" />
            </Button>
          </div>
          <form
            id="profile-editor"
            className={`${styles.panel} ${styles.personal} ${editing ? styles.editorOpen : ''}`}
            onSubmit={submit}
            noValidate
            aria-label="Thông tin cá nhân"
          >
            <h2>Thông tin cá nhân</h2>
            <div className={styles.avatarRow}>
              <span className={styles.avatar}>
                {profile.avatar ? (
                  <img src={profile.avatar.src} alt={profile.avatar.alt} />
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
              <Button variant="outline" disabled title="Upload ảnh chưa được kết nối">
                Đổi ảnh
              </Button>
            </div>
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
            <Alert>
              Chỉnh sửa hồ sơ không làm thay đổi vai trò Owner/Member, Fund Holder hoặc quyền trong
              Trip.
            </Alert>
            <p className={styles.version}>
              Phiên bản hồ sơ: {profile.version} ·{' '}
              {profile.emailVerifiedAt ? 'Email đã xác minh' : 'Email chưa xác minh'}
            </p>
            <Button type="submit" icon={<img src={art['ac8db.svg']} alt="" />}>
              Lưu thay đổi
            </Button>
            {unavailable && (
              <Alert live>
                Đã kiểm tra tên hiển thị. Profile chưa kết nối; chưa lưu thay đổi hoặc tăng phiên
                bản.
              </Alert>
            )}
            <Button
              variant="outline"
              className={styles.desktopLogout}
              disabled
              title="Đăng xuất thật chưa được kết nối; đổi Guest trong shell preview"
            >
              Đăng xuất
            </Button>
          </form>
          <section className={styles.panel} aria-labelledby="profile-notifications">
            <h2 id="profile-notifications">Thông báo & thiết bị</h2>
            <p className={styles.muted}>Mỗi người tự quản lý kênh nhận thông báo của mình.</p>
            {['Thông báo trong ứng dụng', 'Nhận qua email', 'Cảnh báo giá'].map((label) => (
              <div className={styles.preference} key={label}>
                <span>
                  {label}
                  <small>Chưa có projection khả dụng</small>
                </span>
                <button type="button" disabled aria-label={`${label} · Chưa khả dụng`}>
                  —
                </button>
              </div>
            ))}
            <Alert>
              Thông báo và thiết bị nhận push chưa khả dụng. Phiên đăng nhập là dữ liệu riêng, không
              phải thiết bị nhận push.
            </Alert>
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
                  {sessionsQuery.data.data.items.map((session) => (
                    <li key={session.id}>
                      <strong>Phiên {session.id.slice(0, 8)}</strong>
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
                      <Button variant="outline" disabled>
                        Thu hồi phiên
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
          <Button className={styles.mobileLogout} disabled>
            Đăng xuất
          </Button>
        </div>
      )}
      {previewEnabled && (
        <details className="preview" data-preview="profile">
          <summary>Profile preview · Dữ liệu minh họa</summary>
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
