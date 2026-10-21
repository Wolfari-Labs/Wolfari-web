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

type Preview = 'idle' | 'pending' | 'unknown' | 'error' | 'unavailable';
const previewStates: readonly Preview[] = ['idle', 'pending', 'unknown', 'error', 'unavailable'];

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
  const field = (name: keyof AuthFormValues, value: string | boolean) => {
    setDemoError(false);
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (preview === 'pending') return;
    const next = validateAuth(mode, values);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`auth-${first}`)?.focus();
    else if (demoLogin) {
      setDemoError(!demoLogin.activate({ email: values.email, password: values.password }));
      document.getElementById('auth-password')?.focus();
    } else if (repository && (register ? repository.register : repository.login)) {
      setPreview('pending');
      const signal = new AbortController().signal;
      const result = register
        ? await repository.register!({
            intent: { email: values.email, password: values.password, fullName: values.fullName },
            signal,
          })
        : await repository.login!({ intent: { email: values.email, password: values.password }, signal });
      if (result.status === 'error') {
        setPreview(result.error.retryable ? 'error' : 'unknown');
      } else if (register) {
        setPreview('unknown');
      } else {
        const returnTo = new URLSearchParams(location.search).get('returnTo');
        navigate(returnTo?.startsWith('/') ? returnTo : '/');
      }
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
            {register
              ? 'Mật khẩu từ 15–128 ký tự. Bản xem trước chưa tạo tài khoản hoặc gửi thông tin đăng ký.'
              : 'Bản xem trước giao diện. Thông tin đăng nhập không được gửi và không tạo phiên truy cập thật.'}
          </p>
          {demoError && (
            <Alert tone="error">
              Email hoặc mật khẩu demo chưa đúng. Dùng tài khoản minh họa trong bảng xem trước.
            </Alert>
          )}
          <Button
            className={styles.submit}
            type="submit"
            loading={preview === 'pending'}
            icon={<img src={register ? registerSubmitIcon : loginSubmitIcon} alt="" />}
          >
            {register ? 'Tạo tài khoản' : 'Đăng nhập'}
          </Button>
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
          <div className={styles.alternative}>
            <span>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
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
