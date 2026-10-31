import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useOptionalIdentityRepository } from './repositories/identity-context';
import type { IdentityAcceptedResult } from './model/identity';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { validateAuth } from './model/auth-validation';
import styles from './AuthPage.module.css';
import { useIdentityTask } from './use-identity-task';
import { useOptionalSessionManager } from '../../app/session-context';

type Action = 'forgot' | 'verify' | 'reset';

export function IdentityActionPage({ action }: { action: Action }) {
  const repository = useOptionalIdentityRepository();
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { pending, run } = useIdentityTask();
  const [completed, setCompleted] = useState(false);
  const sessionManager = useOptionalSessionManager();
  const redirectTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  // Capture the one-time token and replace its URL before the missing-token state paints.
  useLayoutEffect(() => {
    const value = new URLSearchParams(location.search).get('token');
    if (value) {
      setToken(value);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || completed) return;
    setError(null);
    setFeedback(null);
    if (action === 'forgot') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 255) {
        setError('Nhập địa chỉ email hợp lệ.');
        document.getElementById('identity-email')?.focus();
        return;
      }
    }
    if (action === 'verify' && !token) {
      setError('Liên kết xác minh không có mã token.');
      return;
    }
    if (action === 'reset') {
      const validation = validateAuth('register', {
        fullName: 'reset',
        email: 'reset@example.com',
        password,
        confirmation,
        acceptedTerms: true,
      });
      if (!token) setError('Liên kết đặt lại mật khẩu không có mã token.');
      else if (validation.password || validation.confirmation)
        setError(validation.password ?? validation.confirmation ?? null);
      if (!token || validation.password || validation.confirmation) {
        document
          .getElementById(validation.password ? 'identity-password' : 'identity-confirmation')
          ?.focus();
        return;
      }
    }
    await run(
      'identity',
      async (signal) => {
        let result: IdentityAcceptedResult | undefined;
        let failed = false;
        try {
          result =
            action === 'forgot'
              ? await repository?.requestPasswordReset?.({ email: email.trim(), signal })
              : action === 'verify'
                ? await repository?.confirmEmailVerification?.({ token: token!, signal })
                : await repository?.resetPassword?.({
                    token: token!,
                    newPassword: password,
                    signal,
                  });
        } catch {
          if (signal.aborted) return;
          failed = true;
          setError('Chưa thể kết nối. Vui lòng thử lại.');
        }
        signal.throwIfAborted();
        if (failed) return;
        if (!result) {
          setError('Chưa xác nhận được thay đổi. Vui lòng thử lại.');
        } else if (result.status === 'error') {
          setError(
            result.error.code === 'VALIDATION_FAILED' || result.error.code === 'UNAUTHENTICATED'
              ? 'Liên kết không còn hiệu lực hoặc thông tin chưa hợp lệ.'
              : result.error.code === 'RESOURCE_EXHAUSTED'
                ? 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
                : 'Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.',
          );
        } else if (action === 'forgot') {
          setFeedback(
            'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi. Hãy kiểm tra hộp thư của bạn.',
          );
        } else if (action === 'verify') {
          setToken(null);
          setCompleted(true);
          setFeedback(
            'Đăng ký thành công. Email đã được xác minh. Đang chuyển tới trang đăng nhập…',
          );
          redirectTimer.current = window.setTimeout(
            () =>
              navigate('/login', { replace: true, state: { identityNotice: 'email-verified' } }),
            600,
          );
        } else {
          setToken(null);
          setPassword('');
          setConfirmation('');
          setCompleted(true);
          sessionManager?.clear?.();
          setFeedback('Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.');
          redirectTimer.current = window.setTimeout(
            () =>
              navigate('/login', { replace: true, state: { identityNotice: 'password-reset' } }),
            600,
          );
        }
      },
      () => setError('Chưa thể kết nối. Vui lòng thử lại.'),
    );
  };

  const title =
    action === 'forgot'
      ? 'Quên mật khẩu?'
      : action === 'verify'
        ? 'Xác minh email'
        : 'Đặt lại mật khẩu';
  const description =
    action === 'forgot'
      ? 'Nhập email để nhận hướng dẫn đặt lại mật khẩu.'
      : action === 'verify'
        ? 'Xác nhận liên kết để hoàn tất địa chỉ email của bạn.'
        : 'Chọn mật khẩu mới để tiếp tục sử dụng Wolfari.';

  return (
    <section className={styles.page} data-flow={`identity-${action}`}>
      <div className={styles.introduction}>
        <p className={styles.eyebrow}>Tài khoản Wolfari</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.formColumn}>
        <form
          className={styles.card}
          noValidate
          onSubmit={(event) => void submit(event)}
          aria-label={title}
        >
          <header className={styles.cardHeader}>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          <div className={styles.fields}>
            {action === 'forgot' && (
              <Input
                id="identity-email"
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
            {action === 'reset' && (
              <>
                <Input
                  id="identity-password"
                  label="Mật khẩu mới"
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Input
                  id="identity-confirmation"
                  label="Nhập lại mật khẩu"
                  type="password"
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </>
            )}
          </div>
          {action !== 'forgot' && !token && !completed && (
            <Alert tone="error">
              {action === 'verify'
                ? 'Liên kết xác minh không có mã token.'
                : 'Liên kết đặt lại mật khẩu không có mã token.'}
            </Alert>
          )}
          {error && (
            <div className={styles.feedback}>
              <Alert tone="error" live>
                {error}
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
          <Button
            className={styles.submit}
            type="submit"
            loading={!!pending}
            disabled={completed || (action !== 'forgot' && !token)}
          >
            {action === 'forgot'
              ? 'Gửi hướng dẫn'
              : action === 'verify'
                ? 'Xác minh email'
                : 'Đặt lại mật khẩu'}
          </Button>
          <div className={styles.alternative}>
            <span>Đã có tài khoản?</span>
            <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
