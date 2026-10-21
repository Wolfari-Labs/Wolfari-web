import { describe, expect, it, vi } from 'vitest';
import { createFixtureFundRepository } from '../src/infrastructure/fixtures/fund.fixture-repository';
import { createGatewayFundRepository } from '../src/infrastructure/repositories/fund.gateway-repository';
import { selectFundRepository } from '../src/infrastructure/repositories/select-fund-repository';
import { fixtureHolderId, previewTripId } from '../src/infrastructure/fixtures/fund.fixture-repository';
import { formatMoneyVnd } from '../src/features/fund/FundPage';

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

  it('keeps nullable budget and money formatting safe at the view boundary', async () => {
    const readOnly = await createFixtureFundRepository().getFund(request('read-only'));
    expect(readOnly.status).toBe('ready');
    if (readOnly.status !== 'ready') return;
    expect(readOnly.data.fund.budgetAmount).toBeNull();
    expect(formatMoneyVnd(readOnly.data.fund.budgetAmount)).toBe('—');
    expect(formatMoneyVnd('9000000')).toBe('9.000.000đ');
    expect(formatMoneyVnd(null)).toBe('—');
  });

  it('projects decimal ledger sequences and balanced directions', async () => {
    const result = await createFixtureFundRepository().getFund(request());
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.data.ledger.map((entry) => entry.sequence)).toEqual(['1', '2', '3', '4', '5']);
    expect(result.data.ledger.every((entry) => ['CONTRIBUTION', 'EXPENSE', 'REFUND', 'REVERSAL'].includes(entry.transactionType))).toBe(true);
    let balance = 0n;
    for (const entry of result.data.ledger) {
      balance += entry.direction === 'IN' ? BigInt(entry.amount) : -BigInt(entry.amount);
      expect(entry.balanceAfter).toBe(balance.toString());
    }
    expect(result.data.fund.currentBalance).toBe(balance.toString());
    expect(result.data.refunds[0]?.status).toBe('PENDING');
    expect(result.data.nextCursor).toBeNull();
  });

  it('does not infer Holder permissions for the default viewer', async () => {
    const member = await createFixtureFundRepository().getFund(request());
    expect(member.status).toBe('ready');
    if (member.status !== 'ready') return;
    expect(member.data.viewerRole).toBe('MEMBER');
    expect(member.data.fund.holderUserId).not.toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(member.data.permissions.canConfirmExpense).toBe(false);
    expect(member.data.permissions.canBeginClosure).toBe(false);

    const holder = await createFixtureFundRepository({ viewerId: fixtureHolderId }).getFund(request());
    expect(holder.status).toBe('ready');
    if (holder.status === 'ready') {
      expect(holder.data.viewerRole).toBe('HOLDER');
      expect(holder.data.permissions.canConfirmExpense).toBe(true);
    }
  });

  it('closes only after the fixture has settled balance and blockers', async () => {
    const closed = await createFixtureFundRepository().getFund(request('closed'));
    expect(closed.status).toBe('ready');
    if (closed.status !== 'ready') return;
    expect(closed.data.fund.status).toBe('CLOSED');
    expect(closed.data.fund.currentBalance).toBe('0');
    expect(closed.data.fund.reservedRefund).toBe('0');
    expect(closed.data.fund.availableBalance).toBe('0');
    expect(closed.data.closure?.status).toBe('COMPLETED');
    expect(closed.data.closure?.closedAt).toBeTruthy();
    expect(closed.data.blockers).toEqual([]);
    expect(closed.data.refunds[0]?.status).toBe('CONFIRMED');
    expect(closed.data.ledger.at(-1)?.balanceAfter).toBe('0');
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
