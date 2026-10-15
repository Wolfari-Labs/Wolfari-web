import { useState, type FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { Select } from '../../shared/components/Select';
import { TravelCollage } from '../../shared/components/TravelCollage';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import { validateAuth, type AuthFormValues, type AuthFormErrors } from './model/auth-validation';
import styles from './AuthPage.module.css';

type Preview = 'idle' | 'pending' | 'unknown' | 'error' | 'unavailable';
const previewStates: readonly Preview[] = ['idle', 'pending', 'unknown', 'error', 'unavailable'];
function FieldIcon({ desktop, mobile }: { desktop: keyof typeof art; mobile: keyof typeof art }) {
  return (
    <picture>
      <source media="(max-width: 768px)" srcSet={art[mobile]} />
      <img src={art[desktop]} alt="" />
    </picture>
  );
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
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (preview === 'pending') return;
    const next = validateAuth(mode, values);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`auth-${first}`)?.focus();
    else if (demoLogin) {
      setDemoError(!demoLogin.activate({ email: values.email, password: values.password }));
      document.getElementById('auth-password')?.focus();
    } else setPreview('unavailable');
  };
  return (
    <section
      className={`${styles.page} ${register ? styles.register : ''}`}
      data-node-id={register ? '298:2007' : '298:1893'}
    >
      <div className={styles.introduction}>
        <p>Cùng Wolfari lên đường</p>
        <h1>
          <span className={styles.desktopTitle}>
            {register ? (
              <>
                Tạo tài khoản,
                <br />
                chuẩn bị đi thôi!
              </>
            ) : (
              'Chào mừng trở lại!'
            )}
          </span>
          <span className={styles.mobileTitle}>
            {register ? (
              <>
                Cùng Wolfari
                <br />
                lên đường
              </>
            ) : (
              <>
                Chào mừng
                <br />
                trở lại!
              </>
            )}
          </span>
        </h1>
        <p className={styles.description}>
          {register
            ? 'Đăng ký bằng email để bắt đầu tạo và tham gia các chuyến đi trong Wolfari.'
            : 'Đăng nhập để tiếp tục quản lý những hành trình của bạn.'}
        </p>
        <div className={styles.collage}>
          <TravelCollage variant="auth" />
          <img className={styles.readingMascot} src={art['4ff86.png']} alt="" />
        </div>
      </div>
      <div className={styles.formColumn}>
        <p className={styles.mobileDescription}>
          {register
            ? 'Lưu kế hoạch và kết nối với nhóm bạn.'
            : 'Tiếp tục những hành trình của bạn.'}
        </p>
        {!register && <img className={styles.mobileMascot} src={art['ddfc7.png']} alt="" />}
        <form
          className={styles.card}
          noValidate
          onSubmit={submit}
          aria-label={register ? 'Biểu mẫu đăng ký' : 'Biểu mẫu đăng nhập'}
        >
          <h2 className={styles.desktopHeading}>{register ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h2>
          <p className={styles.cardSubtitle}>
            {register ? 'Tạo tài khoản Wolfari bằng email' : 'Tiếp tục hành trình cùng Wolfari'}
          </p>
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
          {register && (
            <Input
              id="auth-fullName"
              label="Họ và tên"
              name="fullName"
              autoComplete="name"
              value={values.fullName}
              error={errors.fullName}
              onChange={(e) => field('fullName', e.target.value)}
              leadingIcon={<FieldIcon desktop="47e18.svg" mobile="47e18.svg" />}
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
            leadingIcon={
              <FieldIcon desktop={register ? 'ca40c.svg' : '532c3.svg'} mobile="73236.svg" />
            }
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
            leadingIcon={
              <FieldIcon desktop={register ? '183ec.svg' : 'c2986.svg'} mobile="43af6.svg" />
            }
            {...(register ? { hint: 'Mật khẩu từ 15–128 ký tự theo Identity.' } : {})}
          />
          {register && (
            <>
              <Input
                id="auth-confirmation"
                label="Nhập lại mật khẩu"
                type="password"
                autoComplete="new-password"
                value={values.confirmation}
                error={errors.confirmation}
                onChange={(e) => field('confirmation', e.target.value)}
                leadingIcon={<FieldIcon desktop="9f11b.svg" mobile="43af6.svg" />}
              />
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
                <p role="alert" id="auth-terms-error">
                  {errors.acceptedTerms}
                </p>
              )}
            </>
          )}
          <p className={styles.previewNote}>
            Bản xem trước giao diện · Không gửi thông tin đăng nhập hoặc tạo phiên thật.
          </p>
          {demoError && (
            <Alert tone="error">
              Email hoặc mật khẩu demo chưa đúng. Dùng tài khoản minh họa phía trên.
            </Alert>
          )}
          <Button
            type="submit"
            loading={preview === 'pending'}
            icon={<img src={art['ac8db.svg']} alt="" />}
          >
            {register ? 'Tạo tài khoản' : 'Đăng nhập'}
          </Button>
          {preview !== 'idle' && (
            <Alert tone={preview === 'error' ? 'error' : 'info'} live>
              {preview === 'pending'
                ? 'Minh họa trạng thái đang xử lý. Không có request đang gửi.'
                : preview === 'unknown'
                  ? 'Minh họa kết quả chưa xác định. Chưa có tài khoản hoặc phiên nào được xác nhận.'
                  : preview === 'error'
                    ? 'Chưa thể hoàn tất. Kiểm tra thông tin và thử lại khi Identity khả dụng.'
                    : 'Dữ liệu đã qua kiểm tra local. Identity chưa kết nối; chưa tạo tài khoản hoặc đăng nhập.'}
            </Alert>
          )}
          <div className={styles.alternative}>
            <span>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
            <Link to={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Đăng ký'}</Link>
          </div>
          {!register && (
            <Alert>
              Giao diện xem trước. Thông tin chưa được gửi và chưa có phiên đăng nhập được xác nhận.
            </Alert>
          )}
        </form>
        {!register && <img className={styles.mobileLandscape} src={art['916ba.png']} alt="" />}
        {previewEnabled && (
          <details className="preview" data-preview="auth-form">
            <summary>Auth form preview · Không xác thực</summary>
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
