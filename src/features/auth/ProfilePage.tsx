import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIdentityRepository } from './repositories/identity-context';
import { identityScenarios, type IdentityScenario, type IdentitySessionsViewModel } from './model/identity';
import { useOptionalSessionManager } from '../../app/session-context';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Select } from '../../shared/components/Select';
import { ContentState } from '../../shared/components/ContentState';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import styles from './ProfilePage.module.css';

function mutationMessage(code: string): string {
  if (code === 'VERSION_CONFLICT') return 'Hồ sơ đã thay đổi ở nơi khác. Tải lại dữ liệu rồi thử lại.';
  if (code === 'UNAUTHENTICATED') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (code === 'VALIDATION_FAILED') return 'Thông tin chưa hợp lệ.';
  return 'Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.';
}

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
  const [sessionCursor, setSessionCursor] = useState<string | null>(null);
  const [sessionItems, setSessionItems] = useState<IdentitySessionsViewModel['items']>([]);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState({ current: '', next: '', confirmation: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey: ['identity', 'self', scenario],
    queryFn: ({ signal }) => repository.readSelf({ scenario, signal }),
  });
  const result = query.data;
  const profile = result?.status === 'ready' ? result.data : null;
  const sessionsQuery = useQuery({
    queryKey: ['identity', 'sessions', scenario, sessionCursor],
    queryFn: ({ signal }) => repository.listSessions({ scenario, signal, cursor: sessionCursor, limit: 20 }),
    enabled: showSessions && !!profile,
  });

  useEffect(() => {
    setSessionItems([]);
    setSessionCursor(null);
  }, [scenario]);

  useEffect(() => {
    const sessionResult = sessionsQuery.data;
    if (sessionResult?.status === 'ready') {
      setSessionItems((current) => sessionCursor ? [...current, ...sessionResult.data.items] : sessionResult.data.items);
    }
  }, [sessionsQuery.data, sessionCursor]);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    if (profile?.avatar && repository.getAvatar && typeof URL.createObjectURL === 'function') {
      void repository.getAvatar({ signal: new AbortController().signal }).then((avatar) => {
        if (disposed || avatar.status !== 'ready') return;
        objectUrl = URL.createObjectURL(new Blob([avatar.bytes], { type: avatar.contentType ?? 'image/png' }));
        setAvatarUrl(objectUrl);
      });
    } else setAvatarUrl(null);
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?.avatar, repository]);

  const error = query.isError ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true } : result?.status === 'error' ? result.error : null;

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
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
    setSaving(true);
    try {
      const update = await repository.updateProfile({ intent: { fullName: name, expectedVersion: profile.version }, signal: new AbortController().signal });
      if (update.status === 'updated') {
        setDraft(null);
        await query.refetch();
      } else {
        setFeedback(mutationMessage(update.error.code));
        if (update.error.code === 'VERSION_CONFLICT') void query.refetch();
      }
    } catch {
      setFeedback('Chưa thể lưu thay đổi lúc này. Bản nháp của bạn vẫn được giữ trên trang.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!repository.uploadAvatar || !repository.updateProfile || !profile) {
      setFeedback('Identity chưa kết nối; ảnh chưa được tải lên.');
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setFeedback('Ảnh phải là PNG/JPEG và không vượt quá 10 MB.');
      return;
    }
    setAvatarBusy(true);
    try {
      const uploaded = await repository.uploadAvatar({ file, filename: file.name, signal: new AbortController().signal });
      if (uploaded.status !== 'uploaded') {
        setFeedback(mutationMessage(uploaded.error.code));
        return;
      }
      const attached = await repository.updateProfile({ intent: { fullName: profile.fullName, expectedVersion: profile.version, avatarObjectKey: uploaded.objectKey }, signal: new AbortController().signal });
      if (attached.status === 'updated') await query.refetch();
      else {
        setFeedback(`Ảnh đã tải lên nhưng chưa được gắn vào hồ sơ. ${mutationMessage(attached.error.code)}`);
        if (attached.error.code === 'VERSION_CONFLICT') void query.refetch();
      }
    } catch {
      setFeedback('Chưa thể hoàn tất tải ảnh lúc này. Ảnh chưa được gắn vào hồ sơ.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!repository.changePassword) {
      setFeedback('Identity chưa kết nối; mật khẩu chưa được đổi.');
      return;
    }
    if (Array.from(password.next).length < 15 || Array.from(password.next).length > 128 || password.next !== password.confirmation) {
      setFeedback('Mật khẩu mới cần từ 15 đến 128 ký tự và phải khớp khi nhập lại.');
      return;
    }
    setPasswordBusy(true);
    try {
      const changed = await repository.changePassword({ currentPassword: password.current, newPassword: password.next, signal: new AbortController().signal });
      if (changed.status === 'changed') {
        sessionManager?.clear?.();
        navigate('/login', { replace: true });
      } else setFeedback(mutationMessage(changed.error.code));
    } catch {
      setFeedback('Chưa thể đổi mật khẩu lúc này. Phiên hiện tại vẫn được giữ nguyên.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const resendVerification = async () => {
    if (!repository.resendEmailVerification) {
      setFeedback('Identity chưa kết nối; chưa thể gửi lại email xác minh.');
      return;
    }
    try {
      const resent = await repository.resendEmailVerification({ signal: new AbortController().signal });
      setFeedback(resent.status === 'accepted' ? 'Đã gửi lại email xác minh. Hãy kiểm tra hộp thư.' : mutationMessage(resent.error.code));
    } catch {
      setFeedback('Chưa thể gửi lại email xác minh lúc này. Vui lòng thử lại sau.');
    }
  };

  return (
    <section className={styles.page} data-node-id="299:1847">
      <h1>Tài khoản của tôi</h1>
      <p className={styles.subtitle}>Quản lý thông tin cá nhân, kênh nhận thông báo và thiết bị của riêng bạn.</p>
      {query.isPending ? <ContentState state="loading" headingLevel={2} /> : error ? (
        <ContentState state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'} error={error} headingLevel={2} onRetry={() => void query.refetch()} />
      ) : !profile ? <ContentState state="empty" headingLevel={2} /> : (
        <div className={styles.grid}>
          <form id="profile-editor" className={`${styles.panel} ${styles.personal}`} onSubmit={(event) => void submitProfile(event)} noValidate aria-label="Thông tin cá nhân">
              <h2>Thông tin cá nhân</h2>
              <div className={styles.avatarRow}>
                <span className={styles.avatar}>
                  {profile.avatar && avatarUrl ? <img className={styles.avatarPhoto} src={avatarUrl} alt={profile.avatar.alt} /> : <><img src={art['95b35.svg']} alt="" /><strong>{profile.fullName.split(/\s+/).map((s) => s[0]).slice(0, 2).join('')}</strong></>}
                </span>
                <Button variant="outline" loading={avatarBusy} disabled={!repository.uploadAvatar} title="Upload ảnh" onClick={() => avatarInput.current?.click()}>Đổi ảnh</Button>
                <input ref={avatarInput} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadAvatar(file); }} />
              </div>
              <div className={styles.fields}>
                <Input id="profile-name" label="Tên hiển thị" value={draft ?? profile.fullName} error={validation} onChange={(event) => { setDraft(event.target.value); setValidation(undefined); setFeedback(null); }} />
                <Input label="Email" value={profile.email} readOnly type="email" />
              </div>
              {!profile.emailVerifiedAt && <Alert tone="info"><p>Email chưa được xác minh.</p><Button variant="outline" onClick={() => void resendVerification()}>Gửi lại email xác minh</Button></Alert>}
              <Button className={styles.save} type="submit" loading={saving} icon={<img src={art['ac8db.svg']} alt="" />}>Lưu thay đổi</Button>
            {feedback && <div className={styles.feedback}><Alert live>{feedback}</Alert></div>}
            <Button variant="outline" className={styles.logout} disabled title="Backend chưa cung cấp session_id của phiên hiện tại">Đăng xuất (chưa khả dụng)</Button>
          </form>
          <section className={styles.panel} aria-labelledby="profile-notifications">
            <h2 id="profile-notifications">Thông báo & thiết bị</h2>
            <p className={styles.muted}>Mỗi người tự quản lý kênh nhận thông báo của mình.</p>
            <Alert live={false}>Cài đặt thông báo và thiết bị chưa có projection Identity khả dụng.</Alert>
            <details onToggle={(event) => setShowSessions(event.currentTarget.open)} className={styles.sessions}>
              <summary>Phiên đăng nhập</summary>
              {sessionsQuery.isPending ? <ContentState state="loading" headingLevel={2} /> : sessionsQuery.isError || sessionsQuery.data?.status === 'error' ? (
                <ContentState state="error" headingLevel={2} error={sessionsQuery.data?.status === 'error' ? sessionsQuery.data.error : { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true }} onRetry={() => void sessionsQuery.refetch()} />
              ) : sessionItems.length === 0 ? <ContentState state="empty" headingLevel={2} /> : (
                <>
                  <ul>{sessionItems.map((session, index) => <li key={session.id}><strong>Phiên đăng nhập {index + 1}</strong><span>Tạo: {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(session.createdAt))}</span><span>Lần dùng cuối: {session.lastUsedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(session.lastUsedAt)) : 'Chưa có thông tin'}</span><Button variant="outline" disabled={!repository.revokeSession} onClick={async () => { if (!repository.revokeSession) return; const revoked = await repository.revokeSession({ sessionId: session.id, signal: new AbortController().signal }); setFeedback(revoked.status === 'revoked' ? 'Đã thu hồi phiên.' : mutationMessage(revoked.error.code)); if (revoked.status === 'revoked') { setSessionItems([]); setSessionCursor(null); void queryClient.invalidateQueries({ queryKey: ['identity', 'sessions'] }); } }}>Thu hồi phiên</Button></li>)}</ul>
                  {sessionsQuery.data?.status === 'ready' && sessionsQuery.data.data.nextCursor && <Button variant="outline" onClick={() => setSessionCursor(sessionsQuery.data?.status === 'ready' ? sessionsQuery.data.data.nextCursor : null)}>Tải thêm phiên</Button>}
                </>
              )}
            </details>
          </section>
          <section className={`${styles.panel} ${styles.ruleNote}`} aria-label="Đổi mật khẩu">
            <h2>Đổi mật khẩu</h2>
            <div className={styles.fields}>
              <Input label="Mật khẩu hiện tại" type="password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} />
              <Input label="Mật khẩu mới" type="password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} />
              <Input label="Nhập lại mật khẩu mới" type="password" value={password.confirmation} onChange={(event) => setPassword({ ...password, confirmation: event.target.value })} />
            </div>
            <Button variant="outline" loading={passwordBusy} onClick={() => void submitPassword()}>Đổi mật khẩu</Button>
          </section>
        </div>
      )}
      {previewEnabled && <details className="preview" data-preview="profile"><summary>Profile preview · Dữ liệu minh họa</summary>{profile && <p>Phiên bản hồ sơ: {profile.version} · {profile.emailVerifiedAt ? 'Email đã xác minh' : 'Email chưa xác minh'}</p>}<Select label="Trạng thái hồ sơ" value={scenario} onChange={(event) => { const next = identityScenarios.find((value) => value === event.target.value); if (next) setScenario(next); }}>{identityScenarios.map((value) => <option key={value}>{value}</option>)}</Select></details>}
    </section>
  );
}
