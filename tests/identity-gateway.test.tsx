import { describe, expect, it, vi } from 'vitest';
import { createGatewayIdentityRepository } from '../src/infrastructure/repositories/identity.gateway-repository';
import { IdentityRepositoryProvider } from '../src/features/auth/repositories/identity-context';
import { IdentityActionPage } from '../src/features/auth/IdentityActionPage';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { safeReturnTo } from '../src/app/safe-return-to';

const signal = new AbortController().signal;
const profile = {
  id: 'user-1',
  full_name: 'Trang Nguyen',
  email: 'trang@example.com',
  avatar: null,
  version: 4,
  system_role: 'USER',
  status: 'ACTIVE',
  email_verified_at: null,
};

describe('Identity Gateway adapter', () => {
  it('preserves session pagination and maps the profile projection', async () => {
    const read = vi.fn().mockImplementation((path: string) => Promise.resolve(path === '/api/v1/me'
      ? { data: profile, correlationId: 'corr-profile' }
      : {
          data: {
            items: [{ id: 'session-1', created_at: '2026-10-01T00:00:00Z', last_used_at: null, expires_at: '2026-11-01T00:00:00Z', revoked_at: null }],
            next_cursor: 'next',
          },
          correlationId: 'corr-read',
        }));
    const repo = createGatewayIdentityRepository(undefined, { read, write: vi.fn() });

    await expect(repo.readSelf({ signal })).resolves.toMatchObject({ status: 'ready', data: { version: 4, emailVerifiedAt: null } });
    await expect(repo.listSessions({ signal, cursor: 'opaque cursor', limit: 101 })).resolves.toMatchObject({
      status: 'ready',
      data: { nextCursor: 'next', items: [{ id: 'session-1' }] },
    });
    expect(read.mock.calls[1]?.[0]).toBe('/api/v1/me/sessions?limit=100&cursor=opaque+cursor');
  });

  it('keeps Identity mutation DTOs inside the adapter', async () => {
    const read = vi.fn().mockResolvedValue({ data: new ArrayBuffer(3), correlationId: 'read', contentType: 'image/png' });
    const write = vi.fn()
      .mockResolvedValueOnce({ data: profile, correlationId: 'profile' })
      .mockResolvedValueOnce({ data: { object_key: 'avatar-key' }, correlationId: 'upload' })
      .mockResolvedValue({ data: null, correlationId: 'accepted' });
    const session = {
      login: vi.fn().mockResolvedValue({ data: { profile }, correlationId: 'login' }),
      register: vi.fn().mockResolvedValue({ correlationId: 'register' }),
      status: () => 'anonymous' as const,
      getAccessToken: () => null,
      getCsrfToken: () => null,
      subscribe: () => () => undefined,
      bootstrap: async () => 'anonymous' as const,
      clear: vi.fn(),
    };
    const repo = createGatewayIdentityRepository(undefined, { read, write }, session);
    await repo.updateProfile!({ intent: { fullName: 'New name', expectedVersion: 4, avatarObjectKey: 'avatar-key' }, signal });
    await repo.uploadAvatar!({ file: new Blob(['avatar'], { type: 'image/png' }), filename: 'avatar.png', signal });
    await repo.revokeSession!({ sessionId: 'session/1', signal });
    await repo.changePassword!({ currentPassword: 'current', newPassword: 'a'.repeat(15), signal });
    await repo.resendEmailVerification!({ signal });
    await repo.confirmEmailVerification!({ token: 'verify-token', signal });
    await repo.requestPasswordReset!({ email: 'trang@example.com', signal });
    await repo.resetPassword!({ token: 'reset-token', newPassword: 'b'.repeat(15), signal });
    await repo.getAvatar!({ signal });

    expect(write.mock.calls.map(([path]) => path)).toEqual([
      '/api/v1/me',
      '/api/v1/me/avatar',
      '/api/v1/me/sessions/session%2F1',
      '/api/v1/me/password-change',
      '/api/v1/auth/email-verifications',
      '/api/v1/auth/email-verifications/confirm',
      '/api/v1/auth/password-reset-requests',
      '/api/v1/auth/password-resets',
    ]);
    expect(write.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH', body: { expected_version: 4, avatar_object_key: 'avatar-key' } });
    expect(write.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE', responseType: 'empty' });
    expect(write.mock.calls[4]?.[1]).toMatchObject({ method: 'POST', body: {} });
    expect(write.mock.calls[5]?.[1]).toMatchObject({ body: { token: 'verify-token' } });
    expect(write.mock.calls[7]?.[1]).toMatchObject({ body: { token: 'reset-token', new_password: 'b'.repeat(15) } });
    const form = write.mock.calls[1]?.[1]?.body;
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('file')).toBeInstanceOf(File);
    await expect(repo.getAvatar!({ signal })).resolves.toMatchObject({ status: 'ready', contentType: 'image/png' });
    expect(read.mock.calls.at(-1)?.[1]).toMatchObject({ responseType: 'bytes' });
  });
});

describe('Identity token route', () => {
  it('scrubs a verification token before submitting it from the visible URL', async () => {
    const confirm = vi.fn().mockResolvedValue({ status: 'accepted', correlationId: 'verify' });
    const repository = {
      readSelf: vi.fn(),
      listSessions: vi.fn(),
      confirmEmailVerification: confirm,
    };
    const router = createMemoryRouter([{ path: '/verify-email', element: <IdentityActionPage action="verify" /> }], {
      initialEntries: ['/verify-email?token=secret-token'],
    });
    render(
      <IdentityRepositoryProvider repository={repository}>
        <RouterProvider router={router} />
      </IdentityRepositoryProvider>,
    );
    await screen.findByRole('button', { name: 'Xác minh email' });
    expect(router.state.location.search).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ token: 'secret-token' }));
    expect(screen.getByText('Email đã được xác minh. Bạn có thể đăng nhập.')).toBeInTheDocument();
  });
});

describe('safe return route', () => {
  it.each(['//evil.example/path', 'https://evil.example/path', 'javascript:alert(1)', '/\\evil'])('rejects %s', (value) => {
    expect(safeReturnTo(value)).toBe('/');
  });

  it('keeps a same-origin path and query without carrying a fragment', () => {
    expect(safeReturnTo('/trips/one?tab=plan#private')).toBe('/trips/one?tab=plan');
  });
});
