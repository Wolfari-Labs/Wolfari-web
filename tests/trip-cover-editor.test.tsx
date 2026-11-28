import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { TripCoverEditor } from '../src/features/trips/settings/TripCoverEditor';
import { TripRepositoryProvider } from '../src/features/trips/repositories/repository-context';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import type { TripDetailViewModel } from '../src/features/trips/model/trip-detail';

describe('Trip cover write scope', () => {
  it.each(['upload', 'remove'] as const)(
    'serializes %s and ignores a late response after unmount',
    async (operation) => {
      const fixture = createFixtureTripRepository();
      const detail = await fixture.getTrip({
        tripId: previewTripId,
        scenario: 'success',
        signal: new AbortController().signal,
      });
      if (detail.status !== 'ready') throw Error('Fixture unavailable');
      let finish!: (trip: TripDetailViewModel) => void;
      const pending = new Promise<TripDetailViewModel>((resolve) => {
        finish = resolve;
      });
      const mutation = vi.fn(({ signal }: { signal: AbortSignal }) => {
        expect(signal.aborted).toBe(false);
        return pending;
      });
      const repository = {
        ...fixture,
        ...(operation === 'upload' ? { uploadCover: mutation } : { removeCover: mutation }),
      };
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      const remove = vi.spyOn(queryClient, 'removeQueries');
      const onBusyChange = vi.fn();
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <TripRepositoryProvider repository={repository}>
            <TripCoverEditor trip={detail.data} onBusyChange={onBusyChange} />
          </TripRepositoryProvider>
        </QueryClientProvider>,
      );
      act(() => {
        if (operation === 'upload') {
          const file = new File(['image'], 'cover.png', { type: 'image/png' });
          const input = screen.getByLabelText('Chọn ảnh bìa');
          fireEvent.change(input, { target: { files: [file] } });
          fireEvent.change(input, { target: { files: [file] } });
        } else {
          const button = screen.getByRole('button', { name: 'Xóa ảnh' });
          fireEvent.click(button);
          fireEvent.click(button);
        }
      });
      expect(mutation).toHaveBeenCalledOnce();
      expect(onBusyChange).toHaveBeenLastCalledWith(true);
      const signal = mutation.mock.calls[0]![0].signal;
      unmount();
      expect(signal.aborted).toBe(true);
      expect(onBusyChange).toHaveBeenLastCalledWith(false);
      await act(async () => finish(detail.data));
      expect(invalidate).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    },
  );
});
