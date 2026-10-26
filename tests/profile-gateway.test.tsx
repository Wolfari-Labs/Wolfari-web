import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ProfilePage } from '../src/features/auth/ProfilePage';
import { IdentityRepositoryProvider } from '../src/features/auth/repositories/identity-context';
import type { IdentityRepository, SelfProfileViewModel } from '../src/features/auth/model/identity';
import { SessionManagerProvider } from '../src/app/session-context';

const profile: SelfProfileViewModel = {
  id: 'user-1',
  fullName: 'Trang Nguyen',
  email: 'trang@example.com',
  avatar: null,
  version: 4,
  systemRole: 'USER',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-10-01T00:00:00Z',
};
const ready = (data: SelfProfileViewModel) => ({ status: 'ready' as const, data });
const session = (id: string) => ({
  id,
  createdAt: '2026-10-01T00:00:00Z',
  lastUsedAt: null,
  expiresAt: '2026-11-01T00:00:00Z',
  revokedAt: null,
});
const page = (ids: string[], nextCursor: string | null = null) => ({
  status: 'ready' as const,
  data: { items: ids.map(session), nextCursor },
});
const failure = (
  code: 'VERSION_CONFLICT' | 'UNAUTHENTICATED' | 'SERVICE_UNAVAILABLE' = 'SERVICE_UNAVAILABLE',
) => ({
  status: 'error' as const,
  error: { code, correlationId: 'support-id', retryable: code === 'SERVICE_UNAVAILABLE' },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function mount(overrides: Partial<IdentityRepository> = {}) {
  const repository: IdentityRepository = {
    readSelf: vi.fn(async () => ready(profile)),
    listSessions: vi.fn(async () => page([])),
    ...overrides,
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const clear = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/profile', element: <ProfilePage previewEnabled={false} /> },
      { path: '/login', element: <h1>Login destination</h1> },
    ],
    { initialEntries: ['/profile'] },
  );
  const rendered = render(
    <QueryClientProvider client={client}>
      <SessionManagerProvider
        manager={{ status: () => 'authenticated', subscribe: () => () => undefined, clear }}
      >
        <IdentityRepositoryProvider repository={repository}>
          <RouterProvider router={router} />
        </IdentityRepositoryProvider>
      </SessionManagerProvider>
    </QueryClientProvider>,
  );
  return { ...rendered, client, router, repository, clear };
}
beforeEach(() =>
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:test');
      static revokeObjectURL = vi.fn();
    },
  ),
);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Profile Gateway interactions', () => {
  it('validates, serializes writes, applies server version and invalidates shell', async () => {
    const pending =
      deferred<Awaited<ReturnType<NonNullable<IdentityRepository['updateProfile']>>>>();
    const updateProfile = vi.fn(() => pending.promise);
    const { client } = mount({ updateProfile, uploadAvatar: vi.fn() });
    client.setQueryData(['shell', null, 'success'], { old: true });
    const name = await screen.findByLabelText('Tên hiển thị');
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(name).toHaveFocus();
    expect(updateProfile).not.toHaveBeenCalled();
    await userEvent.type(name, 'New name');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ intent: { fullName: 'New name', expectedVersion: 4 } }),
    );
    expect(name).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đổi ảnh' })).toBeDisabled();
    await act(async () =>
      pending.resolve({
        status: 'updated',
        profile: { ...profile, fullName: 'New name', version: 5 },
        correlationId: 'saved',
      }),
    );
    await screen.findByText('Đã lưu thông tin cá nhân.');
    expect(client.getQueryData(['identity', 'self', 'success'])).toMatchObject({
      data: { fullName: 'New name', version: 5 },
    });
    expect(client.getQueryState(['shell', null, 'success'])?.isInvalidated).toBe(true);
  });

  it('keeps draft on conflict, refetches version and only retries on an explicit submit', async () => {
    const readSelf = vi
      .fn()
      .mockResolvedValueOnce(ready(profile))
      .mockResolvedValue(ready({ ...profile, version: 8, fullName: 'Other edit' }));
    const updateProfile = vi
      .fn()
      .mockResolvedValueOnce(failure('VERSION_CONFLICT'))
      .mockResolvedValue({
        status: 'updated',
        profile: { ...profile, version: 9, fullName: 'My edit' },
        correlationId: 'saved',
      });
    mount({ readSelf, updateProfile });
    const name = await screen.findByLabelText('Tên hiển thị');
    await userEvent.clear(name);
    await userEvent.type(name, 'My edit');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText(/Hồ sơ đã thay đổi ở nơi khác/);
    await waitFor(() => expect(readSelf).toHaveBeenCalledTimes(2));
    expect(name).toHaveValue('My edit');
    expect(updateProfile).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(updateProfile.mock.calls[1]?.[0].intent.expectedVersion).toBe(8);
  });

  it('retains draft after network rejection and cancels a write when unmounted', async () => {
    const updateProfile = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(
        ({ signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason)),
          ),
      );
    const { unmount } = mount({ updateProfile });
    const name = await screen.findByLabelText('Tên hiển thị');
    await userEvent.clear(name);
    await userEvent.type(name, 'Keep draft');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText(/Chưa thể xác nhận lưu thay đổi/);
    expect(name).toHaveValue('Keep draft');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    const signal = updateProfile.mock.calls[1]?.[0].signal;
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('validates avatar files and does not claim attach success after conflict', async () => {
    const uploadAvatar = vi
      .fn()
      .mockResolvedValue({ status: 'uploaded', objectKey: 'new-avatar', correlationId: 'up' });
    const updateProfile = vi.fn().mockResolvedValue(failure('VERSION_CONFLICT'));
    mount({ uploadAvatar, updateProfile });
    await screen.findByLabelText('Tên hiển thị');
    const input = screen.getByLabelText('Chọn ảnh đại diện');
    for (const file of [
      new File([], 'empty.png', { type: 'image/png' }),
      new File(['bad'], 'file.txt', { type: 'text/plain' }),
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
    ]) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(uploadAvatar).not.toHaveBeenCalled();
    }
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'avatar.png', { type: 'image/png' })] },
    });
    await screen.findByText(/Ảnh đã tải lên nhưng chưa được gắn/);
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ intent: { expectedVersion: 4, avatarObjectKey: 'new-avatar' } }),
    );
    expect(screen.queryByText('Đã cập nhật ảnh đại diện.')).not.toBeInTheDocument();
  });

  it('reloads the same avatar endpoint on version change and releases Blob URLs', async () => {
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:old')
      .mockReturnValueOnce('blob:new');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const getAvatar = vi
      .fn()
      .mockResolvedValue({
        status: 'ready',
        bytes: new ArrayBuffer(3),
        contentType: 'image/png',
        correlationId: 'img',
      });
    const withAvatar = { ...profile, avatar: { src: '/api/v1/me/avatar', alt: 'Avatar' } };
    const { unmount } = mount({
      readSelf: vi.fn(async () => ready(withAvatar)),
      getAvatar,
      uploadAvatar: vi
        .fn()
        .mockResolvedValue({ status: 'uploaded', objectKey: 'new-avatar', correlationId: 'up' }),
      updateProfile: vi
        .fn()
        .mockResolvedValue({
          status: 'updated',
          profile: { ...withAvatar, version: 5 },
          correlationId: 'patch',
        }),
    });
    await waitFor(() => expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'blob:old'));
    fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), {
      target: { files: [new File(['png'], 'avatar.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'blob:new'));
    expect(getAvatar).toHaveBeenCalledTimes(2);
    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(revokeUrl).toHaveBeenCalledWith('blob:old');
    expect(getAvatar.mock.calls[0]?.[0].signal.aborted).toBe(true);
    unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:new');
  });

  it('keeps profile usable when avatar download fails and aborts pending downloads', async () => {
    const getAvatar = vi
      .fn()
      .mockResolvedValueOnce(failure())
      .mockImplementationOnce(
        ({ signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason)),
          ),
      );
    const withAvatar = { ...profile, avatar: { src: '/api/v1/me/avatar', alt: 'Avatar' } };
    const { client, unmount } = mount({
      readSelf: vi.fn(async () => ready(withAvatar)),
      getAvatar,
    });
    await screen.findByText(/Chưa tải được ảnh đại diện/);
    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue(profile.fullName);
    act(() =>
      client.setQueryData(['identity', 'self', 'success'], ready({ ...withAvatar, version: 5 })),
    );
    await waitFor(() => expect(getAvatar).toHaveBeenCalledTimes(2));
    unmount();
    expect(getAvatar.mock.calls[1]?.[0].signal.aborted).toBe(true);
  });

  it('deduplicates pages on fetch/refetch and resets to page one after revoke', async () => {
    let revoked = false;
    const listSessions = vi.fn(async ({ cursor }: { cursor?: string | null }) =>
      cursor ? page(['s1', 's2']) : page(revoked ? ['s2'] : ['s1'], revoked ? null : 'next'),
    );
    const revokePending =
      deferred<Awaited<ReturnType<NonNullable<IdentityRepository['revokeSession']>>>>();
    const revokeSession = vi.fn(() => revokePending.promise);
    const { client } = mount({ listSessions, revokeSession });
    await screen.findByLabelText('Tên hiển thị');
    await userEvent.click(screen.getByText('Phiên đăng nhập', { selector: 'summary' }));
    await screen.findByText('Phiên đăng nhập 1');
    await userEvent.click(screen.getByRole('button', { name: 'Tải thêm phiên' }));
    await screen.findByText('Phiên đăng nhập 2');
    await act(async () => client.invalidateQueries({ queryKey: ['identity', 'sessions'] }));
    expect(screen.getAllByRole('button', { name: 'Thu hồi phiên' })).toHaveLength(2);
    await userEvent.dblClick(screen.getAllByRole('button', { name: 'Thu hồi phiên' })[0]!);
    expect(revokeSession).toHaveBeenCalledTimes(1);
    revoked = true;
    await act(async () => revokePending.resolve({ status: 'revoked', correlationId: 'revoked' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Thu hồi phiên' })).toHaveLength(1),
    );
    expect(listSessions.mock.calls.at(-1)?.[0].cursor).toBeNull();
  });

  it('keeps previous sessions on next-page failure and permits retry', async () => {
    let failed = false;
    const listSessions = vi.fn(async ({ cursor }: { cursor?: string | null }) => {
      if (!cursor) return page(['s1'], 'next');
      if (!failed) {
        failed = true;
        return failure();
      }
      return page(['s2']);
    });
    mount({ listSessions });
    await screen.findByLabelText('Tên hiển thị');
    await userEvent.click(screen.getByText('Phiên đăng nhập', { selector: 'summary' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tải thêm phiên' }));
    await screen.findByText('Chưa thể tải nội dung');
    expect(screen.getByText('Phiên đăng nhập 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    await screen.findByText('Phiên đăng nhập 2');
  });

  it('handles rejected revoke without removing sessions or retrying the mutation', async () => {
    const revokeSession = vi.fn().mockRejectedValue(new Error('offline'));
    mount({ listSessions: vi.fn(async () => page(['s1'])), revokeSession });
    await screen.findByLabelText('Tên hiển thị');
    await userEvent.click(screen.getByText('Phiên đăng nhập', { selector: 'summary' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Thu hồi phiên' }));
    await screen.findByText(/Chưa thể xác nhận thu hồi phiên/);
    expect(revokeSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Phiên đăng nhập 1')).toBeInTheDocument();
  });

  it('validates password, preserves whitespace, clears cache only after success', async () => {
    const changePassword = vi
      .fn()
      .mockResolvedValueOnce(failure('UNAUTHENTICATED'))
      .mockResolvedValue({ status: 'changed', correlationId: 'changed' });
    const { client, clear, router } = mount({ changePassword });
    await screen.findByLabelText('Tên hiển thị');
    const form = within(screen.getByRole('form', { name: 'Đổi mật khẩu' }));
    await userEvent.click(form.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(form.getByLabelText('Mật khẩu hiện tại')).toHaveFocus();
    expect(changePassword).not.toHaveBeenCalled();
    await userEvent.type(form.getByLabelText('Mật khẩu hiện tại'), ' current password ');
    await userEvent.type(
      form.getByLabelText('Mật khẩu mới', { exact: true }),
      ' next password long ',
    );
    await userEvent.type(form.getByLabelText('Nhập lại mật khẩu mới'), ' next password long ');
    await userEvent.click(form.getByRole('button', { name: 'Đổi mật khẩu' }));
    await screen.findByText(/Thông tin xác thực không hợp lệ/);
    expect(clear).not.toHaveBeenCalled();
    expect(client.getQueryData(['identity', 'self', 'success'])).toBeDefined();
    await userEvent.click(form.getByRole('button', { name: 'Đổi mật khẩu' }));
    await screen.findByText('Login destination');
    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPassword: ' current password ',
        newPassword: ' next password long ',
      }),
    );
    expect(clear).toHaveBeenCalledTimes(1);
    expect(
      client.getQueriesData({ queryKey: ['identity'] }).every(([, data]) => data === undefined),
    ).toBe(true);
    expect(router.state.location.state).toEqual({ identityNotice: 'password-changed' });
  });
});
