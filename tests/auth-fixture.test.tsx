import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { AuthPage } from '../src/features/auth/AuthPage';
import { ProfilePage } from '../src/features/auth/ProfilePage';
import { HomeRoute } from '../src/app/HomeRoute';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { validateAuth, type AuthFormValues } from '../src/features/auth/model/auth-validation';
import { createFixtureIdentityRepository } from '../src/infrastructure/fixtures/identity.fixture-repository';
import { createFixtureHomeRepository } from '../src/infrastructure/fixtures/home.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createGatewayIdentityRepository } from '../src/infrastructure/repositories/identity.gateway-repository';
import { createGatewayHomeRepository } from '../src/infrastructure/repositories/home.gateway-repository';
import { selectIdentityRepository } from '../src/infrastructure/repositories/select-identity-repository';
import { selectHomeRepository } from '../src/infrastructure/repositories/select-home-repository';
import { createFixtureDemoAccess } from '../src/infrastructure/fixtures/demo-access';

const valid: AuthFormValues = {
  fullName: 'Trang Nguyễn',
  email: 'name@example.com',
  password: 'a long preview password',
  confirmation: 'a long preview password',
  acceptedTerms: true,
};
const request = (
  scenario:
    | 'success'
    | 'loading'
    | 'empty'
    | 'error'
    | 'forbidden'
    | 'not-found'
    | 'conflict'
    | 'unavailable' = 'success',
  signal = new AbortController().signal,
) => ({ scenario, signal });

describe('Auth validation without Identity writes', () => {
  it('accepts registration fields without creating a session and permits existing shorter login passwords', () => {
    expect(validateAuth('register', valid)).toEqual({});
    expect(validateAuth('login', { ...valid, password: 'old' })).toEqual({});
  });
  it('counts Unicode code points and applies the runtime 15–128 policy', () => {
    expect(
      validateAuth('register', {
        ...valid,
        password: '😀'.repeat(15),
        confirmation: '😀'.repeat(15),
      }),
    ).toEqual({});
    expect(validateAuth('register', { ...valid, password: '😀'.repeat(14) })).toHaveProperty(
      'password',
    );
    expect(validateAuth('register', { ...valid, password: 'a'.repeat(129) })).toHaveProperty(
      'password',
    );
  });
  it('validates name/email length, confirmation and consent; orders the first invalid field', () => {
    expect(
      Object.keys(
        validateAuth('register', {
          fullName: ' ',
          email: 'bad',
          password: '',
          confirmation: '',
          acceptedTerms: false,
        }),
      )[0],
    ).toBe('fullName');
    expect(
      validateAuth('register', {
        ...valid,
        fullName: 'x'.repeat(151),
        email: 'x'.repeat(256) + '@example.com',
        confirmation: 'wrong',
        acceptedTerms: false,
      }),
    ).toMatchObject({
      fullName: expect.any(String),
      email: expect.any(String),
      confirmation: expect.any(String),
      acceptedTerms: expect.any(String),
    });
  });
  it('keeps invalid input/focus and valid submit remains unavailable without navigation/network/storage', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthPage mode="login" previewEnabled />
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
      expect(screen.getByLabelText('Email')).toHaveFocus();
      await userEvent.type(screen.getByLabelText('Email'), 'name@example.com');
      await userEvent.type(screen.getByLabelText('Mật khẩu'), 'preview password');
      await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
      expect(
        await screen.findByText(/Bản xem trước chưa hỗ trợ tạo tài khoản hoặc đăng nhập thật/),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveValue('name@example.com');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(localStorage.length + sessionStorage.length).toBe(0);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('reveals and hides a password without changing its value', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthPage mode="login" previewEnabled />
      </MemoryRouter>,
    );
    const password = screen.getByLabelText('Mật khẩu');
    await userEvent.type(password, 'Secret value 123');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('Secret value 123');
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('Secret value 123');
  });
  it('uses presentation pending/unknown without a fabricated session result', async () => {
    render(
      <MemoryRouter>
        <AuthPage mode="register" previewEnabled />
      </MemoryRouter>,
    );
    const select = screen.getByLabelText('Trạng thái biểu mẫu');
    await userEvent.selectOptions(select, 'pending');
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled();
    await userEvent.selectOptions(select, 'unknown');
    expect(screen.getByText(/Chưa có tài khoản hoặc phiên nào được xác nhận/)).toBeInTheDocument();
  });
});

describe('Identity/Home read-only adapter contract', () => {
  it('retains Self version and verified session fields without inventing device metadata', async () => {
    const repo = createFixtureIdentityRepository();
    const profile = await repo.readSelf(request());
    expect(profile).toMatchObject({
      status: 'ready',
      data: { id: expect.any(String), version: 1, avatar: null, status: 'ACTIVE' },
    });
    const sessions = await repo.listSessions(request());
    expect(sessions.status).toBe('ready');
    if (sessions.status !== 'ready') throw Error('Missing sessions');
    expect(Object.keys(sessions.data.items[0]!)).toEqual([
      'id',
      'createdAt',
      'lastUsedAt',
      'expiresAt',
      'revokedAt',
    ]);
    expect(Object.keys(repo)).toEqual(['readSelf', 'listSessions']);
  });
  it.each(['empty', 'error', 'forbidden', 'not-found', 'conflict', 'unavailable'] as const)(
    'keeps explicit %s scenarios in both repositories',
    async (scenario) => {
      const identity = await createFixtureIdentityRepository().readSelf(request(scenario));
      const home = await createFixtureHomeRepository().readLanding(request(scenario));
      expect(identity.status).toBe(scenario === 'empty' ? 'empty' : 'error');
      expect(home.status).toBe(identity.status);
      if (identity.status === 'error' && home.status === 'error')
        expect(identity.error).toMatchObject({
          code: home.error.code,
          retryable: scenario === 'error',
        });
    },
  );
  it('clones projections between calls and aborts pending reads', async () => {
    const repo = createFixtureIdentityRepository(),
      first = await repo.readSelf(request());
    if (first.status !== 'ready') throw Error('Missing profile');
    const original = structuredClone(first);
    Object.assign(first.data, { fullName: 'local edit', version: 99 });
    expect(await repo.readSelf(request())).toEqual(original);
    const controller = new AbortController();
    const pending = repo.readSelf(request('loading', controller.signal));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('Gateway is unavailable/no HTTP and supports the same domain reader interface', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      expect(await createGatewayIdentityRepository().readSelf(request())).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
      expect(await createGatewayHomeRepository().readLanding(request())).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
      const fixture = createFixtureIdentityRepository();
      expect(await createGatewayIdentityRepository(fixture).readSelf(request())).toEqual(
        await fixture.readSelf(request()),
      );
      const home = createFixtureHomeRepository();
      expect(await createGatewayHomeRepository(home.readLanding).readLanding(request())).toEqual(
        await home.readLanding(request()),
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('does not evaluate fixture factories in production', () => {
    const identity = vi.fn(createFixtureIdentityRepository),
      home = vi.fn(createFixtureHomeRepository);
    expect(() => selectIdentityRepository('fixture', false, identity)).toThrow();
    expect(() => selectHomeRepository('fixture', false, home)).toThrow();
    expect(identity).not.toHaveBeenCalled();
    expect(home).not.toHaveBeenCalled();
  });
});

function mount(path = '/profile', guest = false, demo = false) {
  const shell = createFixtureShellRepository(),
    identity = createFixtureIdentityRepository(),
    trip = createFixtureTripRepository();
  const readSelf = vi.fn(identity.readSelf),
    listTrips = vi.fn(trip.listTrips);
  const router = createMemoryRouter(
    [
      {
        element: (
          <App
            previewTripPath="/trips/11111111-1111-4111-8111-111111111111"
            {...(demo ? { demoAccess: createFixtureDemoAccess() } : {})}
          />
        ),
        children: [
          {
            path: '/profile',
            element: <ProfilePage previewEnabled />,
            handle: { contentTitle: true, requiresViewer: true },
          },
          { path: '/', element: <HomeRoute />, handle: { contentTitle: true } },
          {
            path: '/login',
            element: <AuthPage mode="login" previewEnabled />,
            handle: { contentTitle: true },
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <Providers
      repository={{
        read: (input) => shell.read({ ...input, ...(guest ? { scenario: 'guest' as const } : {}) }),
      }}
      tripRepository={{ ...trip, listTrips }}
      identityRepository={{ ...identity, readSelf }}
      homeRepository={createFixtureHomeRepository()}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return { router, readSelf, listTrips };
}
describe('Self/profile and Home composition', () => {
  it('rejects incorrect demo credentials and opens a labelled in-memory User preview with the sample account', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const { listTrips, router } = mount('/login', false, true);
      await userEvent.click(await screen.findByRole('button', { name: 'Điền tài khoản demo' }));
      expect(screen.getByLabelText('Email')).toHaveValue('trang.nguyen@example.com');
      await userEvent.clear(screen.getByLabelText('Mật khẩu'));
      await userEvent.type(screen.getByLabelText('Mật khẩu'), 'incorrect');
      await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
      await screen.findByText(/Email hoặc mật khẩu demo chưa đúng/);
      expect(router.state.location.pathname).toBe('/login');
      expect(listTrips).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Điền tài khoản demo' }));
      await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
      expect(await screen.findAllByRole('link', { name: 'Chuyến đi của tôi' })).not.toHaveLength(0);
      expect(router.state.location.pathname).toBe('/');
      expect(screen.getByText(/Phiên demo · Chỉ dữ liệu fixture/)).toBeInTheDocument();
      expect(listTrips).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Thoát phiên demo' }));
      await screen.findByRole('link', { name: 'Bắt đầu ngay' });
      expect(screen.queryByText('Phú Quốc – Hẹn với biển')).not.toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(localStorage.length + sessionStorage.length).toBe(0);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('matches only the public demo account, normalizing email without trimming or ignoring password case', () => {
    const demo = createFixtureDemoAccess();
    expect(
      demo.accepts({ email: ' TRANG.NGUYEN@example.com ', password: demo.account.password }),
    ).toBe(true);
    expect(demo.accepts({ ...demo.account, email: 'other@example.com' })).toBe(false);
    expect(demo.accepts({ ...demo.account, password: demo.account.password.toLowerCase() })).toBe(
      false,
    );
    expect(demo.accepts({ ...demo.account, password: demo.account.password + ' ' })).toBe(false);
  });
  it('keeps the profile draft across read error/recovery and never increments version on preview save', async () => {
    mount();
    const name = await screen.findByLabelText('Tên hiển thị');
    await userEvent.clear(name);
    await userEvent.type(name, 'Tên sửa local');
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái hồ sơ'), 'error');
    await screen.findByText('Chưa thể tải nội dung');
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái hồ sơ'), 'success');
    expect(await screen.findByLabelText('Tên hiển thị')).toHaveValue('Tên sửa local');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText(/Chưa lưu được thay đổi/);
    expect(screen.getByText(/Phiên bản hồ sơ: 1/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Phiên đăng nhập', { selector: 'summary' }));
    await screen.findByText('Phiên đăng nhập 1');
  });
  it.each(['/profile', '/PROFILE/'])(
    'blocks initial Guest at %s before private reads',
    async (path) => {
      const { readSelf } = mount(path, true);
      await screen.findByText('Bạn không có quyền truy cập');
      expect(readSelf).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Tên hiển thị')).not.toBeInTheDocument();
    },
  );
  it('Home defaults to Guest and reads public inspiration without reading private Trip data', async () => {
    const { listTrips } = mount('/');
    await screen.findByText('Minh họa từ thiết kế');
    expect(screen.getByRole('link', { name: 'Bắt đầu ngay' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Bắt đầu hành trình' })).toHaveAttribute(
      'href',
      '/register',
    );
    await userEvent.click(screen.getByText('Home preview · Dữ liệu minh họa'));
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái trang chủ'), 'error');
    await userEvent.click(await screen.findByRole('button', { name: 'Tải lại' }));
    expect(listTrips).not.toHaveBeenCalled();
    expect(screen.queryByText('Phú Quốc – Hẹn với biển')).not.toBeInTheDocument();
  });
  it('User Home keeps the Figma landing composition without reading private Trip data', async () => {
    const { listTrips } = mount('/');
    await userEvent.click(await screen.findByText('UI preview · Dữ liệu minh họa'));
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái preview'), 'success');
    expect(await screen.findByRole('link', { name: 'Khám phá ứng dụng' })).toHaveAttribute(
      'href',
      '/trips',
    );
    expect(screen.getAllByRole('link', { name: 'Chuyến đi của tôi' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ pathname: '/trips' })]),
    );
    expect(screen.queryByText('Chuyến đi riêng tư – không được hiển thị')).not.toBeInTheDocument();
    expect(screen.queryByText('Phú Quốc – Hẹn với biển')).not.toBeInTheDocument();
    expect(listTrips).not.toHaveBeenCalled();
  });
});
