import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Select } from '../../shared/components/Select';
import { TravelCollage } from '../../shared/components/TravelCollage';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import loginSubmitIcon from '../../shared/assets/figma/e48f0.svg';
import registerSubmitIcon from '../../shared/assets/figma/cadd3.svg';
import { validateAuth, type AuthFormValues, type AuthFormErrors } from './model/auth-validation';
import styles from './AuthPage.module.css';
import { useOptionalIdentityRepository } from './repositories/identity-context';
import { safeReturnTo } from '../../app/safe-return-to';
import { useIdentityTask } from './use-identity-task';

type Preview = 'idle' | 'pending' | 'unknown' | 'error' | 'unavailable';
const previewStates: readonly Preview[] = ['idle', 'pending', 'unknown', 'error', 'unavailable'];

function authErrorMessage(code: string): string {
  if (code === 'UNAUTHENTICATED' || code === 'VALIDATION_FAILED')
    return 'Email hoặc mật khẩu chưa đúng.';
  if (code === 'RESOURCE_EXHAUSTED') return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
  if (code === 'SERVICE_UNAVAILABLE') return 'Identity hiện không khả dụng. Vui lòng thử lại sau.';
  return 'Chưa thể hoàn tất đăng nhập. Vui lòng thử lại sau.';
}

export function AuthPage({
  mode,
  previewEnabled,
}: {
  mode: 'login' | 'register';
  previewEnabled: boolean;
}) {
  const register = mode === 'register';
  const context = useOutletContext<RouteContext | null>();
  const repository = useOptionalIdentityRepository();
  const navigate = useNavigate();
  const location = useLocation();
  const identityNotice = (location.state as { identityNotice?: unknown } | null)?.identityNotice;
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
      ? 'Đăng ký thành công. Email đã được xác minh, bạn có thể đăng nhập.'
      : identityNotice === 'password-reset' || identityNotice === 'password-changed'
        ? 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.'
        : null,
  );
  const field = (name: keyof AuthFormValues, value: string | boolean) => {
    setDemoError(false);
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (preview === 'pending' || pending) return;
    const next = validateAuth(mode, values);
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
            setFeedback('Identity hiện không khả dụng. Vui lòng thử lại sau.');
            return;
          }
          signal.throwIfAborted();
          if (result.status === 'error') {
            setPreview('idle');
            setFeedback(authErrorMessage(result.error.code));
          } else if (register) {
            setPreview('idle');
            setFeedback(
              'Yêu cầu đăng ký đã được tiếp nhận. Nếu email hợp lệ, hãy kiểm tra hộp thư để xác minh tài khoản.',
            );
          } else {
            const returnTo = new URLSearchParams(location.search).get('returnTo');
            navigate(safeReturnTo(returnTo), { replace: true });
          }
        },
        () => setFeedback('Identity hiện không khả dụng. Vui lòng thử lại sau.'),
      );
    } else setPreview('unavailable');
  };
  return (
    <section
      className={`${styles.page} ${register ? styles.register : ''}`}
      data-node-id={register ? '298:2007' : '298:1893'}
    >
      <div className={styles.introduction}>
        <p className={styles.eyebrow}>Cùng Wolfari lên đường</p>
        <h1>
          {register ? (
            <>
              Tạo tài khoản,
              <br />
              chuẩn bị đi thôi!
            </>
          ) : (
            'Chào mừng trở lại!'
          )}
        </h1>
        <p className={styles.description}>
          {register
            ? 'Đăng ký bằng email để bắt đầu tạo và tham gia các chuyến đi trong Wolfari.'
            : 'Đăng nhập để tiếp tục quản lý những hành trình của bạn.'}
        </p>
        <div className={styles.collage}>
          <TravelCollage variant="auth" />
          <span className={styles.mascotSlot}>
            <img src={art['4ff86.png']} alt="" />
          </span>
        </div>
      </div>
      <div className={styles.formColumn}>
        <form
          className={styles.card}
          noValidate
          onSubmit={(event) => void submit(event)}
          aria-label={register ? 'Biểu mẫu đăng ký' : 'Biểu mẫu đăng nhập'}
        >
          <header className={styles.cardHeader}>
            <h2>{register ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h2>
            <p>
              {register ? 'Tạo tài khoản Wolfari bằng email' : 'Tiếp tục hành trình cùng Wolfari'}
            </p>
          </header>
          <div className={styles.fields}>
            {register && (
              <Input
                id="auth-fullName"
                label="Họ và tên"
                name="fullName"
                autoComplete="name"
                value={values.fullName}
                error={errors.fullName}
                onChange={(e) => field('fullName', e.target.value)}
                leadingIcon={<img src={art['47e18.svg']} alt="" />}
              />
            )}
            <Input
              id="auth-email"
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={values.email}
              error={errors.email}
              onChange={(e) => field('email', e.target.value)}
              leadingIcon={<img src={art[register ? 'ca40c.svg' : '532c3.svg']} alt="" />}
            />
            <Input
              id="auth-password"
              label="Mật khẩu"
              type="password"
              name="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Từ 15 đến 128 ký tự' : 'Mật khẩu của bạn'}
              value={values.password}
              error={errors.password}
              onChange={(e) => field('password', e.target.value)}
              leadingIcon={<img src={art[register ? '183ec.svg' : 'c2986.svg']} alt="" />}
            />
            {register && (
              <Input
                id="auth-confirmation"
                label="Nhập lại mật khẩu"
                type="password"
                autoComplete="new-password"
                value={values.confirmation}
                error={errors.confirmation}
                onChange={(e) => field('confirmation', e.target.value)}
                leadingIcon={<img src={art['9f11b.svg']} alt="" />}
              />
            )}
          </div>
          {register && (
            <>
              <label className={styles.consent}>
                <input
                  id="auth-acceptedTerms"
                  type="checkbox"
                  checked={values.acceptedTerms}
                  onChange={(e) => field('acceptedTerms', e.target.checked)}
                  aria-invalid={!!errors.acceptedTerms}
                  aria-describedby={errors.acceptedTerms ? 'auth-terms-error' : undefined}
                />
                Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật (xem trước)
              </label>
              {errors.acceptedTerms && (
                <p className={styles.error} role="alert" id="auth-terms-error">
                  {errors.acceptedTerms}
                </p>
              )}
            </>
          )}
          <p className={styles.previewNote}>
            {previewEnabled
              ? register
                ? 'Mật khẩu từ 15–128 ký tự. Bản xem trước chưa tạo tài khoản hoặc gửi thông tin đăng ký.'
                : 'Bản xem trước giao diện. Thông tin đăng nhập không được gửi và không tạo phiên truy cập thật.'
              : register
                ? 'Mật khẩu cần từ 15 đến 128 ký tự.'
                : 'Mật khẩu phân biệt chữ hoa, chữ thường và không được gửi vào URL.'}
          </p>
          {demoError && (
            <Alert tone="error">
              Email hoặc mật khẩu demo chưa đúng. Dùng tài khoản minh họa trong bảng xem trước.
            </Alert>
          )}
          <Button
            className={styles.submit}
            type="submit"
            loading={preview === 'pending' || !!pending}
            icon={<img src={register ? registerSubmitIcon : loginSubmitIcon} alt="" />}
          >
            {register ? 'Tạo tài khoản' : 'Đăng nhập'}
          </Button>
          {pending && <Alert live>Đang gửi yêu cầu tới Identity…</Alert>}
          {preview !== 'idle' && (
            <div className={styles.feedback}>
              <Alert tone={preview === 'error' ? 'error' : 'info'} live>
                {preview === 'pending'
                  ? 'Minh họa trạng thái đang xử lý. Không có request đang gửi.'
                  : preview === 'unknown'
                    ? 'Minh họa kết quả chưa xác định. Chưa có tài khoản hoặc phiên nào được xác nhận.'
                    : preview === 'error'
                      ? 'Chưa thể hoàn tất. Kiểm tra thông tin và thử lại khi Identity khả dụng.'
                      : 'Dữ liệu đã qua kiểm tra local. Identity chưa kết nối; chưa tạo tài khoản hoặc đăng nhập.'}
              </Alert>
            </div>
          )}
          {feedback && (
            <div className={styles.feedback}>
              <Alert tone="info" live>
                {feedback}
              </Alert>
            </div>
          )}
          <div className={styles.alternative}>
            <span>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
            {!register && (
              <Link className={styles.forgotLink} to="/forgot-password">
                Quên mật khẩu?
              </Link>
            )}
            <Link to={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Đăng ký'}</Link>
          </div>
          {!register && (
            <div className={styles.stateNote}>
              <Alert live={false}>
                Nếu thông tin không hợp lệ hoặc tài khoản không được phép sử dụng, hệ thống sẽ hiển
                thị lỗi phù hợp.
              </Alert>
            </div>
          )}
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
    </section>
  );
}
