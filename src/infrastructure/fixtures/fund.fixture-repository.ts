import type {
  FundMemberPresentation,
  FundPermissions,
  FundRepository,
  FundScenario,
  FundViewModel,
} from '../../features/fund/model/fund';
import { fixtureViewerId, previewTripId, readableFixtureTrips } from './trip-catalog';

const fixtureHolderId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const member: FundMemberPresentation = { displayName: 'Trang Nguyễn', avatar: null };
const holder: FundMemberPresentation = { displayName: 'Minh Trần', avatar: null };

const permissions = (viewerId: string, overrides: Partial<FundPermissions> = {}): FundPermissions => ({
  canRead: true,
  canConfigure: false,
  canCreateContributionRequest: true,
  canReportTransfer: true,
  canConfirmContribution: viewerId === fixtureHolderId,
  canCreateExpense: true,
  canEditOwnExpenseDraft: true,
  canEditAnyExpenseDraft: viewerId === fixtureHolderId,
  canConfirmExpense: viewerId === fixtureHolderId,
  canCreateOutsideFundNote: true,
  canCreateRefund: viewerId === fixtureHolderId,
  canBeginClosure: viewerId === fixtureHolderId,
  canCancelClosure: viewerId === fixtureHolderId,
  canConfirmClosure: viewerId === fixtureHolderId,
  ...overrides,
});

type ReadyScenario = Extract<FundScenario, 'success' | 'read-only' | 'closing' | 'closed'>;

function readyFund(tripId: string, scenario: ReadyScenario, viewerId: string): FundViewModel {
  const status = scenario === 'closing' ? 'CLOSING' : scenario === 'closed' ? 'CLOSED' : 'OPEN';
  const readOnly = scenario !== 'success';
  const fundId = `fund-${tripId.slice(0, 8)}`;
  const isClosed = status === 'CLOSED';
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
    selfContribution: viewerId === fixtureViewerId,
    version: 1,
    presentation: member,
  };
  const refund = {
    id: 'refund-1',
    fundId,
    memberUserId: fixtureViewerId,
    amount: isClosed ? '750000' : '250000',
    status: isClosed ? ('CONFIRMED' as const) : ('PENDING' as const),
    reason: isClosed ? 'Hoàn số dư khi đóng quỹ' : 'Hoàn phần chi còn dư',
    version: 1,
    presentation: member,
  };
  const balances = ['7000000', '3400000', '2200000', '1200000', '750000'];
  const ledger = [
    {
      id: 'ledger-1',
      fundId,
      sequence: '1',
      direction: 'IN' as const,
      transactionType: 'CONTRIBUTION' as const,
      amount: contribution.amount,
      balanceAfter: balances[0]!,
      contributionId: contribution.id,
      expenseId: null,
      refundId: null,
      reversalOfId: null,
      actorUserId: contribution.memberUserId,
      reason: null,
      createdAt: '2026-10-11T09:00:00+07:00',
      presentation: { title: 'Đóng góp đã xác nhận', actor: member },
    },
    ...expenses.map((expense, index) => ({
      id: `ledger-${index + 2}`,
      fundId,
      sequence: String(index + 2),
      direction: 'OUT' as const,
      transactionType: 'EXPENSE' as const,
      amount: expense.amount,
      balanceAfter: balances[index + 1]!,
      contributionId: null,
      expenseId: expense.id,
      refundId: null,
      reversalOfId: null,
      actorUserId: expense.paidByUserId,
      reason: null,
      createdAt: `${expense.paidAt}T09:00:00+07:00`,
      presentation: { title: expense.title, actor: member },
    })),
    ...(isClosed
      ? [{
          id: 'ledger-6',
          fundId,
          sequence: '6',
          direction: 'OUT' as const,
          transactionType: 'REFUND' as const,
          amount: refund.amount,
          balanceAfter: '0',
          contributionId: null,
          expenseId: null,
          refundId: refund.id,
          reversalOfId: null,
          actorUserId: fixtureHolderId,
          reason: refund.reason,
          createdAt: '2026-10-14T09:00:00+07:00',
          presentation: { title: 'Hoàn số dư khi đóng quỹ', actor: holder },
        }]
      : []),
  ];
  const currentBalance = isClosed ? '0' : '750000';
  const reservedRefund = isClosed ? '0' : '250000';
  const availableBalance = isClosed ? '0' : '500000';
  const blockers = isClosed
    ? []
    : [
        { code: 'NON_ZERO_BALANCE' as const, label: 'Số dư ghi sổ chưa bằng 0', amount: currentBalance },
        { code: 'RESERVED_REFUND' as const, label: 'Còn khoản hoàn dư đang giữ', amount: reservedRefund },
        { code: 'PENDING_CONFIRMATIONS' as const, label: 'Cần xác nhận đóng quỹ của thành viên', amount: null },
      ];
  const closedAt = isClosed ? '2026-10-14T09:30:00+07:00' : null;
  return {
    tripId,
    environment: scenario === 'read-only' ? 'SANDBOX' : 'TEST',
    viewerRole: viewerId === fixtureHolderId ? 'HOLDER' : 'MEMBER',
    fund: {
      id: fundId,
      tripId,
      holderUserId: fixtureHolderId,
      currency: 'VND',
      budgetAmount: scenario === 'read-only' ? null : '9000000',
      currentBalance,
      reservedRefund,
      availableBalance,
      status,
      closedAt,
      financeVersion: 3,
    },
    totals: {
      confirmedContributions: '7000000',
      confirmedExpenses: '6250000',
      confirmedRefunds: isClosed ? '750000' : '0',
      ledgerBalance: currentBalance,
      reservedRefund,
      availableBalance,
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
    refunds: [refund],
    ledger,
    nextCursor: null,
    closure: {
      id: 'closure-1',
      fundId,
      status: isClosed ? 'COMPLETED' : 'PENDING_CONFIRMATIONS',
      snapshotHash: 'fixture-snapshot-v4',
      requiredUserIds: isClosed ? [] : [fixtureViewerId, fixtureHolderId],
      confirmedUserIds: isClosed ? [fixtureViewerId, fixtureHolderId] : [],
      blockers,
      closedAt,
      financeVersion: 3,
    },
    permissions: permissions(viewerId, {
      canCreateExpense: !readOnly,
      canEditOwnExpenseDraft: !readOnly,
      canConfirmExpense: !readOnly && viewerId === fixtureHolderId,
      canConfirmContribution: !readOnly && viewerId === fixtureHolderId,
      canReportTransfer: !readOnly,
      canBeginClosure: status === 'OPEN' && viewerId === fixtureHolderId,
      canCancelClosure: status === 'CLOSING' && viewerId === fixtureHolderId,
      canConfirmClosure: status === 'CLOSING' && viewerId === fixtureHolderId,
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
  const viewerId = options.viewerId ?? fixtureViewerId;
  // The preview trip has one membership record; allow the synthetic Holder
  // identity to inspect that same read projection for permission coverage.
  const trips = readableFixtureTrips(viewerId === fixtureHolderId ? fixtureViewerId : viewerId);
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
      if (!['success', 'read-only', 'closing', 'closed'].includes(scenario)) return errorFor(scenario);
      return {
        status: 'ready',
        data: structuredClone(readyFund(tripId, scenario as ReadyScenario, viewerId)),
      };
    },
  };
}

export { fixtureHolderId, previewTripId };
