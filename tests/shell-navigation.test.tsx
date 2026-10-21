import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '../src/app/providers';
import { App } from '../src/app/App';
import { createRouter } from '../src/app/router';
import { createGatewayShellRepository } from '../src/infrastructure/repositories/shell.gateway-repository';
import { ContentState } from '../src/shared/components/ContentState';
import {
  createFixtureShellRepository,
  previewTripId,
} from '../src/infrastructure/fixtures/shell.fixture-repository';

function mount() {
  const tripPath = '/trips/' + previewTripId;
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={tripPath} />,
        children: [
          { path: '/trips/:tripId', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/plan', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/map', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/dress-code', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/packing', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/members', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/fund', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/price-watch', element: <ContentState state="placeholder" /> },
          { path: '/trips/:tripId/settings', element: <ContentState state="placeholder" /> },
          { path: '/trips', element: <ContentState state="placeholder" /> },
          { path: '/', element: <ContentState state="placeholder" /> },
          { path: '/admin', element: <ContentState state="placeholder" /> },
        ],
      },
    ],
    { initialEntries: [tripPath] },
  );
  render(
    <Providers repository={createFixtureShellRepository()}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}
describe('Shell interactions', () => {
  it('unknown route remains not-found even when the Gateway shell is unavailable', async () => {
    window.history.replaceState({}, '', '/missing-shell-route');
    const router = createRouter(null);
    try {
      render(
        <Providers repository={createGatewayShellRepository()}>
          <RouterProvider router={router} />
        </Providers>,
      );
      await screen.findByText('Không tìm thấy trang');
      expect(screen.queryByText('Chức năng chưa khả dụng')).not.toBeInTheDocument();
    } finally {
      router.dispose();
      window.history.replaceState({}, '', '/');
    }
  });
  it('does not render a private outlet when a ready snapshot explicitly denies read', async () => {
    mount();
    await screen.findByText('Trang Nguyễn ⌄');
    await userEvent.selectOptions(
      screen.getByLabelText('Trạng thái preview'),
      'forbidden-snapshot',
    );
    await screen.findByText('Bạn không có quyền truy cập');
    expect(screen.queryByText('Không gian làm việc')).not.toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
    within(navigation)
      .getAllByRole('button')
      .forEach((button) => expect(button).toBeDisabled());
  });
  it('requires an explicit Admin snapshot and never grants role from the URL', async () => {
    const router = mount();
    await screen.findByText('Trang Nguyễn ⌄');
    await userEvent.click(screen.getByRole('link', { name: 'Shell Admin' }));
    expect(router.state.location.pathname).toBe('/admin');
    await screen.findByText('Bạn không có quyền truy cập');
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái preview'), 'admin');
    await screen.findByText('Không gian làm việc');
    expect(screen.queryByText('Bạn không có quyền truy cập')).not.toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Điều hướng Admin' });
    await userEvent.click(within(nav).getByRole('button', { name: 'Tài khoản' }));
    expect(router.state.location.pathname).toBe('/admin');
    expect(within(nav).getByRole('button', { name: 'Tài khoản' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
  it('toggles sidebar and changes section without claiming a mutation', async () => {
    const router = mount();
    await screen.findByText('Trang Nguyễn ⌄');
    const sidebar = screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
    await userEvent.click(within(sidebar).getByRole('link', { name: 'Packing list' }));
    expect(router.state.location.pathname).toBe(`/trips/${previewTripId}/packing`);
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' })).getByRole('link', {
        name: 'Quỹ nhóm',
      }),
    );
    expect(router.state.location.pathname).toBe(`/trips/${previewTripId}/fund`);
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' })).getByRole('link', {
        name: 'Theo dõi giá vé',
      }),
    );
    expect(router.state.location.pathname).toBe(`/trips/${previewTripId}/price-watch`);
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' })).getByRole('link', {
        name: 'Cài đặt',
      }),
    );
    expect(router.state.location.pathname).toBe(`/trips/${previewTripId}/settings`);
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' }));
    const expand = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand.querySelector('img')?.className).toContain('collapseIconReversed');
    expect(screen.queryByText(/đã lưu/i)).not.toBeInTheDocument();
  });
  it('forbidden clears the membership and prevents section actions', async () => {
    mount();
    await screen.findByText('Trang Nguyễn ⌄');
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái preview'), 'forbidden');
    await screen.findByText('Bạn không có quyền truy cập');
    const sidebar = screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
    within(sidebar)
      .getAllByRole('button')
      .forEach((button) => expect(button).toBeDisabled());
    expect(screen.queryByText('Trang Nguyễn ⌄')).not.toBeInTheDocument();
  });
  it('renders empty, conflict reload, and persistent loading states', async () => {
    mount();
    await screen.findByText('Trang Nguyễn ⌄');
    const scenario = screen.getByLabelText('Trạng thái preview');
    await userEvent.selectOptions(scenario, 'empty');
    await screen.findByText('Chưa có nội dung');
    await userEvent.selectOptions(scenario, 'conflict');
    await screen.findByText('Dữ liệu đã thay đổi');
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByText('Dữ liệu đã thay đổi')).toBeInTheDocument();
    await userEvent.selectOptions(scenario, 'loading');
    expect(await screen.findByText('Đang tải…')).toBeInTheDocument();
  });
  it('opens the mobile workspace drawer and changes section without bottom tabs', async () => {
    mount();
    await screen.findByText('Trang Nguyễn ⌄');
    await userEvent.click(screen.getByRole('button', { name: 'Mở điều hướng chuyến đi' }));
    const drawer = within(screen.getByRole('dialog')).getByRole('navigation', {
      name: 'Điều hướng chuyến đi',
    });
    await userEvent.click(within(drawer).getByRole('link', { name: 'Lịch trình' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Điều hướng chuyến đi' })).getByRole('link', {
        name: 'Lịch trình',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('navigation', { name: 'Điều hướng Mobile' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Đóng điều hướng chuyến đi' }),
    ).not.toBeInTheDocument();
  });
});
