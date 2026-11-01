import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useRuntimeServices } from '../src/app/gateway-context';
import { ApiError } from '../src/infrastructure/http/api-error';
import NotificationInbox from '../src/features/notifications/NotificationInbox';
import { NotificationPreferences } from '../src/features/notifications/NotificationPreferences';

vi.mock('../src/app/gateway-context', () => ({ useRuntimeServices: vi.fn() }));

const initial = {
  push_enabled: false,
  email_enabled: true,
  group_overrides: { PRICE: { email: false } },
  version: 2,
} as const;

function mount(element: React.ReactNode, notifications: object) {
  vi.mocked(useRuntimeServices).mockReturnValue({
    notifications,
  } as ReturnType<typeof useRuntimeServices>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CP10 notification outcome and recovery', () => {
  it('keeps a preferences draft editable after a definite rejection', async () => {
    const user = userEvent.setup();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Rejected', 'http', 400, 'VALIDATION_ERROR', null, false))
      .mockResolvedValueOnce({ ...initial, email_enabled: false, version: 3 });
    mount(<NotificationPreferences actor="viewer-a" />, {
      preferences: vi.fn().mockResolvedValue(initial),
      save,
    });
    await user.click(await screen.findByRole('switch', { name: 'Cho phép email' }));
    const button = screen.getByRole('button', { name: 'Lưu tùy chọn' });
    await user.click(button);
    expect(await screen.findByText(/Yêu cầu bị từ chối/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Cho phép email' })).not.toBeChecked();
    expect(button).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Tải lại và dùng tùy chọn hiện tại' })).toBeNull();
    await user.click(button);
    expect(await screen.findByText('Đã lưu tùy chọn thông báo.')).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ email_enabled: false, version: 2 }),
      expect.any(AbortSignal),
    );
  });

  it('requires reconciliation after an uncertain preferences save', async () => {
    const user = userEvent.setup();
    const preferences = vi.fn().mockResolvedValue(initial);
    const save = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Unavailable', 'http', 503, 'SERVICE_UNAVAILABLE', null, true),
      );
    mount(<NotificationPreferences actor="viewer-a" />, { preferences, save });
    await user.click(await screen.findByRole('switch', { name: 'Cho phép email' }));
    await user.click(screen.getByRole('button', { name: 'Lưu tùy chọn' }));
    expect(await screen.findByText(/Chưa xác nhận được kết quả/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Cho phép email' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Lưu tùy chọn' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Tải lại và dùng tùy chọn hiện tại' }));
    expect(await screen.findByText(/Đã tải tùy chọn hiện tại/)).toBeInTheDocument();
    expect(preferences).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Lưu tùy chọn' })).toBeEnabled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reconciles an uncertain read before permitting another mark-read command', async () => {
    const user = userEvent.setup();
    let readAt: string | null = null;
    const item = {
      id: '99999999-1111-4111-8111-111111111111',
      type: 'PLAN_UPDATED',
      title: 'Lịch trình có cập nhật',
      body: 'Mở chuyến đi để xem chi tiết.',
      tripId: null,
      sourceId: null,
      createdAt: '2026-10-29T10:00:00Z',
    };
    const list = vi.fn(async () => ({ items: [{ ...item, readAt }], nextCursor: null }));
    const read = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Timeout', 'network', null, null, null, true));
    mount(<NotificationInbox actor="viewer-a" onNavigate={() => {}} />, { list, read });
    await user.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc' }));
    expect(await screen.findByText(/Chưa xác nhận được trạng thái đã đọc/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đánh dấu đã đọc' })).toBeDisabled();
    readAt = '2026-10-29T11:00:00Z';
    await user.click(screen.getByRole('button', { name: 'Tải lại danh sách' }));
    expect(await screen.findByText('Lịch trình có cập nhật')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc' })).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});
