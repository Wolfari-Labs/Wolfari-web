import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useOutletContext } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Select } from '../../shared/components/Select';
import { BrandWordmark } from '../../shared/components/BrandWordmark';
import { UserRound } from 'lucide-react';
import { Drawer } from '../../shared/components/Drawer';
import mailIcon from '../../shared/assets/figma/home-auth/3ed60.svg';
import lockIcon from '../../shared/assets/figma/home-auth/b9783.svg';
import arrowIcon from '../../shared/assets/figma/home-auth/ead6b.svg';
import rememberSwitch from '../../shared/assets/figma/home-auth/b5db1.svg';
import { AdminLoginHero, AdminLoginBadge, AdminLoginSubmitIcon } from '../shell/components/AdminLoginHero';
import { AuthHero } from './AuthHero';
import { validateAuth, type AuthFormValues, type AuthFormErrors } from './model/auth-validation';
import styles from './AuthPage.module.css';
import { useOptionalIdentityRepository } from './repositories/identity-context';
import { safeReturnTo, postAuthReturnTo } from '../../app/safe-return-to';
import { useIdentityTask } from './use-identity-task';
import { useOptionalSessionManager } from '../../app/session-context';

const noSession = () => 'anonymous';
const noSubscription = () => () => {};

type Preview = 'idle' | 'pending' | 'unknown' | 'error' | 'unavailable';
const previewStates: readonly Preview[] = ['idle', 'pending', 'unknown', 'error', 'unavailable'];

function authErrorMessage(code: string): string {
  if (code === 'UNAUTHENTICATED' || code === 'VALIDATION_FAILED')
    return 'Email hoặc mật khẩu chưa đúng.';
  if (code === 'RESOURCE_EXHAUSTED') return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
  if (code === 'SERVICE_UNAVAILABLE') return 'Chưa thể kết nối. Vui lòng thử lại.';
  return 'Chưa thể hoàn tất đăng nhập. Vui lòng thử lại sau.';
}

export function AuthPage({
  mode,
  previewEnabled,
  variant = 'default',
}: {
  mode: 'login' | 'register';
  previewEnabled: boolean;
  variant?: 'default' | 'admin';
}) {
  const register = mode === 'register';
  const admin = variant === 'admin';
  const context = useOutletContext<RouteContext | null>();
  const repository = useOptionalIdentityRepository();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useOptionalSessionManager();
  const sessionStatus = useSyncExternalStore(
    session?.subscribe ?? noSubscription,
    session?.status ?? noSession,
    noSession,
  );
  const [registrationAccepted, setRegistrationAccepted] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'credentials' | 'details'>('credentials');
  const [unavailableFeature, setUnavailableFeature] = useState<string | null>(null);
  useEffect(() => {
    if (registrationStep === 'details') document.getElementById('auth-fullName')?.focus();
  }, [registrationStep]);
  const identityNotice = (location.state as { identityNotice?: unknown } | null)?.identityNotice;
  // Password writes leave the private route before clearing its old session.
  // Keep this reauthentication destination stable during that transition.
  const reauthenticate =
    identityNotice === 'password-reset' ||
    identityNotice === 'password-changed' ||
    identityNotice === 'password-uncertain';
  const demoLogin = previewEnabled && !register ? context?.demoLogin : undefined;
  const [demoError, setDemoError] = useState(false);
  const [values, setValues] = useState<AuthFormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmation: '',
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [preview, setPreview] = useState<Preview>('idle');
  const { pending, run } = useIdentityTask();
  const [feedback, setFeedback] = useState<string | null>(() =>
    identityNotice === 'email-verified'
      ? 'Email đã được xác minh. Bạn có thể đăng nhập.'
      : identityNotice === 'password-reset' || identityNotice === 'password-changed'
        ? 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.'
        : identityNotice === 'password-uncertain'
          ? 'Chưa xác nhận được thay đổi mật khẩu. Thử mật khẩu mới; nếu không đăng nhập được, chọn Quên mật khẩu.'
          : null,
  );
  const [feedbackTone, setFeedbackTone] = useState<'error' | 'success'>(
    identityNotice === 'password-uncertain' ? 'error' : 'success',
  );
  const showError = (message: string) => {
    setFeedbackTone('error');
    setFeedback(message);
  };
  const field = (name: keyof AuthFormValues, value: string | boolean) => {
    setDemoError(false);
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (preview === 'pending' || pending || registrationAccepted) return;
    const next = validateAuth(mode, values);
    if (register && registrationStep === 'credentials') {
      delete next.fullName;
      delete next.acceptedTerms;
      setErrors(next);
      setFeedback(null);
      const firstCredentialError = Object.keys(next)[0];
      if (firstCredentialError) document.getElementById(`auth-${firstCredentialError}`)?.focus();
      else setRegistrationStep('details');
      return;
    }
    setErrors(next);
    setFeedback(null);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`auth-${first}`)?.focus();
    else if (demoLogin) {
      setDemoError(!demoLogin.activate({ email: values.email, password: values.password }));
      document.getElementById('auth-password')?.focus();
    } else if (repository && (register ? repository.register : repository.login)) {
      await run(
        'auth',
        async (signal) => {
          let result:
            | Awaited<ReturnType<NonNullable<typeof repository.register>>>
            | Awaited<ReturnType<NonNullable<typeof repository.login>>>;
          try {
            result = register
              ? await repository.register!({
                  intent: {
                    email: values.email.trim(),
                    password: values.password,
                    fullName: values.fullName.trim(),
                  },
                  signal,
                })
              : await repository.login!({
                  intent: { email: values.email.trim(), password: values.password },
                  signal,
                });
          } catch {
            if (signal.aborted) return;
            setPreview('idle');
            showError('Chưa thể kết nối. Vui lòng thử lại.');
            return;
          }
          signal.throwIfAborted();
          if (result.status === 'error') {
            setPreview('idle');
            showError(authErrorMessage(result.error.code));
          } else if (register) {
            setPreview('idle');
            setRegistrationAccepted(true);
            setValues((current) => ({ ...current, password: '', confirmation: '' }));
            setFeedbackTone('success');
            setFeedback(
              'Yêu cầu đăng ký đã được tiếp nhận. Nếu email hợp lệ, hãy kiểm tra hộp thư để xác minh tài khoản.',
            );
          } else {
            const returnTo = new URLSearchParams(location.search).get('returnTo');
            navigate(postAuthReturnTo(returnTo ?? (admin ? '/admin' : null)), { replace: true });
          }
        },
        () => showError('Chưa thể kết nối. Vui lòng thử lại.'),
      );
    } else setPreview('unavailable');
  };
  if (sessionStatus === 'authenticated' && !previewEnabled && !reauthenticate)
    return (
      <Navigate
        to={postAuthReturnTo(new URLSearchParams(location.search).get('returnTo') ?? (admin ? '/admin' : null))}
        replace
      />
    );
  return (
    <section
      className={`${styles.page} ${register ? styles.register : ''} ${admin ? styles.admin : ''}`}
      data-node-id={admin ? '946:16749' : register ? '944:15951' : '933:7623'}
      data-registration-step={register ? registrationStep : undefined}
    >
      {admin ? <AdminLoginHero /> : <AuthHero
        title={
          register ? ['Cùng Wolfari', 'lên đường'] : ['Cho những chuyến đi', 'thật đẹp, cùng nhau']
        }
      />}
      <div className={styles.formColumn}>
        <form
          className={styles.card}
          noValidate
          onSubmit={(event) => void submit(event)}
          aria-label={register ? 'Biểu mẫu đăng ký' : 'Biểu mẫu đăng nhập'}
        >
          {admin ? <AdminLoginBadge /> : <span className={styles.cardWordmark} aria-hidden="true">
            <BrandWordmark />
          </span>}
          <header className={styles.cardHeader}>
            <h1>{admin ? 'Đăng nhập quản trị' : register ? registrationStep === 'details' ? 'Hoàn tất thông tin tài khoản' : 'Tạo tài khoản, chuẩn bị đi thôi!' : 'Chào mừng trở lại!'}</h1>
            {registrationAccepted && <h2>Kiểm tra email của bạn</h2>}
            <p>
              {registrationAccepted
                ? 'Mở liên kết trong email để xác minh, sau đó đăng nhập bằng mật khẩu của bạn.'
                : admin ? 'Tài khoản cần có quyền Admin cấp hệ thống.' : register && registrationStep === 'details' ? 'Nhập tên hiển thị và xác nhận điều khoản để hoàn tất đăng ký. Chưa có yêu cầu tạo tài khoản nào được gửi.' : register
                  ? 'Đăng ký bằng email để bắt đầu tạo và tham gia các chuyến đi trong Wolfari.'
                  : 'Đăng nhập để tiếp tục lên kế hoạch cùng nhóm của bạn.'}
            </p>
          </header>
          {!registrationAccepted && (
            <>
              <div className={styles.fields}>
                {register && registrationStep === 'details' && (
                  <Input
                    id="auth-fullName"
                    required
                    label="Họ và tên"
                    name="fullName"
                    autoComplete="name"
                    value={values.fullName}
                    error={errors.fullName}
                    onChange={(e) => field('fullName', e.target.value)}
                    leadingIcon={<UserRound size={18} />}
                  />
                )}
                {(!register || registrationStep === 'credentials') && <Input
                  id="auth-email"
                  required
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={values.email}
                  error={errors.email}
                  onChange={(e) => field('email', e.target.value)}
                  leadingIcon={<img src={mailIcon} alt="" />}
                  autoFocus
                />}
                {(!register || registrationStep === 'credentials') && <Input
                  id="auth-password"
                  required
                  label="Mật khẩu"
                  type="password"
                  name="password"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'Tạo mật khẩu' : 'Mật khẩu của bạn'}
                  value={values.password}
                  error={errors.password}
                  onChange={(e) => field('password', e.target.value)}
                  leadingIcon={<img src={lockIcon} alt="" />}
                />}
                {register && registrationStep === 'credentials' && (
                  <Input
                    id="auth-confirmation"
                    required
                    label="Xác nhận mật khẩu"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    value={values.confirmation}
                    error={errors.confirmation}
                    onChange={(e) => field('confirmation', e.target.value)}
                    leadingIcon={<img src={lockIcon} alt="" />}
                  />
                )}
              </div>
              {!register && !admin && (
                <div className={styles.forgotRow}>
                  <button type="button" className={styles.remember} onClick={() => setUnavailableFeature('Ghi nhớ đăng nhập chưa được hỗ trợ. Phiên đăng nhập hiện tại vẫn tuân theo chính sách của máy chủ.')}><span><img src={rememberSwitch} alt="" /></span>Ghi nhớ đăng nhập</button>
                  <Link className={styles.forgotLink} to="/forgot-password">
                    Quên mật khẩu?
                  </Link>
                </div>
              )}
              {register && registrationStep === 'details' && (
                <>
                  <p className={styles.registrationEmail}>{values.email.trim()}</p>
                  <label className={styles.consent}>
                    <input
                      id="auth-acceptedTerms"
                      required
                      type="checkbox"
                      checked={values.acceptedTerms}
                      onChange={(e) => field('acceptedTerms', e.target.checked)}
                      aria-invalid={!!errors.acceptedTerms}
                      aria-describedby={errors.acceptedTerms ? 'auth-terms-error' : undefined}
                    />
                    Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật
                  </label>
                  {errors.acceptedTerms && (
                    <p className={styles.error} role="alert" id="auth-terms-error">
                      {errors.acceptedTerms}
                    </p>
                  )}
                </>
              )}
              {register && registrationStep === 'credentials' && <div className={styles.registrationNote}><strong>Dữ liệu đăng ký phải hợp lệ</strong><p>• Không tạo tài khoản khi dữ liệu thiếu hoặc không hợp lệ.<br />• Yêu cầu gửi lặp không được tạo tài khoản trùng.<br />• Chức năng yêu cầu đăng nhập chỉ dùng khi trạng thái tài khoản cho phép.</p></div>}
              {admin && <div className={styles.adminNote}><strong>Kiểm tra quyền</strong><p>Sau xác thực, backend kiểm tra quyền Admin trước khi cấp truy cập Web Admin.</p></div>}
              {/* The password rule sits on its field; the fixture-mode warning lives once in the
                  preview disclosure below the form. */}
              {demoError && (
                <Alert tone="error">
                  Email hoặc mật khẩu demo chưa đúng. Dùng tài khoản minh họa trong bảng xem trước.
                </Alert>
              )}
              <Button
                className={styles.submit}
                type="submit"
                loading={preview === 'pending' || !!pending}
              >
                {admin && <AdminLoginSubmitIcon />}
                {admin ? 'Đăng nhập Admin' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
                {!admin && <img src={arrowIcon} alt="" className={styles.submitArrow} />}
              </Button>
              {register && registrationStep === 'details' && <Button variant="plain" disabled={!!pending} onClick={() => { setRegistrationStep('credentials'); setErrors({}); }}>Quay lại thông tin đăng nhập</Button>}
              {!register && !admin && <><div className={styles.divider}><span />hoặc<span /></div><Button className={styles.google} variant="secondary" onClick={() => setUnavailableFeature('Đăng nhập với Google chưa được kết nối. Vui lòng đăng nhập bằng email và mật khẩu. Không có yêu cầu xác thực Google nào được gửi.')}>Tiếp tục với Google</Button></>}
            </>
          )}
          {pending && (
            <span role="status" className={styles.srOnly}>
              Đang xử lý…
            </span>
          )}
          {preview !== 'idle' && (
            <div className={styles.feedback}>
              <Alert tone={preview === 'error' ? 'error' : 'info'} live>
                {preview === 'pending'
                  ? 'Minh họa trạng thái đang xử lý. Không có request đang gửi.'
                  : preview === 'unknown'
                    ? 'Minh họa kết quả chưa xác định. Chưa có tài khoản hoặc phiên nào được xác nhận.'
                    : preview === 'error'
                      ? 'Chưa thể hoàn tất. Kiểm tra thông tin và thử lại.'
                      : 'Bản xem trước chưa hỗ trợ tạo tài khoản hoặc đăng nhập thật.'}
              </Alert>
            </div>
          )}
          {feedback && (
            <div className={styles.feedback}>
              <Alert tone={feedbackTone} live>
                {feedback}
              </Alert>
            </div>
          )}
          {!admin && <div className={styles.alternative}>
            <span>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
            <Link
              to={`${register ? '/login' : '/register'}?returnTo=${encodeURIComponent(safeReturnTo(new URLSearchParams(location.search).get('returnTo')))}`}
            >
              {register ? 'Đăng nhập' : 'Đăng ký'}
            </Link>
          </div>}
        </form>
        {previewEnabled && (
          <details className="preview" data-preview="auth-form" open={!!demoLogin}>
            <summary>Auth form preview · Không xác thực</summary>
            {demoLogin && (
              <Alert live={false}>
                <p>Tài khoản demo · Chỉ dữ liệu fixture</p>
                <p>
                  Email: <strong>{demoLogin.account.email}</strong>
                  <br />
                  Mật khẩu: <strong>{demoLogin.account.password}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setValues((current) => ({ ...current, ...demoLogin.account }));
                    setErrors({});
                    setDemoError(false);
                    setPreview('idle');
                    document.getElementById('auth-email')?.focus();
                  }}
                >
                  Điền tài khoản demo
                </Button>
              </Alert>
            )}
            <Select
              label="Trạng thái biểu mẫu"
              value={preview}
              onChange={(e) => {
                const next = previewStates.find((s) => s === e.target.value);
                if (next) setPreview(next);
              }}
            >
              {previewStates.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </details>
        )}
      </div>
      <Drawer open={unavailableFeature !== null} label="Tính năng chưa khả dụng" side="center" onDismiss={() => setUnavailableFeature(null)}><Alert live={false}>{unavailableFeature}</Alert></Drawer>
    </section>
  );
}
