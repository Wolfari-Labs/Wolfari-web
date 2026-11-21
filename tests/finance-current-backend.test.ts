import { describe, expect, it, vi } from 'vitest';
import {
  isRefundConfirmationCandidate,
  canOfferRefundVerifier,
} from '../src/features/fund/model/refund-candidates';
import { createGatewayFundRepository } from '../src/infrastructure/repositories/fund.gateway-repository';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import type { CommandCoordinator } from '../src/infrastructure/operations/command-coordinator';

const id = '11111111-1111-4111-8111-111111111111';
describe('current backend integration boundaries', () => {
  it('keeps Owner, recipient and assigned verifier candidates after a handover', () => {
    const row = {
      status: 'HOLDER_REPORTED' as const,
      member_user_id: 'recipient',
      verifier_user_id: 'verifier',
    };
    expect(isRefundConfirmationCandidate(row, 'owner', true)).toBe(true);
    expect(isRefundConfirmationCandidate(row, 'recipient', false)).toBe(true);
    expect(isRefundConfirmationCandidate(row, 'verifier', false)).toBe(true);
    expect(isRefundConfirmationCandidate(row, 'new-holder', false)).toBe(false);
    expect(isRefundConfirmationCandidate({ ...row, status: 'CONFIRMED' }, 'owner', true)).toBe(
      false,
    );
    expect(canOfferRefundVerifier(row, 'recipient', true)).toBe(true);
    expect(canOfferRefundVerifier(row, 'owner', true)).toBe(false);
  });
  it('downloads by expense ID, including a fresh repository after reload', async () => {
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    client.read.mockResolvedValue({
      status: 200,
      data: new Uint8Array([37, 80, 68, 70]).buffer,
      contentType: 'application/pdf',
      correlationId: null,
    });
    const runtime = () =>
      createGatewayFundRepository(undefined, client, {} as CommandCoordinator).runtime!;
    expect((await runtime().expenseReceipt!(id)).size).toBe(4);
    expect((await runtime().expenseReceipt!(id)).type).toBe('application/pdf');
    expect(client.read).toHaveBeenCalledWith(
      `/api/v1/expenses/${id}/receipt`,
      expect.objectContaining({ responseType: 'bytes', includeCredentials: true }),
    );
    client.read.mockResolvedValue({
      status: 200,
      data: new ArrayBuffer(1),
      contentType: 'text/html',
      correlationId: null,
    });
    await expect(runtime().expenseReceipt!(id)).rejects.toThrow('Invalid receipt file');
  });
});
