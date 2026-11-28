import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';
import { webcrypto } from 'node:crypto';
import {
  createCommandCoordinator,
  validateCommandBody,
} from '../src/infrastructure/operations/command-coordinator';
import {
  decodeFinanceReceipt,
  decodeInstruction,
} from '../src/infrastructure/repositories/finance-decoders';
import { decodePaymentAttempt } from '../src/infrastructure/repositories/payment-decoders';
import { createPaymentRecovery } from '../src/infrastructure/repositories/payment-recovery';
import { decodeHistory } from '../src/infrastructure/repositories/finance-extended-decoders';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import { ApiError } from '../src/infrastructure/http/api-error';
import {
  PAYOS_RETURN_PATH,
  payosReturnPage,
  payosReturnUrl,
  readPayosReturn,
} from '../src/shared/lib/payos-return';
import {
  PaymentAttemptStatus,
  PayosReturnNotice,
  fundReturnUrl,
  useContributionPayment,
  usePayosReturn,
} from '../src/features/fund/components/PayosCheckout';
import { FinanceAction } from '../src/features/fund/components/FinanceAction';
import type { FundRuntime } from '../src/features/fund/model/runtime-fund';
import type { PaymentAttempt } from '../src/features/fund/model/payment';
import type { CommandSession } from '../src/shared/types/operations';

const actor = '11111111-1111-4111-8111-111111111111',
  trip = '22222222-2222-4222-8222-222222222222',
  contribution = '33333333-3333-4333-8333-333333333333',
  attemptId = '44444444-4444-4444-8444-444444444444',
  fund = '55555555-5555-4555-8555-555555555555';
const origin = window.location.origin;
const page = `${origin}/trips/${trip}/fund`;
const payos: PaymentAttempt = {
  id: attemptId,
  contribution_id: contribution,
  provider: 'PAYOS',
  environment: 'LIVE',
  amount: '2000',
  currency: 'VND',
  status: 'PENDING',
  needs_reconciliation: false,
  payment_url: 'https://pay.payos.vn/web/abc123',
  expires_at: '2999-01-01T00:00:00Z',
  error_code: null,
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
};
const b64url = (text: string) => Buffer.from(text, 'utf8').toString('base64url');
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});

describe('payOS wire contract', () => {
  it('pairs each provider with its environment and hosted page only', () => {
    expect(decodePaymentAttempt(payos)).toMatchObject({ provider: 'PAYOS', environment: 'LIVE' });
    expect(
      decodePaymentAttempt({
        ...payos,
        provider: 'MOMO_SANDBOX',
        environment: 'SANDBOX',
        payment_url: 'https://test-payment.momo.vn/pay',
      }).provider,
    ).toBe('MOMO_SANDBOX');
    for (const change of [
      { environment: 'SANDBOX' },
      { payment_url: 'https://test-payment.momo.vn/pay' },
      { payment_url: 'http://pay.payos.vn/web/abc' },
      { payment_url: 'https://pay.payos.vn.evil.test/web' },
      { payment_url: 'https://user@pay.payos.vn/web' },
      { payment_url: 'https://pay.payos.vn:8443/web' },
      { provider: 'MOMO_SANDBOX', environment: 'SANDBOX' },
      { provider: 'MOMO_SANDBOX', environment: 'LIVE', payment_url: null },
      { provider: 'VNPAY' },
    ])
      expect(() => decodePaymentAttempt({ ...payos, ...change }), JSON.stringify(change)).toThrow();
  });

  it('builds the Gateway return page for a same-origin page and rejects anything else', () => {
    const url = payosReturnUrl(page, origin);
    expect(url).toBe(origin + PAYOS_RETURN_PATH + b64url(page));
    expect(url).not.toMatch(/[=?#]/);
    expect(payosReturnPage(url, origin)).toBe(page);
    expect(fundReturnUrl(trip)).toBe(url);
    for (const bad of [
      'https://evil.test/trips/x/fund',
      page + '?x=1',
      page + '#x',
      `${origin}/trips/${trip}/fund/../fund`,
      'exp://192.168.1.2:8081',
    ])
      expect(() => payosReturnUrl(bad, origin), bad).toThrow();
    for (const bad of [
      origin + PAYOS_RETURN_PATH + b64url('https://evil.test/trips'),
      origin + PAYOS_RETURN_PATH + b64url(page) + '=',
      origin + PAYOS_RETURN_PATH + b64url(page) + '?x=1',
      'https://evil.test' + PAYOS_RETURN_PATH + b64url(page),
      origin + '/api/v1/other/' + b64url(page),
      origin + PAYOS_RETURN_PATH + b64url(page + '?a=1'),
    ])
      expect(payosReturnPage(bad, origin), bad).toBeUndefined();
  });

  it('reads the return hint without trusting its status', () => {
    expect(readPayosReturn(new URLSearchParams('provider=PAYOS&status=PAID&orderCode=1'))).toEqual({
      status: 'PAID',
    });
    expect(readPayosReturn(new URLSearchParams('provider=PAYOS&status=<x>'))).toEqual({
      status: 'UNKNOWN',
    });
    expect(readPayosReturn(new URLSearchParams('provider=MOMO&status=PAID'))).toBeNull();
  });

  it('allows return_url only for payOS and only to this Web origin', () => {
    const body = { expected_version: 1, expected_finance_version: 1 };
    const return_url = payosReturnUrl(page, origin);
    expect(() =>
      validateCommandBody('payment-create', { ...body, provider: 'PAYOS', return_url }),
    ).not.toThrow();
    expect(() =>
      validateCommandBody('payment-create', { ...body, provider: 'PAYOS' }),
    ).not.toThrow();
    for (const bad of [
      { provider: 'MOMO_SANDBOX', return_url },
      { provider: 'PAYOS', return_url: 'https://evil.test' + PAYOS_RETURN_PATH + b64url(page) },
      { provider: 'PAYOS', return_url: return_url + '?status=PAID' },
      { provider: 'PAYOS', return_url: 42 },
      { provider: 'PAYOS', return_url, extra: true },
    ])
      expect(
        () => validateCommandBody('payment-create', { ...body, ...bad }),
        JSON.stringify(bad),
      ).toThrow();
  });

  it('keeps a 202 payOS attempt as the receipt and refuses one from another provider', async () => {
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    const session = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    const definition = {
      kind: 'payment-create' as const,
      actorId: actor,
      tripId: trip,
      fundId: fund,
      resourceId: contribution,
      body: {
        provider: 'PAYOS',
        return_url: payosReturnUrl(page, origin),
        expected_version: 1,
        expected_finance_version: 1,
      },
    };
    client.write.mockResolvedValueOnce({ status: 202, data: payos, correlationId: null });
    await session.submit(definition);
    expect(client.write.mock.calls[0]?.[0]).toBe(
      `/api/v1/contributions/${contribution}/payment-attempts`,
    );
    expect(client.write.mock.calls[0]?.[1].body).toEqual(definition.body);
    expect(session.getSnapshot()).toMatchObject({ state: 'SUCCEEDED', receipt: { id: attemptId } });
    session.dismiss();
    client.write.mockResolvedValueOnce({
      status: 202,
      correlationId: null,
      data: {
        ...payos,
        provider: 'MOMO_SANDBOX',
        environment: 'SANDBOX',
        payment_url: 'https://test-payment.momo.vn/pay',
      },
    });
    await session.submit(definition);
    expect(session.getSnapshot().state).not.toBe('SUCCEEDED');
  });

  it('lists payOS for the instruction only when the server says so (older servers omit it)', () => {
    const qr_payload =
      '00020101021238470010A0000007270117000697043601031230208QRIBFTTA530370454062000005802VN62110807TESTREF6304E10D';
    const row = {
      contribution_id: contribution,
      amount: '200000',
      currency: 'VND',
      reference: 'TESTREF',
      recipient_name: 'NGUYEN VAN A',
      bank_code: 'VCB',
      bank_bin: '970436',
      bank_name: 'Vietcombank',
      account_number: '123',
      environment: 'LIVE',
      warning: 'Quét mã bằng ứng dụng ngân hàng.',
      qr_payload,
      qr_svg:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges" role="img" aria-label="VietQR"><rect width="29" height="29" fill="#ffffff"/><path d="M4 4h7v1h-7z" fill="#000000"/></svg>',
    };
    expect(decodeInstruction(row, contribution).online_payment_providers).toEqual([]);
    expect(
      decodeInstruction({ ...row, online_payment_providers: [] }, contribution)
        .online_payment_providers,
    ).toEqual([]);
    expect(
      decodeInstruction({ ...row, online_payment_providers: ['PAYOS'] }, contribution)
        .online_payment_providers,
    ).toEqual(['PAYOS']);
    expect(
      decodeInstruction({ ...row, online_payment_providers: ['FUTURE_PAY'] }, contribution)
        .online_payment_providers,
    ).toEqual([]);
    for (const online_payment_providers of [null, 'PAYOS', ['PAYOS', 'PAYOS'], [1]])
      expect(
        () => decodeInstruction({ ...row, online_payment_providers }, contribution),
        JSON.stringify(online_payment_providers),
      ).toThrow();
  });

  it('labels payOS audit rows instead of rejecting the history page', () => {
    const row = {
      id: attemptId,
      fund_id: fund,
      actor_user_id: null,
      system_actor: 'PAYOS_WEBHOOK',
      action: 'CONFIRM_PROVIDER_PAYMENT',
      entity_type: 'Contribution',
      entity_id: contribution,
      from_version: 1,
      to_version: 2,
      reason: null,
      occurred_at: '2026-11-26T00:00:00Z',
      correlation_id: actor,
    };
    expect(decodeHistory(row, fund).system_actor).toBe('PAYOS_WEBHOOK');
    expect(() => decodeHistory({ ...row, system_actor: 'SOMEONE' }, fund)).toThrow();
  });
});

function runtimeWith(paymentAttempt: FundRuntime['paymentAttempt']): FundRuntime {
  const recovery = createPaymentRecovery(sessionStorage);
  const paymentRecovery: NonNullable<FundRuntime['paymentRecovery']> = {
    load: (a, t) => recovery.load(a, t),
    save: (a, t, id, c) => recovery.save(a, t, id, c),
    list: (a, t) => recovery.list(a, t),
  };
  return { paymentAttempt, paymentRecovery } as unknown as FundRuntime;
}
function Checkout({ runtime, session }: { runtime: FundRuntime; session: CommandSession }) {
  const payment = useContributionPayment(runtime, actor, trip, session, contribution);
  return (
    <>
      {payment.attemptId && (
        <PaymentAttemptStatus attempt={payment.attempt} onCheck={payment.check} />
      )}
      {!payment.open && (
        <FinanceAction
          label="Thanh toán qua payOS"
          payment="PAYOS"
          variant="primary"
          session={session}
          definition={{
            kind: 'payment-create',
            actorId: actor,
            tripId: trip,
            fundId: fund,
            resourceId: contribution,
            body: {
              provider: 'PAYOS',
              return_url: fundReturnUrl(trip),
              expected_version: 1,
              expected_finance_version: 1,
            },
          }}
        />
      )}
    </>
  );
}
const queries = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('payOS checkout', () => {
  it('creates the attempt, opens payOS in a new tab and reports success only from the backend', async () => {
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    client.write.mockResolvedValue({ status: 202, data: payos, correlationId: null });
    const session = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    const read = vi
      .fn<NonNullable<FundRuntime['paymentAttempt']>>()
      .mockResolvedValueOnce(payos)
      .mockResolvedValue({ ...payos, status: 'SUCCEEDED', payment_url: null });
    render(
      <QueryClientProvider client={queries()}>
        <Checkout runtime={runtimeWith(read)} session={session} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán qua payOS' }));
    expect(
      screen.getByText(/chuyển tiền thật, vào thẳng tài khoản của người giữ quỹ/),
    ).toBeVisible();
    expect(screen.queryByText(/không chuyển tiền thật/)).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form'));
    const link = await screen.findByRole('link', { name: 'Mở trang thanh toán payOS' });
    expect(link).toHaveAttribute('href', payos.payment_url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Đang chờ thanh toán trên payOS')).toBeVisible();
    expect(screen.getByText(/LOCC/)).toBeVisible();
    // Saved for this tab so a reload (or the return page) can resume tracking.
    expect(createPaymentRecovery(sessionStorage).list(actor, trip)).toEqual({
      [contribution]: attemptId,
    });
    expect(screen.queryByRole('button', { name: 'Thanh toán qua payOS' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    expect(await screen.findByText('Quỹ đã nhận tiền')).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Mở trang thanh toán payOS' }),
    ).not.toBeInTheDocument();
    expect(client.write).toHaveBeenCalledTimes(1);
  }, 15000);
});

describe('payOS checkout recovery', () => {
  it('keeps a payment open while its state is unknown, but not one the server does not have', async () => {
    createPaymentRecovery(sessionStorage).save(actor, trip, attemptId, contribution);
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    const session = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    const unknown = vi
      .fn<NonNullable<FundRuntime['paymentAttempt']>>()
      .mockRejectedValue(new ApiError('down', 'network', null, null, null, true));
    const first = render(
      <QueryClientProvider client={queries()}>
        <Checkout runtime={runtimeWith(unknown)} session={session} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(unknown).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Tải lại' }, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: 'Thanh toán qua payOS' })).not.toBeInTheDocument();
    first.unmount();
    const missing = vi
      .fn<NonNullable<FundRuntime['paymentAttempt']>>()
      .mockRejectedValue(new ApiError('gone', 'http', 404, 'RESOURCE_NOT_FOUND', null, false));
    render(
      <QueryClientProvider client={queries()}>
        <Checkout runtime={runtimeWith(missing)} session={session} />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole('button', { name: 'Thanh toán qua payOS' }, { timeout: 5000 }),
    ).toBeVisible();
  }, 15000);
});

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname + location.search}</output>;
}
function Returned({
  runtime,
  refresh,
  reading,
}: {
  runtime: FundRuntime;
  refresh: () => void;
  reading: boolean;
}) {
  const state = usePayosReturn(runtime, actor, trip, refresh);
  return <PayosReturnNotice state={state} reading={reading} onShowContributions={() => {}} />;
}

describe('payOS return page', () => {
  it('re-reads instead of trusting ?status=PAID and removes the hint from the address', async () => {
    createPaymentRecovery(sessionStorage).save(actor, trip, attemptId, contribution);
    const read = vi.fn<NonNullable<FundRuntime['paymentAttempt']>>().mockResolvedValue(payos);
    const refresh = vi.fn();
    const view = (reading: boolean) => (
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/trips/${trip}/fund?provider=PAYOS&status=PAID&orderCode=42`]}
        >
          <Returned runtime={runtimeWith(read)} refresh={refresh} reading={reading} />
          <Where />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const client = queries();
    const { rerender } = render(view(true));
    expect(screen.getByText('Đang kiểm tra kết quả thanh toán…')).toBeVisible();
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(`/trips/${trip}/fund`),
    );
    expect(screen.getByTestId('where').textContent).not.toContain('?');
    expect(refresh).toHaveBeenCalled();
    rerender(view(false));
    expect(await screen.findByText('Đang chờ thanh toán trên payOS')).toBeVisible();
    expect(screen.getByText(/Trang payOS không xác nhận khoản đóng/)).toBeVisible();
    expect(screen.queryByText('Quỹ đã nhận tiền')).not.toBeInTheDocument();
    expect(read).toHaveBeenCalledWith(attemptId, expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByLabelText('Kết quả thanh toán payOS')).not.toBeInTheDocument();
  }, 15000);

  it('shows nothing without the payOS hint', () => {
    render(
      <QueryClientProvider client={queries()}>
        <MemoryRouter initialEntries={[`/trips/${trip}/fund?status=PAID`]}>
          <Returned runtime={runtimeWith(vi.fn())} refresh={vi.fn()} reading={false} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.queryByLabelText('Kết quả thanh toán payOS')).not.toBeInTheDocument();
  });
});
