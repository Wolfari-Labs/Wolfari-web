export interface AuthFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmation: string;
  acceptedTerms: boolean;
}
export type AuthFormErrors = Partial<Record<keyof AuthFormValues, string>>;
export function validateAuth(mode: 'login' | 'register', values: AuthFormValues): AuthFormErrors {
  const errors: AuthFormErrors = {};
  if (mode === 'register' && (!values.fullName.trim() || values.fullName.trim().length > 150))
    errors.fullName = 'Họ tên cần từ 1 đến 150 ký tự.';
  const email = values.email.trim();
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Nhập địa chỉ email hợp lệ.';
  if (!values.password) errors.password = 'Nhập mật khẩu của bạn.';
  if (mode === 'register') {
    if ([...values.password].length < 15 || [...values.password].length > 128)
      errors.password = 'Mật khẩu cần từ 15 đến 128 ký tự.';
    if (values.confirmation !== values.password || !values.confirmation)
      errors.confirmation = 'Mật khẩu nhập lại chưa khớp.';
    if (!values.acceptedTerms) errors.acceptedTerms = 'Chọn đồng ý để tiếp tục đăng ký.';
  }
  return errors;
}
