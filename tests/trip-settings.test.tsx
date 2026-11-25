import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripSettingsPage } from '../src/features/trips/settings/TripSettingsPage';
import { TripSettingsOperations } from '../src/features/trips/settings/TripSettingsOperations';
import type { TripDetailViewModel } from '../src/features/trips/model/trip-detail';
import { updateTripInListPages } from '../src/features/trips/model/trip-list-cache';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { fixtureTripCatalog, previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubPdfUrls() {
  const createObjectURL = vi.fn(() => 'blob:trip-plan-preview');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  return { createObjectURL, revokeObjectURL };
}

function mount(
  tripId = previewTripId,
  entry = `/trips/${tripId}/settings`,
  repository = createFixtureTripRepository(),
) {
  const updateTrip = vi.fn(repository.updateTrip);
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={null} />,
        children: [
          {
            path: '/trips/:tripId/settings',
            element: <TripSettingsPage />,
            handle: {
              section: 'settings',
              contentTitle: true,
              fullBleed: true,
              requiresViewer: true,
            },
          },
        ],
      },
    ],
    { initialEntries: [entry] },
  );
  const mounted = render(
    <Providers
      repository={createFixtureShellRepository()}
      tripRepository={{ ...repository, updateTrip }}
      planRepository={createFixturePlanRepository()}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return { router, updateTrip, unmount: mounted.unmount };
}

describe('Trip Settings', () => {
  it('updates a matching item in a later cached page without losing list presentation', () => {
    const first = fixtureTripCatalog[0]!;
    const target = fixtureTripCatalog[1]!;
    const cache = {
      pages: [
        { items: [first], nextCursor: 'page-two' },
        { items: [target], nextCursor: null },
      ],
      pageParams: [null, 'page-two'],
    };
    const updated = updateTripInListPages(cache, {
      ...target,
      name: 'Tên từ PATCH',
      description: 'Mô tả mới',
      publicDescription: 'Mô tả công khai mới',
      archivedAt: null,
      planEditPolicy: 'OWNER_ONLY',
      presentation: { memberCount: null, coverAvailable: false, cover: null },
    });
    expect(updated?.pages[0]).toBe(cache.pages[0]);
    expect(updated?.pages[1]?.items[0]).toMatchObject({
      name: 'Tên từ PATCH',
      presentation: target.presentation,
    });
    expect(updated?.pageParams).toBe(cache.pageParams);
  });

  it('shows trip details first, enables fields with their pencils and returns to view after save', async () => {
    const user = userEvent.setup();
    const { router, updateTrip } = mount();
    expect(await screen.findByRole('heading', { name: 'Thông tin chuyến đi' })).toBeInTheDocument();
    expect(screen.queryByText('Mô tả công khai')).not.toBeInTheDocument();
    for (const label of [
      'Tên chuyến đi',
      'Địa điểm',
      'Thành viên (hiện tại / tối đa)',
      'Ngày đi',
      'Ngày về',
      'Mô tả chuyến đi',
    ])
      expect(screen.getByText(label, { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Chưa cập nhật', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('4 / —', { exact: true })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Chỉnh sửa thông tin chuyến đi' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Cài đặt chuyến đi' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chọn ảnh bìa')).not.toBeInTheDocument();
    expect(screen.queryByText('Ảnh bìa chuyến đi')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem thành viên chuyến đi' })).toHaveAttribute(
      'href',
      `/trips/${previewTripId}/members`,
    );
    await user.click(screen.getByRole('button', { name: 'Cài đặt chuyến đi' }));
    expect(router.state.location.search).toBe('?mode=edit');
    const dialog = screen.getByRole('dialog', { name: 'Cài đặt chuyến đi' });
    expect(within(dialog).queryByLabelText('Chọn ảnh bìa')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    const information = within(dialog).getByRole('region', {
      name: 'Chỉnh sửa thông tin chuyến đi',
    });
    expect(within(information).getByText('Đà Nẵng – Hội An', { exact: true })).toBeInTheDocument();
    expect(within(information).queryByText('Thông tin chỉ xem')).not.toBeInTheDocument();
    const fieldLabels = [
      'Tên chuyến đi',
      'Địa điểm',
      'Thành viên (hiện tại / tối đa)',
      'Ngày đi',
      'Ngày về',
      'Mô tả chuyến đi',
      'Mô tả công khai',
    ].map((label) => within(information).getByText(label, { exact: true }));
    for (const [index, fieldLabel] of fieldLabels.entries()) {
      if (index > 0)
        expect(
          fieldLabels[index - 1]!.compareDocumentPosition(fieldLabel) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    }
    for (const label of ['Địa điểm', 'Thành viên (hiện tại / tối đa)', 'Ngày đi', 'Ngày về']) {
      const field = within(information).getByText(label, { exact: true }).closest('dl')!;
      expect(field).not.toHaveAttribute('tabindex');
      expect(field.querySelector('button, input, textarea, [tabindex]')).toBeNull();
      await user.click(field);
    }
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(updateTrip).not.toHaveBeenCalled();
    const cancel = within(dialog).getByRole('button', { name: 'Hủy' });
    const save = within(dialog).getByRole('button', { name: 'Lưu thay đổi' });
    expect(cancel.querySelector('svg')).toBeNull();
    expect(save.querySelector('svg')).toBeNull();
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    expect(name).toHaveFocus();
    expect(updateTrip).not.toHaveBeenCalled();
    expect(
      within(dialog).queryByRole('textbox', { name: 'Mô tả chuyến đi' }),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Chỉnh sửa mô tả chuyến đi' }));
    const description = screen.getByRole('textbox', { name: 'Mô tả chuyến đi' });
    await user.click(within(dialog).getByRole('button', { name: 'Chỉnh sửa mô tả công khai' }));
    const publicDescription = screen.getByRole('textbox', { name: 'Mô tả công khai' });
    expect(updateTrip).not.toHaveBeenCalled();
    expect(name).toHaveValue('Đà Nẵng – Hội An');
    expect(description).toHaveValue(
      'Khám phá Đà Nẵng – thành phố biển xinh đẹp với những người bạn đồng hành.',
    );
    expect(publicDescription).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Thay ảnh' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    await user.clear(name);
    await user.paste('Đà Nẵng cuối tuần');
    await user.clear(description);
    await user.click(publicDescription);
    await user.paste('Hành trình biển dành cho mọi người.');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Cài đặt chuyến đi' })).not.toBeInTheDocument(),
    );
    expect(updateTrip).toHaveBeenCalledTimes(1);
    expect(updateTrip.mock.calls[0]?.[0].intent).toMatchObject({
      name: 'Đà Nẵng cuối tuần',
      description: null,
      publicDescription: 'Hành trình biển dành cho mọi người.',
      expectedPlanVersion: 1,
      expectedExportRevision: 1,
    });
    expect(updateTrip.mock.calls[0]?.[0].intent.idempotencyKey).toMatch(/.+/);
    expect(screen.getByText('Hành trình biển dành cho mọi người.')).toBeInTheDocument();
  });

  it('validates the 1–200 character name and Cancel restores view focus', async () => {
    const user = userEvent.setup();
    const { router, updateTrip } = mount();
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    expect(screen.getByText('Tên chuyến đi không được để trống.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(router.state.location.search).toBe('');
    const editButton = await screen.findByRole('button', { name: 'Cài đặt chuyến đi' });
    await waitFor(() => {
      expect(editButton).toHaveFocus();
    });
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('keeps the information draft across settings sections and Escape returns focus', async () => {
    const user = userEvent.setup();
    const { router, updateTrip } = mount();
    const trigger = await screen.findByRole(
      'button',
      { name: 'Cài đặt chuyến đi' },
      { timeout: 5000 },
    );
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Cài đặt chuyến đi' });
    const navigation = within(dialog).getByRole('navigation', { name: 'Mục cài đặt chuyến đi' });
    await user.click(within(dialog).getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = within(dialog).getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp trong cài đặt');

    expect(
      within(navigation)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Chỉnh sửa thông tin', 'Thông báo', 'Xuất plan', 'Lưu trữ chuyến đi']);
    await user.click(within(navigation).getByRole('button', { name: 'Xuất plan' }));
    expect(router.state.location.search).toBe('?mode=settings&section=export');
    expect(within(dialog).getByRole('heading', { name: 'Xuất plan' })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('link', { name: 'Quản lý thành viên' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText('Xuất PDF chưa khả dụng trong chế độ dữ liệu hiện tại.'),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Xem trước PDF' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Tải PDF' })).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('textbox', { name: 'Tên chuyến đi' }),
    ).not.toBeInTheDocument();

    await user.click(within(navigation).getByRole('button', { name: 'Thông báo' }));
    expect(within(dialog).getByRole('heading', { name: 'Thông báo của bạn' })).toBeInTheDocument();
    await user.click(within(navigation).getByRole('button', { name: 'Lưu trữ chuyến đi' }));
    expect(within(dialog).getByRole('heading', { name: 'Lưu trữ chuyến đi' })).toBeInTheDocument();
    await user.click(within(navigation).getByRole('button', { name: 'Chỉnh sửa thông tin' }));
    expect(within(dialog).getByRole('textbox', { name: 'Tên chuyến đi' })).toBe(name);
    expect(name).toHaveValue('Bản nháp trong cài đặt');
    expect(within(dialog).getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Cài đặt chuyến đi' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('previews the actual plan PDF on request and downloads the same file before releasing its URL', async () => {
    const user = userEvent.setup();
    const pdf = new Blob(['%PDF-1.7\ntrip-plan'], { type: 'application/pdf' });
    const planPdf = vi.fn(async () => pdf);
    const { createObjectURL, revokeObjectURL } = stubPdfUrls();
    const downloads: { href: string; filename: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ href: this.href, filename: this.download });
    });
    const { unmount } = mount(
      previewTripId,
      `/trips/${previewTripId}/settings?mode=settings&section=export`,
      { ...createFixtureTripRepository(), planPdf },
    );
    const preview = await screen.findByRole('button', { name: 'Xem trước PDF' }, { timeout: 5000 });
    expect(planPdf).not.toHaveBeenCalled();
    expect(screen.queryByTitle('Xem trước plan chuyến đi')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải PDF' })).toBeDisabled();

    await user.click(preview);
    const frame = await screen.findByTitle('Xem trước plan chuyến đi');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toContain('blob:trip-plan-preview');
    expect(planPdf).toHaveBeenCalledTimes(1);
    expect(planPdf).toHaveBeenCalledWith({
      tripId: previewTripId,
      signal: expect.any(AbortSignal),
    });
    expect(createObjectURL).toHaveBeenCalledWith(pdf);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Tải PDF' }));
    expect(downloads).toEqual([
      { href: 'blob:trip-plan-preview', filename: `wolfari-plan-${previewTripId}.pdf` },
    ]);
    expect(planPdf).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:trip-plan-preview');
  });

  it('allows retrying a failed PDF preview and only enables export after success', async () => {
    const user = userEvent.setup();
    const pdf = new Blob(['%PDF-1.7\ntrip-plan'], { type: 'application/pdf' });
    const planPdf = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary PDF failure'))
      .mockResolvedValue(pdf);
    const { createObjectURL } = stubPdfUrls();
    mount(previewTripId, `/trips/${previewTripId}/settings?mode=settings&section=export`, {
      ...createFixtureTripRepository(),
      planPdf,
    });

    await user.click(
      await screen.findByRole('button', { name: 'Xem trước PDF' }, { timeout: 5000 }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/bản xem trước/);
    expect(screen.queryByTitle('Xem trước plan chuyến đi')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải PDF' })).toBeDisabled();
    expect(createObjectURL).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Xem trước PDF' }));
    expect(await screen.findByTitle('Xem trước plan chuyến đi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải PDF' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(planPdf).toHaveBeenCalledTimes(2);
  });

  it('aborts a pending PDF preview when settings unmount and ignores its late response', async () => {
    const user = userEvent.setup();
    let resolvePdf!: (pdf: Blob) => void;
    const planPdf = vi.fn<(request: { tripId: string; signal: AbortSignal }) => Promise<Blob>>(
      () =>
        new Promise<Blob>((resolve) => {
          resolvePdf = resolve;
        }),
    );
    const { createObjectURL } = stubPdfUrls();
    const { unmount } = mount(
      previewTripId,
      `/trips/${previewTripId}/settings?mode=settings&section=export`,
      { ...createFixtureTripRepository(), planPdf },
    );

    await user.click(
      await screen.findByRole('button', { name: 'Xem trước PDF' }, { timeout: 5000 }),
    );
    expect(planPdf).toHaveBeenCalledTimes(1);
    const request = planPdf.mock.calls[0]?.[0];
    expect(request?.signal.aborted).toBe(false);
    expect(screen.getByRole('button', { name: 'Đóng cài đặt chuyến đi' })).toBeDisabled();
    unmount();
    expect(request?.signal.aborted).toBe(true);
    await act(async () =>
      resolvePdf(new Blob(['%PDF-1.7\ntrip-plan'], { type: 'application/pdf' })),
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('clears the preview and blocks downloading an outdated PDF after the export revision changes', async () => {
    const user = userEvent.setup();
    const planPdf = vi.fn(async () => new Blob(['%PDF-1.7\nplan'], { type: 'application/pdf' }));
    const repository = { ...createFixtureTripRepository(), planPdf };
    const result = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (result.status !== 'ready') throw new Error('Expected fixture trip detail');
    const { revokeObjectURL } = stubPdfUrls();
    const shellRepository = createFixtureShellRepository();
    const planRepository = createFixturePlanRepository();
    const operations = (trip: TripDetailViewModel) => (
      <Providers
        repository={shellRepository}
        tripRepository={repository}
        planRepository={planRepository}
      >
        <MemoryRouter>
          <TripSettingsOperations trip={trip} section="export" />
        </MemoryRouter>
      </Providers>
    );
    const rendered = render(operations(result.data));

    await user.click(screen.getByRole('button', { name: 'Xem trước PDF' }));
    expect(await screen.findByTitle('Xem trước plan chuyến đi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải PDF' })).toBeEnabled();
    rendered.rerender(
      operations({ ...result.data, exportRevision: result.data.exportRevision + 1 }),
    );

    expect(screen.queryByTitle('Xem trước plan chuyến đi')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải PDF' })).toBeDisabled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:trip-plan-preview');
    expect(planPdf).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Xem trước PDF' }));
    expect(await screen.findByTitle('Xem trước plan chuyến đi')).toBeInTheDocument();
    expect(planPdf).toHaveBeenCalledTimes(2);
  });

  it('does not expose edit controls to a Member opening ?mode=edit directly', async () => {
    const member = fixtureTripCatalog.find((item) => item.currentMembership.role === 'MEMBER')!;
    mount(member.id, `/trips/${member.id}/settings?mode=edit`);
    expect(
      await screen.findByText('Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Chỉnh sửa thông tin chuyến đi' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Cài đặt chuyến đi' });
    const information = within(dialog).getByRole('region', {
      name: 'Thông tin chuyến đi chỉ xem',
    });
    expect(
      within(information).getByRole('heading', { name: 'Thông tin chuyến đi' }),
    ).toBeInTheDocument();
    expect(within(information).queryByText('Thông tin chỉ xem')).not.toBeInTheDocument();
    expect(
      within(information).queryByText('Chỉ chủ chuyến đang hoạt động có thể chỉnh sửa thông tin.'),
    ).not.toBeInTheDocument();
    expect(information.querySelector('button, input, textarea, [tabindex]')).toBeNull();
    expect([...information.querySelectorAll('dt')].map((label) => label.textContent)).toEqual([
      'Tên chuyến đi',
      'Địa điểm',
      'Thành viên (hiện tại / tối đa)',
      'Ngày đi',
      'Ngày về',
      'Mô tả chuyến đi',
      'Mô tả công khai',
    ]);
    expect(within(dialog).getByRole('button', { name: 'Lưu trữ chuyến đi' })).toBeDisabled();
    expect(within(dialog).queryByLabelText('Chọn ảnh bìa')).not.toBeInTheDocument();
  });

  it('keeps an archived Owner read-only on a direct edit URL', async () => {
    const archived = {
      ...fixtureTripCatalog[0]!,
      lifecycle: 'ARCHIVED' as const,
      permissions: { canRead: true, canUpdate: false },
    };
    mount(
      archived.id,
      `/trips/${archived.id}/settings?mode=edit`,
      createFixtureTripRepository({ records: [archived] }),
    );
    expect(
      await screen.findByText('Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Tên chuyến đi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
    const information = within(screen.getByRole('dialog', { name: 'Cài đặt chuyến đi' })).getByRole(
      'region',
      { name: 'Thông tin chuyến đi chỉ xem' },
    );
    expect(information.querySelector('button, input, textarea, [tabindex]')).toBeNull();
  });

  it('keeps the draft and reuses the idempotency key when the outcome is unknown', async () => {
    const user = userEvent.setup();
    const { updateTrip } = mount();
    updateTrip.mockResolvedValueOnce({
      status: 'unknown',
      correlationId: null,
      retryable: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp an toàn');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Chưa xác định được kết quả lưu/)).toBeInTheDocument();
    expect(name).toHaveValue('Bản nháp an toàn');
    expect(name).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'Mô tả chuyến đi' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chỉnh sửa mô tả chuyến đi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đóng cài đặt chuyến đi' })).toBeDisabled();
    const navigation = screen.getByRole('navigation', { name: 'Mục cài đặt chuyến đi' });
    for (const button of within(navigation).getAllByRole('button')) expect(button).toBeDisabled();
    const originalIntent = updateTrip.mock.calls[0]![0].intent;
    await user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent).toEqual(originalIntent);
  });

  it('restores the same actor and Trip intent after remount instead of making a new key', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const first = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    first.updateTrip.mockResolvedValueOnce({
      status: 'unknown',
      correlationId: null,
      retryable: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp sau tải lại');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('button', { name: 'Thử lại đúng yêu cầu cũ' })).toBeEnabled();
    const originalIntent = first.updateTrip.mock.calls[0]![0].intent;
    first.unmount();

    const second = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    second.updateTrip.mockResolvedValueOnce({
      status: 'unknown',
      correlationId: null,
      retryable: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    expect(screen.getByRole('textbox', { name: 'Tên chuyến đi' })).toHaveValue(
      'Bản nháp sau tải lại',
    );
    expect(screen.getByRole('textbox', { name: 'Tên chuyến đi' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    await waitFor(() => expect(second.updateTrip).toHaveBeenCalledOnce());
    expect(second.updateTrip.mock.calls[0]![0].intent).toEqual(originalIntent);
  });

  it('does not send a new update when the intent journal cannot be written', async () => {
    const user = userEvent.setup();
    const { updateTrip } = mount();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    await user.type(screen.getByRole('textbox', { name: 'Tên chuyến đi' }), ' mới');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Không thể lưu mã yêu cầu an toàn/)).toBeInTheDocument();
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('fails closed when the stored journal cannot be read', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const { updateTrip } = mount();
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    for (const label of ['tên chuyến đi', 'mô tả chuyến đi', 'mô tả công khai'])
      expect(screen.getByRole('button', { name: `Chỉnh sửa ${label}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' })).toBeDisabled();
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('unlocks a new intent only after an authoritative refresh, preserving the draft', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const initial = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
    const refreshed = { ...initial.data, exportRevision: 2 };
    vi.spyOn(repository, 'getTrip')
      .mockResolvedValueOnce(initial)
      .mockResolvedValue({ status: 'ready', data: refreshed });
    const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    updateTrip.mockResolvedValueOnce({ status: 'unknown', correlationId: null, retryable: true });
    const saved = { ...refreshed, name: 'Bản nháp sau khi tải lại', exportRevision: 3 };
    updateTrip.mockResolvedValueOnce({ status: 'updated', trip: saved, correlationId: null });
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp an toàn');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('button', { name: 'Tải trạng thái hiện tại' })).toBeEnabled();
    expect(name).toBeDisabled();
    const originalIntent = updateTrip.mock.calls[0]![0].intent;
    await user.click(screen.getByRole('button', { name: 'Tải trạng thái hiện tại' }));
    expect(await screen.findByText(/Đã tải trạng thái hiện tại/)).toBeInTheDocument();
    expect(name).toBeEnabled();
    expect(name).toHaveValue('Bản nháp an toàn');
    await user.clear(name);
    await user.type(name, 'Bản nháp sau khi tải lại');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent).toMatchObject({
      name: 'Bản nháp sau khi tải lại',
      expectedExportRevision: 2,
    });
    expect(updateTrip.mock.calls[1]![0].intent.idempotencyKey).not.toBe(
      originalIntent.idempotencyKey,
    );
  });

  it('keeps the exact retry available if the explicit read after unknown fails', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const initial = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
    vi.spyOn(repository, 'getTrip')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'SERVICE_UNAVAILABLE', correlationId: 'read-failed', retryable: true },
      });
    const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    updateTrip.mockResolvedValueOnce({ status: 'unknown', correlationId: null, retryable: true });
    updateTrip.mockResolvedValueOnce({ status: 'unknown', correlationId: null, retryable: true });
    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.type(name, ' sau lỗi đọc');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('button', { name: 'Tải trạng thái hiện tại' })).toBeEnabled();
    const originalIntent = updateTrip.mock.calls[0]![0].intent;
    await user.click(screen.getByRole('button', { name: 'Tải trạng thái hiện tại' }));
    expect(await screen.findByText(/Chưa tải được trạng thái hiện tại/)).toBeInTheDocument();
    expect(name).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    await waitFor(() => expect(updateTrip).toHaveBeenCalledTimes(2));
    expect(updateTrip.mock.calls[1]![0].intent).toEqual(originalIntent);
    expect(name).toBeDisabled();
  });

  it('keeps all draft fields on conflict and requires refreshed revisions with a new key', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const initial = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
    const refreshed = { ...initial.data, exportRevision: 2 };
    const updated = {
      ...refreshed,
      publicDescription: 'Bản nháp công khai sau xung đột',
      exportRevision: 3,
    };
    const getTrip = vi
      .spyOn(repository, 'getTrip')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({ status: 'ready', data: refreshed })
      .mockResolvedValue({ status: 'ready', data: updated });
    const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    updateTrip
      .mockResolvedValueOnce({
        status: 'conflict',
        correlationId: 'trip-conflict',
        retryable: false,
      })
      .mockResolvedValueOnce({
        status: 'updated',
        trip: updated,
        correlationId: 'trip-update',
      });

    await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa mô tả công khai' }));
    const publicDescription = screen.getByRole('textbox', { name: 'Mô tả công khai' });
    await user.type(publicDescription, 'Bản nháp công khai sau xung đột');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Thông tin chuyến đi đã thay đổi/)).toBeInTheDocument();
    expect(publicDescription).toHaveValue('Bản nháp công khai sau xung đột');
    await waitFor(() => expect(getTrip).toHaveBeenCalledTimes(2));
    const firstKey = updateTrip.mock.calls[0]![0].intent.idempotencyKey;

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent).toMatchObject({
      publicDescription: 'Bản nháp công khai sau xung đột',
      expectedPlanVersion: 1,
      expectedExportRevision: 2,
    });
    expect(updateTrip.mock.calls[1]![0].intent.idempotencyKey).not.toBe(firstKey);
    expect(getTrip.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it.each(['transport failure', 'domain error'] as const)(
    'keeps the edit draft and blocks stale writes when conflict refresh has a %s',
    async (failure) => {
      const user = userEvent.setup();
      const repository = createFixtureTripRepository();
      const initial = await repository.getTrip({
        tripId: previewTripId,
        scenario: 'success',
        signal: new AbortController().signal,
      });
      if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
      const refreshed = { ...initial.data, exportRevision: 2 };
      const updated = { ...refreshed, name: 'Bản nháp sau lỗi tải lại', exportRevision: 3 };
      const getTrip = vi.spyOn(repository, 'getTrip').mockResolvedValueOnce(initial);
      if (failure === 'transport failure') {
        getTrip.mockRejectedValueOnce(new Error('Temporary read failure'));
      } else {
        getTrip.mockResolvedValueOnce({
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: 'refresh-error', retryable: true },
        });
      }
      getTrip
        .mockResolvedValueOnce({ status: 'ready', data: refreshed })
        .mockResolvedValue({ status: 'ready', data: updated });
      const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
      updateTrip
        .mockResolvedValueOnce({ status: 'conflict', correlationId: 'conflict', retryable: false })
        .mockResolvedValueOnce({ status: 'updated', trip: updated, correlationId: 'updated' });

      await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
      await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
      const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
      await user.clear(name);
      await user.type(name, 'Bản nháp sau lỗi tải lại');
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(await screen.findByText(/Chưa tải được thông tin chuyến đi mới/)).toBeInTheDocument();
      expect(name).toHaveValue('Bản nháp sau lỗi tải lại');
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
      expect(updateTrip).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Tải lại thông tin chuyến đi' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled(),
      );
      expect(name).toHaveValue('Bản nháp sau lỗi tải lại');
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
      expect(updateTrip.mock.calls[1]?.[0].intent.expectedExportRevision).toBe(2);
      expect(updateTrip.mock.calls[1]?.[0].intent.idempotencyKey).not.toBe(
        updateTrip.mock.calls[0]?.[0].intent.idempotencyKey,
      );
    },
  );

  it.each([
    ['PERMISSION_DENIED', 'Bạn không có quyền truy cập'],
    ['RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung'],
  ] as const)(
    'shows definitive %s after a conflict refresh instead of a stale edit form',
    async (code, heading) => {
      const user = userEvent.setup();
      const repository = createFixtureTripRepository();
      const initial = await repository.getTrip({
        tripId: previewTripId,
        scenario: 'success',
        signal: new AbortController().signal,
      });
      if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
      vi.spyOn(repository, 'getTrip')
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce({
          status: 'error',
          error: { code, correlationId: 'access-change', retryable: false },
        });
      const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
      updateTrip.mockResolvedValueOnce({
        status: 'conflict',
        correlationId: 'conflict',
        retryable: false,
      });

      await user.click(await screen.findByRole('button', { name: 'Cài đặt chuyến đi' }));
      await user.click(screen.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi' }));
      await user.type(screen.getByRole('textbox', { name: 'Tên chuyến đi' }), ' thêm');
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Chưa tải được thông tin chuyến đi mới/)).not.toBeInTheDocument();
      expect(updateTrip).toHaveBeenCalledTimes(1);
    },
  );
});
