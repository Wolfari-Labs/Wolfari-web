import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useOptionalIdentityRepository } from './repositories/identity-context';
import type { IdentityAcceptedResult } from './model/identity';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { validateAuth } from './model/auth-validation';
import styles from './AuthPage.module.css';

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
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(location.search).get('token');
    if (value) {
      setToken(value);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setFeedback(null);
    if (action === 'forgot') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 255) {
        setError('Nhập địa chỉ email hợp lệ.');
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
      else if (validation.password || validation.confirmation) setError(validation.password ?? validation.confirmation ?? null);
      if (!token || validation.password || validation.confirmation) return;
    }
    setPending(true);
    const signal = new AbortController().signal;
    let result: IdentityAcceptedResult | undefined;
    let failed = false;
    try {
      result = action === 'forgot'
        ? await repository?.requestPasswordReset?.({ email: email.trim(), signal })
        : action === 'verify'
          ? await repository?.confirmEmailVerification?.({ token: token!, signal })
          : await repository?.resetPassword?.({ token: token!, newPassword: password, signal });
    } catch {
      failed = true;
      setError('Identity hiện không khả dụng. Vui lòng thử lại sau.');
    } finally {
      setPending(false);
    }
    if (failed) return;
    if (!result) {
      setError('Identity chưa kết nối; chưa có thay đổi nào được xác nhận.');
    } else if (result.status === 'error') {
      setError(
        result.error.code === 'VALIDATION_FAILED' || result.error.code === 'UNAUTHENTICATED'
          ? 'Liên kết không còn hiệu lực hoặc thông tin chưa hợp lệ.'
          : result.error.code === 'RESOURCE_EXHAUSTED'
            ? 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
            : 'Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.',
      );
    } else if (action === 'forgot') {
      setFeedback('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi. Hãy kiểm tra hộp thư của bạn.');
    } else if (action === 'verify') {
      setFeedback('Email đã được xác minh. Bạn có thể đăng nhập.');
    } else {
      setFeedback('Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.');
      window.setTimeout(() => navigate('/login', { replace: true }), 600);
    }
  };

  const title = action === 'forgot' ? 'Quên mật khẩu?' : action === 'verify' ? 'Xác minh email' : 'Đặt lại mật khẩu';
  const description = action === 'forgot'
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
        <form className={styles.card} noValidate onSubmit={(event) => void submit(event)} aria-label={title}>
          <header className={styles.cardHeader}>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          <div className={styles.fields}>
            {action === 'forgot' && (
              <Input id="identity-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            )}
            {action === 'reset' && (
              <>
                <Input id="identity-password" label="Mật khẩu mới" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <Input id="identity-confirmation" label="Nhập lại mật khẩu" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </>
            )}
          </div>
          {action === 'verify' && !token && <Alert tone="error">Liên kết xác minh không có token.</Alert>}
          {error && <div className={styles.feedback}><Alert tone="error" live>{error}</Alert></div>}
          {feedback && <div className={styles.feedback}><Alert tone="info" live>{feedback}</Alert></div>}
          <Button className={styles.submit} type="submit" loading={pending} disabled={action === 'verify' && !token}>
            {action === 'forgot' ? 'Gửi hướng dẫn' : action === 'verify' ? 'Xác minh email' : 'Đặt lại mật khẩu'}
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
