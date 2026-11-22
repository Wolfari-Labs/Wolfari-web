import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage } from '../src/features/auth/AuthPage';
import { IdentityActionPage } from '../src/features/auth/IdentityActionPage';
import { IdentityRepositoryProvider } from '../src/features/auth/repositories/identity-context';
import type { IdentityRepository } from '../src/features/auth/model/identity';
import { SessionManagerProvider } from '../src/app/session-context';
import { postAuthReturnTo } from '../src/app/safe-return-to';

function mount(
  path: string,
  repository: Partial<IdentityRepository> = {},
  authenticated = false,
  notice?: string,
) {
  const router = createMemoryRouter(
    [
      { path: '/register', element: <AuthPage mode="register" previewEnabled={false} /> },
      { path: '/login', element: <AuthPage mode="login" previewEnabled={false} /> },
      { path: '/verify-email', element: <IdentityActionPage action="verify" /> },
      { path: '/reset-password', element: <IdentityActionPage action="reset" /> },
      { path: '/profile', element: <h1>Account destination</h1> },
      { path: '/invitations', element: <h1>Invitation destination</h1> },
      { path: '/', element: <h1>Home destination</h1> },
    ],
    {
      initialEntries: [
        {
          pathname: path.split('?')[0] ?? '/',
          search: path.includes('?') ? '?' + path.split('?').slice(1).join('?') : '',
          state: notice ? { identityNotice: notice } : null,
        },
      ],
    },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionManagerProvider
        manager={{
          status: () => (authenticated ? 'authenticated' : 'anonymous'),
          subscribe: () => () => {},
        }}
      >
        <IdentityRepositoryProvider
          repository={{ readSelf: vi.fn(), listSessions: vi.fn(), ...repository }}
        >
          <RouterProvider router={router} />
        </IdentityRepositoryProvider>
      </SessionManagerProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe('auth flow cleanup', () => {
  it.each(['password-changed', 'password-reset', 'password-uncertain'])(
    'keeps reauthentication stable while the prior session clears: %s',
    async (notice) => {
      mount('/login', {}, true, notice);
      expect(screen.getByRole('form', { name: 'Biểu mẫu đăng nhập' })).toBeInTheDocument();
      expect(screen.queryByText('Home destination')).not.toBeInTheDocument();
    },
  );
  it('replaces accepted registration with next-step instructions and removes passwords/repeated submit', async () => {
    const register = vi.fn().mockResolvedValue({ status: 'accepted', correlationId: null });
    const login = vi.fn();
    mount('/register', { register, login });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Họ và tên'), 'Demo');
    await user.type(screen.getByLabelText('Email'), 'demo@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), 'Wolfari1');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'Wolfari1');
    await user.click(screen.getByRole('checkbox'));
    await user.dblClick(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(
      await screen.findByRole('heading', { name: 'Kiểm tra email của bạn' }),
    ).toBeInTheDocument();
    expect(register).toHaveBeenCalledTimes(1);
    expect(login).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạo tài khoản' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
  });
  it.each(['/login?returnTo=%2Finvitations', '/register?returnTo=%2Finvitations'])(
    'skips redundant auth for an active session: %s',
    async (path) => {
      mount(path, {}, true);
      expect(await screen.findByText('Invitation destination')).toBeInTheDocument();
    },
  );
  it.each([
    '/login',
    '/register/',
    '/LOGIN?returnTo=%2Flogin',
    '/%6cogin',
    '/reset-password?token=private',
    '//evil.test',
    'https://evil.test',
  ])('prevents an auth redirect loop or external destination: %s', (value) => {
    expect(postAuthReturnTo(value)).toBe('/');
  });
  it('preserves a valid invitation destination', () => {
    expect(postAuthReturnTo('/invitations?view=pending')).toBe('/invitations?view=pending');
  });
  it.each(['network', 'unavailable', 'missing'])(
    'locks an uncertain reset after %s without reusing the token',
    async (mode) => {
      const resetPassword =
        mode === 'network'
          ? vi.fn().mockRejectedValue(new Error('lost reply'))
          : vi.fn().mockResolvedValue(
              mode === 'missing'
                ? undefined
                : {
                    status: 'error',
                    error: { code: 'SERVICE_UNAVAILABLE', retryable: true, correlationId: null },
                  },
            );
      const router = mount('/reset-password?token=one-time-test', { resetPassword });
      await waitFor(() => expect(router.state.location.search).toBe(''));
      expect(resetPassword).not.toHaveBeenCalled();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Mật khẩu mới'), 'Reset123');
      await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'Reset123');
      await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
      expect(
        await screen.findByText(/Chưa xác định được mật khẩu đã đổi hay chưa/),
      ).toBeInTheDocument();
      const submit = screen.getByRole('button', { name: 'Đặt lại mật khẩu' });
      expect(submit).toBeDisabled();
      expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');
      expect(
        screen.queryByText('Liên kết đặt lại mật khẩu không có mã token.'),
      ).not.toBeInTheDocument();
      await user.click(submit);
      expect(resetPassword).toHaveBeenCalledTimes(1);
    },
  );
  it('returns an authenticated user to their account after confirming an email link', async () => {
    const confirmEmailVerification = vi
      .fn()
      .mockResolvedValue({ status: 'accepted', correlationId: null });
    mount('/verify-email?token=one-time-test', { confirmEmailVerification }, true);
    await userEvent.click(await screen.findByRole('button', { name: 'Xác minh email' }));
    expect(await screen.findByText('Account destination')).toBeInTheDocument();
    expect(confirmEmailVerification).toHaveBeenCalledTimes(1);
  });
});
