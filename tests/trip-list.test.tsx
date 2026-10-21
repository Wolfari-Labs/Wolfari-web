import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripListPage } from '../src/features/trips/TripListPage';
import { ContentState } from '../src/shared/components/ContentState';
import type { ShellRepository } from '../src/features/shell/repositories/shell.repository';
import type { TripRepository } from '../src/features/trips/repositories/trip.repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { fixtureTripCatalog, previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  for (const router of routers.splice(0)) router.dispose();
  vi.restoreAllMocks();
});

function mount({
  tripRepository = createFixtureTripRepository(),
  shellRepository = createFixtureShellRepository(),
  initialPath = '/trips',
}: {
  tripRepository?: TripRepository;
  shellRepository?: ShellRepository;
  initialPath?: string;
} = {}) {
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={'/trips/' + previewTripId} />,
        children: [
          {
            path: '/trips',
            element: <TripListPage previewEnabled />,
            handle: { title: 'Chuyến đi của tôi', layout: 'trip-list', requiresViewer: true },
          },
          { path: '/trips/:tripId', element: <ContentState state="placeholder" /> },
          { path: '/trips/new', element: <ContentState state="placeholder" /> },
          {
            path: '/admin',
            element: <ContentState state="placeholder" />,
            handle: { layout: 'admin', requiresViewer: true },
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  routers.push(router);
  render(
    <Providers repository={shellRepository} tripRepository={tripRepository}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}

function tripLinks() {
  return screen.queryAllByRole('link', { name: /^Mở chuyến đi / });
}

async function loaded() {
  await screen.findByRole('link', { name: 'Mở chuyến đi Đà Nẵng – Hội An' });
}

function statusButton(label: string) {
  return within(screen.getByRole('group', { name: 'Trạng thái chuyến đi' })).getByRole('button', {
    name: new RegExp(`^${label}(?: ·| \\(|$)`),
  });
}

describe('Trip List route slice', () => {
  it('renders six permitted card links with disabled writes and unresolved filters, without HTTP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    mount();
    await loaded();
    expect(tripLinks()).toHaveLength(6);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByText('Chuyến đi riêng tư – không được hiển thị')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /88888888/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo chuyến đi' })).toHaveAttribute('href', '/trips/new');
    expect(screen.getByRole('link', { name: '+ Tạo một hành trình mới' })).toHaveAttribute('href', '/trips/new');
    const moreActions = screen.getAllByRole('button', { name: /^Thao tác / });
    expect(moreActions).toHaveLength(6);
    moreActions.forEach((button) => expect(button).toBeDisabled());
    for (const name of [/^Vai trò:/, /^Thời gian/, /^Bộ lọc$/])
      expect(screen.getByRole('button', { name })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/đã lưu thành công|đã tạo chuyến đi/i)).not.toBeInTheDocument();
  });

  it('searches names without diacritics and combines status selection with truthful full-list counts', async () => {
    mount();
    await loaded();
    const search = screen.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' });
    await userEvent.type(search, 'DA LAT');
    expect(tripLinks()).toHaveLength(1);
    expect(tripLinks()[0]).toHaveAccessibleName('Mở chuyến đi Đà Lạt – Một chút bình yên');
    expect(statusButton('Tất cả')).toHaveAccessibleName('Tất cả · 6');
    expect(statusButton('Sắp tới')).toHaveAccessibleName('Sắp tới · 3');
    expect(statusButton('Đang diễn ra')).toHaveAccessibleName('Đang diễn ra · 1 (Đang đi)');
    expect(statusButton('Đã kết thúc')).toHaveAccessibleName('Đã kết thúc · 2 (Đã đi)');
    await userEvent.click(statusButton('Đang diễn ra'));
    expect(await screen.findByText('Không có chuyến đi phù hợp')).toBeInTheDocument();
    expect(statusButton('Đang diễn ra')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(statusButton('Sắp tới'));
    expect(tripLinks()).toHaveLength(1);
    expect(tripLinks()[0]).toHaveAccessibleName('Mở chuyến đi Đà Lạt – Một chút bình yên');
  });

  it('changes start-date order in either direction and restores canonical order', async () => {
    mount();
    await loaded();
    const original = tripLinks().map((link) => link.getAttribute('aria-label'));
    const sort = screen.getByRole('combobox', { name: 'Sắp xếp chuyến đi' });
    await userEvent.selectOptions(sort, 'start-asc');
    expect(tripLinks()[0]).toHaveAccessibleName('Mở chuyến đi Ninh Bình – Giữa núi xanh');
    expect(tripLinks().at(-1)).toHaveAccessibleName('Mở chuyến đi Sài Gòn – Vũng Tàu');
    const ascending = tripLinks().map((link) => link.getAttribute('aria-label'));
    await userEvent.selectOptions(sort, 'start-desc');
    expect(tripLinks().map((link) => link.getAttribute('aria-label'))).toEqual(
      [...ascending].reverse(),
    );
    await userEvent.selectOptions(sort, 'listed');
    expect(tripLinks().map((link) => link.getAttribute('aria-label'))).toEqual(original);
  });

  it('explains an empty archived selection and clears name, status and sort together', async () => {
    mount();
    await loaded();
    const search = screen.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' });
    const sort = screen.getByRole('combobox', { name: 'Sắp xếp chuyến đi' });
    await userEvent.type(search, 'đà');
    await userEvent.selectOptions(sort, 'start-desc');
    await userEvent.click(statusButton('Đã lưu trữ'));
    expect(statusButton('Đã lưu trữ')).toHaveAccessibleName('Đã lưu trữ · 0 (Lưu trữ)');
    expect(await screen.findByText('Không có chuyến đi phù hợp')).toBeInTheDocument();
    expect(tripLinks()).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(search).toHaveValue('');
    expect(sort).toHaveValue('listed');
    expect(statusButton('Tất cả')).toHaveAttribute('aria-pressed', 'true');
    expect(tripLinks()).toHaveLength(6);
  });

  it('covers local list states and persistent conflict retries while retaining query choices on recovery', async () => {
    const repository = createFixtureTripRepository();
    const read = vi.spyOn(repository, 'listTrips');
    mount({ tripRepository: repository });
    await loaded();
    const search = screen.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' });
    const sort = screen.getByRole('combobox', { name: 'Sắp xếp chuyến đi' });
    await userEvent.type(search, 'da');
    await userEvent.click(statusButton('Sắp tới'));
    await userEvent.selectOptions(sort, 'start-desc');
    await userEvent.click(screen.getByText('Trip List preview · Dữ liệu minh họa'));
    const preview = screen.getByRole('combobox', { name: 'Trạng thái danh sách' });
    for (const [scenario, message] of [
      ['empty', 'Chưa có chuyến đi'],
      ['error', 'Chưa thể tải nội dung'],
      ['forbidden', 'Bạn không có quyền truy cập'],
      ['conflict', 'Dữ liệu đã thay đổi'],
      ['unavailable', 'Chức năng chưa khả dụng'],
      ['loading', 'Đang tải…'],
    ]) {
      await userEvent.selectOptions(preview, scenario!);
      expect(await screen.findByText(message!, { exact: true })).toBeInTheDocument();
      expect(tripLinks()).toHaveLength(0);
      expect(search).toHaveValue('da');
      expect(sort).toHaveValue('start-desc');
      expect(statusButton('Sắp tới')).toHaveAttribute('aria-pressed', 'true');
      if (scenario === 'conflict') {
        const calls = read.mock.calls.length;
        await userEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
        await waitFor(() => expect(read.mock.calls.length).toBeGreaterThan(calls));
        expect(await screen.findByText(message!, { exact: true })).toBeInTheDocument();
      }
    }
    await userEvent.selectOptions(preview, 'success');
    await screen.findByRole('link', { name: 'Mở chuyến đi Đà Lạt – Một chút bình yên' });
    expect(tripLinks()).toHaveLength(1);
    expect(search).toHaveValue('da');
    expect(sort).toHaveValue('start-desc');
    expect(statusButton('Sắp tới')).toHaveAttribute('aria-pressed', 'true');
    expect(statusButton('Tất cả')).toHaveAccessibleName('Tất cả · 6');
    expect(screen.queryByText(/đã lưu thành công|đã tạo chuyến đi/i)).not.toBeInTheDocument();
  });

  it('retries a thrown read failure with name, status and sort preserved', async () => {
    const fixture = createFixtureTripRepository();
    const read = vi
      .fn(fixture.listTrips)
      .mockRejectedValueOnce(new Error('internal transport detail'));
    mount({ tripRepository: { ...createFixtureTripRepository(), listTrips: read } });
    await screen.findByText('Chưa thể tải nội dung', { exact: true });
    const search = screen.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' });
    const sort = screen.getByRole('combobox', { name: 'Sắp xếp chuyến đi' });
    await userEvent.type(search, 'ninh binh');
    await userEvent.click(statusButton('Đã kết thúc'));
    await userEvent.selectOptions(sort, 'start-desc');
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    await screen.findByRole('link', { name: 'Mở chuyến đi Ninh Bình – Giữa núi xanh' });
    expect(tripLinks()).toHaveLength(1);
    expect(search).toHaveValue('ninh binh');
    expect(sort).toHaveValue('start-desc');
    expect(statusButton('Đã kết thúc')).toHaveAttribute('aria-pressed', 'true');
    expect(read).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('internal transport detail')).not.toBeInTheDocument();
  });

  it('renders missing enrichment without a fake cover or fabricated member total', async () => {
    const source = fixtureTripCatalog[0];
    if (!source) throw new Error('Expected canonical fixture');
    const repository = createFixtureTripRepository({
      records: [{ ...source, presentation: { memberCount: null, cover: null } }],
    });
    mount({ tripRepository: repository });
    await loaded();
    const card = screen.getByRole('article');
    expect(within(card).getByLabelText('Chưa có ảnh chuyến đi')).toBeInTheDocument();
    expect(card.querySelector('picture')).toBeNull();
    expect(within(card).queryByText(/^\d+ thành viên$/)).not.toBeInTheDocument();
    expect(within(card).getByText('Chủ chuyến', { exact: true })).toBeInTheDocument();
  });

  it.each(['/trips', '/trips/', '/TRIPS'])(
    'denies a Guest at %s before the feature repository can read private trips',
    async (initialPath) => {
      const shell = createFixtureShellRepository();
      const tripRepository = createFixtureTripRepository();
      const read = vi.spyOn(tripRepository, 'listTrips');
      mount({
        initialPath,
        shellRepository: { read: (input) => shell.read({ ...input, scenario: 'guest' }) },
        tripRepository,
      });
      await screen.findByText('Bạn không có quyền truy cập', { exact: true });
      expect(read).not.toHaveBeenCalled();
      expect(tripLinks()).toHaveLength(0);
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    },
  );

  it.each(['/trips/', '/TRIPS'])(
    'keeps the authenticated list heading and navigation selection at route alias %s',
    async (initialPath) => {
      const router = mount({ initialPath });
      await loaded();
      expect(router.state.location.pathname).toBe(initialPath);
      expect(tripLinks()).toHaveLength(6);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chuyến đi của tôi');
      const navigation = screen.getByRole('navigation', { name: 'Điều hướng chính' });
      expect(within(navigation).getByRole('link', { name: 'Chuyến đi của tôi' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    },
  );

  it.each(['/admin/', '/ADMIN'])(
    'preserves the explicit Admin role guard at route alias %s',
    async (initialPath) => {
      const tripRepository = createFixtureTripRepository();
      const read = vi.spyOn(tripRepository, 'listTrips');
      mount({ initialPath, tripRepository });
      await screen.findByText('Bạn không có quyền truy cập', { exact: true });
      expect(screen.queryByText('Không gian làm việc', { exact: true })).not.toBeInTheDocument();
      const navigation = screen.getByRole('navigation', { name: 'Điều hướng Admin' });
      within(navigation)
        .getAllByRole('button')
        .forEach((button) => expect(button).toBeDisabled());
      await userEvent.click(screen.getByText('UI preview · Dữ liệu minh họa'));
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'Trạng thái preview' }),
        'admin',
      );
      await screen.findByText('Không gian làm việc', { exact: true });
      within(navigation)
        .getAllByRole('button')
        .forEach((button) => expect(button).toBeEnabled());
      expect(read).not.toHaveBeenCalled();
    },
  );

  it('opens every known card destination and returns focus to main when navigating Back', async () => {
    const router = mount();
    await loaded();
    const destinations = tripLinks().map((link) => ({
      name: link.getAttribute('aria-label')!,
      path: link.getAttribute('href')!,
    }));
    for (const destination of destinations) {
      await userEvent.click(screen.getByRole('link', { name: destination.name }));
      await screen.findByText('Không gian làm việc', { exact: true });
      expect(router.state.location.pathname).toBe(destination.path);
      expect(screen.getByRole('main')).toHaveFocus();
      await act(async () => {
        await router.navigate(-1);
      });
      await loaded();
      expect(router.state.location.pathname).toBe('/trips');
      expect(screen.getByRole('main')).toHaveFocus();
      expect(tripLinks()).toHaveLength(6);
    }
  });
});
