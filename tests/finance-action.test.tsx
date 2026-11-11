import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { FinanceAction } from '../src/features/fund/components/FinanceAction';
import { createCommandCoordinator } from '../src/infrastructure/operations/command-coordinator';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import { ApiError } from '../src/infrastructure/http/api-error';
const actor = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  trip = '11111111-1111-4111-8111-111111111111',
  fund = '77777777-1111-4111-8111-111111111111';
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
it('never submits a replacement from the same form after recovery succeeds', async () => {
  const client = {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  };
  client.write.mockRejectedValueOnce(
    new ApiError('Lost response', 'network', null, null, null, false),
  );
  client.write.mockResolvedValueOnce({ status: 201, data: {}, correlationId: null });
  const session = createCommandCoordinator(client, (value) => value, sessionStorage).forScope(
    actor,
    trip,
  );
  render(
    <FinanceAction
      label="Tạo đề nghị chi"
      session={session}
      definition={{
        kind: 'expense-create',
        actorId: actor,
        tripId: trip,
        fundId: fund,
        body: { expected_finance_version: 1 },
      }}
      fields={[
        { key: 'title', label: 'Tên khoản chi', required: true },
        { key: 'amount', label: 'Số tiền VND', required: true },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tạo đề nghị chi' }));
  fireEvent.change(screen.getByLabelText('Tên khoản chi'), { target: { value: 'Chi TEST' } });
  fireEvent.change(screen.getByLabelText('Số tiền VND'), { target: { value: '100000' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(screen.getByText(/Chưa xác nhận được kết quả/)).toBeVisible());
  fireEvent.click(screen.getByRole('button', { name: 'Gửi lại đúng yêu cầu' }));
  await waitFor(() => expect(screen.getByText('Đã hoàn tất thao tác.')).toBeVisible());
  expect(screen.getByRole('button', { name: 'Xác nhận · Tạo đề nghị chi' })).toBeDisabled();
  fireEvent.submit(screen.getByRole('form'));
  expect(client.write).toHaveBeenCalledTimes(2);
  expect(client.write.mock.calls[0]?.[1].idempotencyKey).toBe(
    client.write.mock.calls[1]?.[1].idempotencyKey,
  );
});
