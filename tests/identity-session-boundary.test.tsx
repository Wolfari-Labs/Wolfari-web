import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { App } from '../src/app/App';
import { SessionManagerProvider } from '../src/app/session-context';
import { ShellRepositoryProvider } from '../src/features/shell/repositories/repository-context';
import { IdentityRepositoryProvider } from '../src/features/auth/repositories/identity-context';
import { ProfilePage } from '../src/features/auth/ProfilePage';
import { IdentityActionPage } from '../src/features/auth/IdentityActionPage';
import { createSessionManager } from '../src/infrastructure/session/session-manager';
import { createAccessTokenStore } from '../src/infrastructure/session/access-token-store';
import { Input } from '../src/shared/components/Input';
import type { IdentityRepository } from '../src/features/auth/model/identity';

describe('Identity session boundary', () => {
  it('does not mount private queries during bootstrap and preserves returnTo after anonymous', async () => {
    const readSelf = vi.fn(),
      shellRead = vi.fn();
    const manager = createSessionManager(
      { read: vi.fn(), write: vi.fn() },
      createAccessTokenStore(),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(
      [
        {
          element: <App previewTripPath={null} />,
          children: [
            {
              path: '/profile',
              element: <ProfilePage previewEnabled={false} />,
              handle: { requiresViewer: true },
            },
            { path: '/login', element: <h1>Login destination</h1> },
          ],
        },
      ],
      { initialEntries: ['/profile?tab=sessions'] },
    );
    render(
      <QueryClientProvider client={client}>
        <SessionManagerProvider manager={manager}>
          <ShellRepositoryProvider repository={{ read: shellRead }}>
            <IdentityRepositoryProvider repository={{ readSelf, listSessions: vi.fn() }}>
              <RouterProvider router={router} />
            </IdentityRepositoryProvider>
          </ShellRepositoryProvider>
        </SessionManagerProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByLabelText('Tên hiển thị')).not.toBeInTheDocument();
    expect(readSelf).not.toHaveBeenCalled();
    expect(shellRead).not.toHaveBeenCalled();
    act(() => manager.clear());
    await screen.findByText('Login destination');
    expect(new URLSearchParams(router.state.location.search).get('returnTo')).toBe(
      '/profile?tab=sessions',
    );
    expect(readSelf).not.toHaveBeenCalled();
  });

  it('cancels reads and removes old account data synchronously before a new login', async () => {
    const write = vi
      .fn()
      .mockResolvedValue({ data: { access_token: 'new-token' }, correlationId: 'login' });
    const manager = createSessionManager({ read: vi.fn(), write }, createAccessTokenStore());
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <SessionManagerProvider manager={manager}>
          <span>Boundary</span>
        </SessionManagerProvider>
      </QueryClientProvider>,
    );
    client.setQueryData(['identity', 'self'], { email: 'old@example.com' });
    client.setQueryData(['shell'], { fullName: 'Old user' });
    let requestSignal: AbortSignal | undefined;
    const oldRequest = client
      .fetchQuery({
        queryKey: ['identity', 'sessions'],
        queryFn: ({ signal }) => {
          requestSignal = signal;
          return new Promise(() => undefined);
        },
      })
      .catch(() => undefined);
    await act(async () => {
      await manager.login('new@example.com', 'password');
    });
    await oldRequest;
    expect(requestSignal?.aborted).toBe(true);
    expect(client.getQueryData(['identity', 'self'])).toBeUndefined();
    expect(client.getQueryData(['shell'])).toBeUndefined();
    expect(manager.getAccessToken()).toBe('new-token');
  });

  it('clears session and cached personal data after successful password reset', async () => {
    const client = new QueryClient();
    const write = vi
      .fn()
      .mockResolvedValue({ data: { access_token: 'old-token' }, correlationId: 'login' });
    const manager = createSessionManager({ read: vi.fn(), write }, createAccessTokenStore());
    await manager.login('user@example.com', 'password');
    const resetPassword = vi.fn().mockResolvedValue({ status: 'accepted', correlationId: 'reset' });
    const router = createMemoryRouter(
      [
        { path: '/reset-password', element: <IdentityActionPage action="reset" /> },
        { path: '/login', element: <h1>Login destination</h1> },
      ],
      { initialEntries: ['/reset-password?token=one-time-reset'] },
    );
    render(
      <QueryClientProvider client={client}>
        <SessionManagerProvider manager={manager}>
          <IdentityRepositoryProvider
            repository={{ readSelf: vi.fn(), listSessions: vi.fn(), resetPassword }}
          >
            <RouterProvider router={router} />
          </IdentityRepositoryProvider>
        </SessionManagerProvider>
      </QueryClientProvider>,
    );
    client.setQueryData(['identity', 'self'], { email: 'old@example.com' });
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), ' new password long ');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu'), ' new password long ');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
    expect(resetPassword).toHaveBeenCalledTimes(1);
    expect(resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'one-time-reset', newPassword: ' new password long ' }),
    );
    expect(manager.getAccessToken()).toBeNull();
    expect(client.getQueryData(['identity', 'self'])).toBeUndefined();
    await screen.findByText('Login destination');
    expect(router.state.location.state).toEqual({ identityNotice: 'password-reset' });
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
});

describe('Token action failures and cleanup', () => {
  function mount(
    confirmEmailVerification: IdentityRepository['confirmEmailVerification'],
    url = '/verify-email?token=one-time-verify',
  ) {
    const router = createMemoryRouter(
      [
        { path: '/verify-email', element: <IdentityActionPage action="verify" /> },
        { path: '/login', element: <h1>Login destination</h1> },
        { path: '/other', element: <h1>Other destination</h1> },
      ],
      { initialEntries: [url] },
    );
    render(
      <IdentityRepositoryProvider
        repository={{
          readSelf: vi.fn(),
          listSessions: vi.fn(),
          ...(confirmEmailVerification ? { confirmEmailVerification } : {}),
        }}
      >
        <RouterProvider router={router} />
      </IdentityRepositoryProvider>,
    );
    return router;
  }
  it('does not submit a missing token', async () => {
    const confirm = vi.fn();
    mount(confirm, '/verify-email');
    expect(await screen.findByRole('button', { name: 'Xác minh email' })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it.each(['invalid', 'expired', 'used'])(
    'keeps a failed %s token response on the action page without persisting it',
    async (token) => {
      const confirm = vi
        .fn()
        .mockResolvedValue({
          status: 'error',
          error: { code: 'VALIDATION_FAILED', correlationId: 'invalid', retryable: false },
        });
      const router = mount(confirm, '/verify-email?token=' + token);
      await waitFor(() => expect(router.state.location.search).toBe(''));
      await userEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
      await screen.findByText(/Liên kết không còn hiệu lực/);
      expect(router.state.location.pathname).toBe('/verify-email');
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(localStorage.length + sessionStorage.length).toBe(0);
    },
  );
  it('cancels a pending request on navigation', async () => {
    let signal: AbortSignal | undefined;
    const router = mount(
      vi.fn(({ signal: requestSignal }: { signal: AbortSignal }) => {
        signal = requestSignal;
        return new Promise<never>((_resolve, reject) =>
          requestSignal.addEventListener('abort', () => reject(requestSignal.reason)),
        );
      }),
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
    await act(async () => router.navigate('/other'));
    expect(signal?.aborted).toBe(true);
    expect(router.state.location.pathname).toBe('/other');
  });
  it('cancels a successful redirect timer when leaving the page', async () => {
    const router = mount(
      vi.fn().mockResolvedValue({ status: 'accepted', correlationId: 'verified' }),
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
    await screen.findByText(/Đang chuyển tới trang đăng nhập/);
    await act(async () => router.navigate('/other'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
    expect(router.state.location.pathname).toBe('/other');
  });
});

it('toggles password with the keyboard without submitting and honors disabled state', async () => {
  const submit = vi.fn((event) => event.preventDefault());
  const { rerender } = render(
    <form onSubmit={submit}>
      <Input label="Password" type="password" defaultValue="keep spaces " />
    </form>,
  );
  const field = screen.getByLabelText('Password');
  field.focus();
  await userEvent.tab();
  await userEvent.keyboard('{Enter}');
  expect(field).toHaveAttribute('type', 'text');
  expect(field).toHaveValue('keep spaces ');
  expect(submit).not.toHaveBeenCalled();
  rerender(
    <form onSubmit={submit}>
      <Input label="Password" type="password" defaultValue="keep spaces " disabled />
    </form>,
  );
  expect(screen.getByRole('button', { name: 'Ẩn password' })).toBeDisabled();
});
