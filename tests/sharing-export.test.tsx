import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SharingPage } from '../src/features/sharing/SharingPage';
import { TripRepositoryProvider } from '../src/features/trips/repositories/repository-context';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

function mount(pdfAvailable: boolean, hash = '') {
  const repository = createFixtureTripRepository();
  const planPdf = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/trips/:tripId/share', element: <SharingPage /> },
      { path: '/trips/:tripId/settings', element: <p>Xuất plan đã mở</p> },
    ],
    { initialEntries: [`/trips/${previewTripId}/share${hash}`] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TripRepositoryProvider repository={{ ...repository, ...(pdfAvailable ? { planPdf } : {}) }}>
        <RouterProvider router={router} />
      </TripRepositoryProvider>
    </QueryClientProvider>,
  );
  return { router, planPdf, user: userEvent.setup() };
}

describe('Supported plan export from Sharing', () => {
  it('mounts only the selected export, public share or history view', async () => {
    const { user } = mount(true);
    const exportTab = await screen.findByRole('tab', { name: 'Xuất tệp', selected: true });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    const exportPanel = screen.getByRole('tabpanel', { name: 'Xuất tệp' });
    expect(within(exportPanel).getByRole('heading', { name: 'Tùy chọn xuất tệp' })).toBeVisible();
    expect(within(exportPanel).getByRole('heading', { name: 'Xem trước tài liệu' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Public Share', hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Lịch sử xuất tệp', hidden: true }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Public Share' }));
    expect(screen.getByRole('tab', { name: 'Public Share' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    const publicPanel = screen.getByRole('tabpanel', { name: 'Public Share' });
    expect(within(publicPanel).getByRole('heading', { name: 'Public Share' })).toBeVisible();
    expect(within(publicPanel).getByRole('button', { name: 'Tạo link chỉ xem' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Tùy chọn xuất tệp', hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Xem trước tài liệu', hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Lịch sử xuất tệp', hidden: true }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Lịch sử' }));
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    const historyPanel = screen.getByRole('tabpanel', { name: 'Lịch sử' });
    expect(within(historyPanel).getByRole('heading', { name: 'Lịch sử xuất tệp' })).toBeVisible();
    expect(within(historyPanel).getByText('Lịch sử xuất tệp chưa khả dụng.')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Public Share', hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Tùy chọn xuất tệp', hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Xem trước tài liệu', hidden: true }),
    ).not.toBeInTheDocument();
    await user.click(exportTab);
    expect(screen.getByRole('tabpanel', { name: 'Xuất tệp' })).toBeVisible();
  });

  it('retains export choices and public share draft while switching views', async () => {
    const { user } = mount(false);
    await user.click(await screen.findByRole('radio', { name: /Excel \(\.xlsx\)/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Lịch trình chi tiết' }));
    await user.click(screen.getByRole('tab', { name: 'Public Share' }));
    await user.type(screen.getByLabelText('Ngày hết hạn'), '01/12/2026');
    await user.type(screen.getByLabelText('Mật khẩu'), 'share-draft');
    await user.click(screen.getByRole('checkbox', { name: 'Dress code' }));
    await user.click(screen.getByRole('tab', { name: 'Lịch sử' }));
    await user.click(screen.getByRole('tab', { name: 'Xuất tệp' }));
    expect(screen.getByRole('radio', { name: /Excel \(\.xlsx\)/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('checkbox', { name: 'Lịch trình chi tiết' })).not.toBeChecked();
    await user.click(screen.getByRole('tab', { name: 'Public Share' }));
    expect(screen.getByLabelText('Ngày hết hạn')).toHaveValue('01/12/2026');
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('share-draft');
    expect(screen.getByRole('checkbox', { name: 'Dress code' })).not.toBeChecked();
  });

  it.each([
    ['#public-share', 'Public Share'],
    ['#export-history', 'Lịch sử'],
  ])('opens %s directly and restores it on back navigation', async (hash, name) => {
    const { router, user } = mount(true, hash);
    expect(await screen.findByRole('tab', { name, selected: true })).toBeVisible();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: 'Xuất tệp' }));
    expect(screen.getByRole('tab', { name: 'Xuất tệp', selected: true })).toBeVisible();
    await act(async () => router.navigate(-1));
    expect(router.state.location.hash).toBe(hash);
    expect(screen.getByRole('tab', { name, selected: true })).toBeVisible();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('opens the existing PDF preview and download flow for the full plan', async () => {
    const { router, planPdf, user } = mount(true);
    expect(await screen.findByText('Toàn bộ lịch trình')).toBeInTheDocument();
    expect(screen.queryByText('Chọn ngày trong lịch trình')).not.toBeInTheDocument();
    expect(screen.queryByText('Chọn nội dung hiển thị')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xem trước PDF' }));
    expect(await screen.findByText('Xuất plan đã mở')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/trips/${previewTripId}/settings`);
    expect(router.state.location.search).toBe('?mode=settings&section=export');
    expect(planPdf).not.toHaveBeenCalled();
  });

  it('keeps unsupported export formats truthful and never calls the PDF endpoint for Excel', async () => {
    const { router, planPdf, user } = mount(true);
    await screen.findByText('Toàn bộ lịch trình');
    await user.click(screen.getByRole('radio', { name: /Excel \(\.xlsx\)/ }));
    await user.click(screen.getByRole('button', { name: 'Tạo bản xuất' }));
    expect(screen.getByRole('status')).toHaveTextContent('Xuất tệp chưa khả dụng');
    expect(router.state.location.pathname).toBe(`/trips/${previewTripId}/share`);
    expect(planPdf).not.toHaveBeenCalled();
  });

  it('retains the unavailable state when the repository offers no PDF export', async () => {
    const { planPdf, user } = mount(false);
    await user.click(await screen.findByRole('button', { name: 'Tạo bản xuất' }));
    expect(screen.getByRole('status')).toHaveTextContent('Xuất tệp chưa khả dụng');
    expect(planPdf).not.toHaveBeenCalled();
  });
});
