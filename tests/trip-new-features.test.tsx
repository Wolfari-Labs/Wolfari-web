import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ReactNode } from 'react';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { CreateTripPage } from '../src/features/trips/create/CreateTripPage';
import { DressCodePage } from '../src/features/dress-code/DressCodePage';
import { PackingPage } from '../src/features/packing/PackingPage';
import { TripMapPage } from '../src/features/map/TripMapPage';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose());
  window.sessionStorage.clear();
});

function mount(
  path: string,
  element: ReactNode,
  handle: Record<string, unknown> = {},
  tripRepository = createFixtureTripRepository(),
  planRepository = createFixturePlanRepository(),
) {
  const createTrip = vi.spyOn(tripRepository, 'createTrip');
  const router = createMemoryRouter([
    {
      element: <App previewTripPath={`/trips/${previewTripId}`} />,
      children: [{ path, element, handle: { requiresViewer: true, contentTitle: true, fullBleed: true, ...handle } }],
    },
  ], { initialEntries: [path.replace(':tripId', previewTripId)] });
  routers.push(router);
  render(<Providers repository={createFixtureShellRepository()} tripRepository={tripRepository} planRepository={planRepository}><RouterProvider router={router} /></Providers>);
  return { router, createTrip };
}

describe('new trip workspace routes', () => {
  it('validates, sends only the verified core intent and preserves the draft when unavailable', async () => {
    const { createTrip } = mount('/trips/new', <CreateTripPage />);
    await screen.findByRole('heading', { name: 'Tạo chuyến đi mới', level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect((await screen.findAllByText('Vui lòng nhập tên chuyến đi.')).length).toBeGreaterThan(0);
    await userEvent.type(screen.getByLabelText('Tên chuyến đi'), 'Miền Trung');
    await userEvent.type(screen.getByLabelText('Điểm đến chính'), 'Đà Nẵng');
    await userEvent.type(screen.getByLabelText('Ngày đi'), '2026-10-20');
    await userEvent.type(screen.getByLabelText('Ngày về'), '2026-10-20');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect(await screen.findByText(/Dịch vụ tạo chuyến đi hiện chưa khả dụng/)).toBeInTheDocument();
    expect(createTrip).toHaveBeenCalledOnce();
    expect(createTrip.mock.calls[0]?.[0].intent).toMatchObject({
      name: 'Miền Trung',
      startAt: '2026-10-20T00:00:00+07:00',
      endAt: '2026-10-21T00:00:00+07:00',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    expect(createTrip.mock.calls[0]?.[0].intent).not.toHaveProperty('destination');
    expect(window.sessionStorage.getItem('wolfari:create-trip:v2')).toContain('Miền Trung');
  });

  it('shows the Figma success dialog only after the repository confirms creation', async () => {
    const repository = createFixtureTripRepository();
    vi.spyOn(repository, 'createTrip').mockResolvedValue({
      status: 'created',
      tripId: previewTripId,
      correlationId: 'create-trip-test',
    });
    mount('/trips/new', <CreateTripPage />, {}, repository);
    await userEvent.type(await screen.findByLabelText('Tên chuyến đi'), 'Miền Trung');
    await userEvent.type(screen.getByLabelText('Điểm đến chính'), 'Đà Nẵng');
    await userEvent.type(screen.getByLabelText('Ngày đi'), '2026-10-20');
    await userEvent.type(screen.getByLabelText('Ngày về'), '2026-10-20');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chuyến đi đã sẵn sàng' });
    expect(within(dialog).getByRole('link', { name: /Mở chuyến đi/ })).toHaveAttribute('href', `/trips/${previewTripId}`);
    expect(window.sessionStorage.getItem('wolfari:create-trip:v2')).toBeNull();
  });

  it('renders grouped Dress Code projection without write controls', async () => {
    mount('/trips/:tripId/dress-code', <DressCodePage />, { section: 'dress' });
    expect(await screen.findByText('Thoải mái và gọn nhẹ')).toBeInTheDocument();
    expect(screen.getByText(/Nguồn: Gợi ý đã lưu trước đây/)).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('article', { name: 'Trang phục đi biển' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /thêm|sửa|xóa/i })).not.toBeInTheDocument();
  });

  it('shows an empty Dress Code scope without leaking cards from other scopes', async () => {
    const repository = createFixturePlanRepository();
    const getPlan = repository.getPlan;
    vi.spyOn(repository, 'getPlan').mockImplementation(async (request) => {
      const result = await getPlan(request);
      return result.status === 'ready' ? { ...result, data: { ...result.data, dressCodes: result.data.dressCodes.filter((item) => item.scopeType !== 'ACTIVITY') } } : result;
    });
    mount('/trips/:tripId/dress-code', <DressCodePage />, { section: 'dress' }, createFixtureTripRepository(), repository);
    await screen.findByText('Thoải mái và gọn nhẹ');
    await userEvent.click(screen.getByRole('tab', { name: 'Theo hoạt động' }));
    expect(screen.getByRole('heading', { name: 'Chưa có dress code đã lưu' })).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('renders projected Packing status without checkbox actions or raw assignee ids', async () => {
    mount('/trips/:tripId/packing', <PackingPage />, { section: 'packing' });
    expect(await screen.findByText('Kem chống nắng')).toBeInTheDocument();
    expect(screen.getByText(/1\.5 chai/)).toBeInTheDocument();
    expect(screen.getByText(/Đã phân công/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/11111111-1111/)).not.toBeInTheDocument();
  });

  it('keeps the saved-location list usable while the map provider is unavailable', async () => {
    mount('/trips/:tripId/map', <TripMapPage />, { section: 'map' });
    expect(
      await screen.findByText('Bản đồ nền chưa được cấu hình', { selector: 'strong' }),
    ).toBeInTheDocument();
    const list = screen.getByRole('region', { name: /^Địa điểm/ });
    await userEvent.click(within(list).getByRole('button', { name: /Ngũ Hành Sơn/ }));
    expect(screen.getByRole('complementary', { name: 'Chi tiết địa điểm' })).toHaveTextContent('Chưa có tọa độ hợp lệ');
    await userEvent.selectOptions(screen.getByLabelText('Sắp xếp lịch'), 'UNSCHEDULED');
    expect(within(list).queryByRole('button', { name: /Bán đảo Sơn Trà/ })).not.toBeInTheDocument();
  });
});
