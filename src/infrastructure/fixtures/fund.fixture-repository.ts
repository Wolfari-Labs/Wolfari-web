import type {
  FundRepository,
  FundScenario,
  FundViewModel,
  FundPermissions,
  FundMemberPresentation,
} from '../../features/fund/model/fund';
import { fixtureViewerId, previewTripId, readableFixtureTrips } from './trip-catalog';

const member: FundMemberPresentation = { displayName: 'Trang Nguyễn', avatar: null };

const permissions = (overrides: Partial<FundPermissions> = {}): FundPermissions => ({
  canRead: true,
  canConfigure: false,
  canCreateContributionRequest: false,
  canReportTransfer: true,
  canConfirmContribution: true,
  canCreateExpense: true,
  canEditOwnExpenseDraft: true,
  canEditAnyExpenseDraft: false,
  canConfirmExpense: true,
  canCreateOutsideFundNote: true,
  canCreateRefund: false,
  canBeginClosure: true,
  canCancelClosure: false,
  canConfirmClosure: true,
  ...overrides,
});

function readyFund(tripId: string, scenario: Extract<FundScenario, 'success' | 'read-only' | 'closing' | 'closed'>): FundViewModel {
  const status = scenario === 'closing' ? 'CLOSING' : scenario === 'closed' ? 'CLOSED' : 'OPEN';
  const readOnly = scenario === 'read-only' || status !== 'OPEN';
  const fundId = `fund-${tripId.slice(0, 8)}`;
  const expenseSeeds = [
    ['expense-hotel', 'Khách sạn', '3600000', '2026-10-12'],
    ['expense-transfer', 'Di chuyển', '1200000', '2026-10-12'],
    ['expense-food', 'Ăn uống', '1000000', '2026-10-13'],
    ['expense-ticket', 'Vé tham quan', '450000', '2026-10-13'],
  ] as const;
  const expenses = expenseSeeds.map(([id, title, amount, paidAt]) => ({
    id,
    fundId,
    title,
    description: null,
    amount,
    status: 'CONFIRMED' as const,
    category: title,
    paidAt,
    createdByUserId: fixtureViewerId,
    paidByUserId: fixtureViewerId,
    version: 1,
    presentation: member,
  }));
  const contribution = {
    id: 'contribution-1',
    fundId,
    requestId: 'request-1',
    memberUserId: fixtureViewerId,
    amount: '7000000',
    status: 'CONFIRMED' as const,
    selfContribution: true,
    version: 1,
    presentation: member,
  };
  const ledger = expenses.map((expense, index) => ({
    id: `ledger-${index + 1}`,
    fundId,
    sequence: index + 1,
    direction: 'OUT' as const,
    transactionType: 'EXPENSE' as const,
    amount: expense.amount,
    balanceAfter: ['3600000', '4800000', '5800000', '6250000'][index]!,
    contributionId: null,
    expenseId: expense.id,
    refundId: null,
    reversalOfId: null,
    actorUserId: fixtureViewerId,
    reason: null,
    createdAt: `${expense.paidAt}T09:00:00+07:00`,
    presentation: { title: expense.title, actor: member },
  }));
  const blockers = [
    { code: 'NON_ZERO_BALANCE' as const, label: 'Số dư ghi sổ chưa bằng 0', amount: '750000' },
    { code: 'RESERVED_REFUND' as const, label: 'Còn khoản hoàn dư đang giữ', amount: '250000' },
    { code: 'PENDING_CONFIRMATIONS' as const, label: 'Cần xác nhận đóng quỹ của thành viên', amount: null },
  ];
  return {
    tripId,
    fund: {
      id: fundId,
      tripId,
      holderUserId: fixtureViewerId,
      currency: 'VND',
      budgetAmount: '9000000',
      currentBalance: '750000',
      reservedRefund: '250000',
      availableBalance: '500000',
      status,
      financeVersion: 3,
      environment: 'TEST',
    },
    totals: {
      confirmedContributions: '7000000',
      confirmedExpenses: '6250000',
      confirmedRefunds: '0',
      ledgerBalance: '750000',
      reservedRefund: '250000',
      availableBalance: '500000',
    },
    contributions: [contribution],
    expenses,
    notes: [
      {
        id: 'note-outside-fund',
        fundId,
        description: 'Một số khoản tự trả ngoài quỹ',
        amount: '300000',
        payerUserId: fixtureViewerId,
        version: 1,
        presentation: member,
      },
    ],
    refunds: [],
    ledger,
    closure: {
      id: 'closure-1',
      fundId,
      status: 'PENDING_CONFIRMATIONS',
      snapshotHash: 'fixture-snapshot-v3',
      requiredUserIds: [fixtureViewerId],
      confirmedUserIds: [],
      blockers,
      financeVersion: 3,
    },
    permissions: permissions({
      canCreateExpense: !readOnly,
      canEditOwnExpenseDraft: !readOnly,
      canConfirmExpense: !readOnly,
      canConfirmContribution: !readOnly,
      canReportTransfer: !readOnly,
      canBeginClosure: status === 'OPEN',
      canConfirmClosure: status !== 'CLOSED',
    }),
    blockers,
  };
}

function errorFor(scenario: FundScenario) {
  return {
    status: 'error' as const,
    error: {
      code:
        scenario === 'forbidden'
          ? ('PERMISSION_DENIED' as const)
          : scenario === 'not-found'
            ? ('RESOURCE_NOT_FOUND' as const)
            : scenario === 'conflict'
              ? ('VERSION_CONFLICT' as const)
              : ('SERVICE_UNAVAILABLE' as const),
      correlationId: 'fixture-fund-read',
      retryable: scenario === 'error',
    },
  };
}

export function createFixtureFundRepository(options: { viewerId?: string } = {}): FundRepository {
  const trips = readableFixtureTrips(options.viewerId ?? fixtureViewerId);
  return {
    async getFund({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      const trip = trips.find((item) => item.id === tripId);
      if (!trip || scenario === 'not-found') return errorFor('not-found');
      if (scenario === 'forbidden') return errorFor('forbidden');
      if (!['success', 'read-only', 'closing', 'closed'].includes(scenario))
        return errorFor(scenario);
      return {
        status: 'ready',
        data: structuredClone(
          readyFund(
            tripId,
            scenario as 'success' | 'read-only' | 'closing' | 'closed',
          ),
        ),
      };
    },
  };
}

export { previewTripId };
