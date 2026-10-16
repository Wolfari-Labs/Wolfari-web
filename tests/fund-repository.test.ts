import { describe, expect, it, vi } from 'vitest';
import { createFixtureFundRepository } from '../src/infrastructure/fixtures/fund.fixture-repository';
import { createGatewayFundRepository } from '../src/infrastructure/repositories/fund.gateway-repository';
import { selectFundRepository } from '../src/infrastructure/repositories/select-fund-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const request = (scenario: Parameters<ReturnType<typeof createFixtureFundRepository>['getFund']>[0]['scenario'] = 'success') => ({
  tripId: previewTripId,
  scenario,
  signal: new AbortController().signal,
});

describe('Fund repository', () => {
  it('returns isolated integer-VND fixture projections', async () => {
    const repo = createFixtureFundRepository();
    const first = await repo.getFund(request());
    expect(first.status).toBe('ready');
    if (first.status !== 'ready') return;
    expect(first.data.fund.budgetAmount).toBe('9000000');
    expect(first.data.fund.currentBalance).toBe('750000');
    expect(first.data.fund.availableBalance).toBe('500000');
    (first.data.expenses[0] as { title: string }).title = 'changed';
    const second = await repo.getFund(request());
    expect(second.status).toBe('ready');
    if (second.status === 'ready') expect(second.data.expenses[0]!.title).toBe('Khách sạn');
  });

  it('keeps closing and closed states read-only', async () => {
    const repo = createFixtureFundRepository();
    const closing = await repo.getFund(request('closing'));
    const closed = await repo.getFund(request('closed'));
    expect(closing.status).toBe('ready');
    expect(closed.status).toBe('ready');
    if (closing.status === 'ready') expect(closing.data.fund.status).toBe('CLOSING');
    if (closed.status === 'ready') expect(closed.data.fund.status).toBe('CLOSED');
  });

  it('maps scenario errors and aborts loading', async () => {
    const repo = createFixtureFundRepository();
    expect((await repo.getFund(request('forbidden'))).status).toBe('error');
    expect((await repo.getFund(request('conflict'))).status).toBe('error');
    const controller = new AbortController();
    const pending = repo.getFund({ ...request('loading'), signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeTruthy();
  });

  it('does not call HTTP in the default gateway', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await createGatewayFundRepository().getFund({ ...request(), signal: new AbortController().signal });
    expect(result).toMatchObject({ status: 'error', error: { code: 'SERVICE_UNAVAILABLE' } });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('blocks fixtures when preview is disabled', () => {
    expect(() => selectFundRepository('fixture', false, createFixtureFundRepository)).toThrow();
    expect(selectFundRepository('gateway', false)).toBeDefined();
  });
});
