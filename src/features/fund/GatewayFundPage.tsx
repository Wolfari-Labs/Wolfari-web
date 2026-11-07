import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  FundRuntime,
  RuntimeFund,
  Destination,
  Contribution,
  ContributionRequest,
} from './model/runtime-fund';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import type { CommandKind, CommandSession } from '../../shared/types/operations';
import { unresolved } from '../../shared/types/operations';
import { useTripRepository } from '../trips/repositories/repository-context';
import { useMembersRepositories } from '../members/repositories/members-context';
import { TripHero } from '../trips/components/TripHero';
import { paths } from '../../app/route-paths';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Drawer } from '../../shared/components/Drawer';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { OperationStatus, useCommandSession } from '../../shared/components/OperationStatus';
import { toDomainError, money } from '../../shared/lib/runtime-validation';
import { localTimeToIso } from '../plan/model/plan-draft';
import type { MembershipViewModel } from '../members/model/members';
import {
  FinanceKpis,
  FinanceStateBar,
  FinanceUnavailable,
} from './components/FinancePresentation';
import {
  FinanceGoal,
  FinanceTransactionPanel,
  type FinanceTransactionRow,
} from './components/FinanceDesktop';
import { FinanceOverlay, type FinanceSection } from './components/FinanceOverlay';
import financeOverlayStyles from './components/FinanceOverlay.module.css';
import styles from '../../shared/styles/DemoWorkspace.module.css';
import fundStyles from './FundPage.module.css';

export const formatVnd = (value: string | null) =>
  value === null ? 'Chưa đặt' : value.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
const labels: Record<CommandKind, string> = {
  enable: 'Bật quỹ TEST',
  budget: 'Sửa ngân sách',
  'destination-create': 'Thêm đích nhận TEST',
  'destination-edit': 'Sửa đích nhận TEST',
  'destination-confirm': 'Xác nhận đích nhận',
  'request-create': 'Tạo đợt thu',
  'request-edit': 'Sửa đợt thu',
  amount: 'Sửa số tiền',
  waive: 'Miễn khoản đóng',
  cancel: 'Hủy khoản đóng',
  report: 'Báo đã chuyển TEST',
  reject: 'Từ chối báo chuyển',
  confirm: 'Xác nhận đã nhận TEST',
  leave: 'Rời chuyến đi',
  remove: 'Xóa thành viên',
};
const statusLabels = {
  PENDING: 'Chờ báo chuyển',
  TRANSFER_REPORTED: 'Đã báo chuyển',
  CONFIRMED: 'Đã xác nhận',
  WAIVED: 'Đã miễn',
  CANCELLED: 'Đã hủy',
  REVERSED: 'Đã đảo bút toán',
};
export function QueryError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ContentState state="error" headingLevel={2} error={toDomainError(error)} onRetry={retry} />
  );
}
interface FormSpec {
  kind: CommandKind;
  resource?: Destination | Contribution | ContributionRequest | undefined;
  versions: Record<string, number>;
  recovery?: boolean;
}

function FundCommandForm({
  spec,
  trip,
  fund,
  destinations,
  members,
  session,
  onClose,
}: {
  spec: FormSpec;
  trip: TripDetailViewModel;
  fund: RuntimeFund | null;
  destinations: Destination[];
  members: readonly MembershipViewModel[];
  session: CommandSession;
  onClose: () => void;
}) {
  const kind = spec.kind,
    resource = spec.resource;
  const destination = resource && 'destination_type' in resource ? resource : null;
  const request = resource && 'contributions' in resource ? resource : null;
  const contribution = resource && 'member_user_id' in resource ? resource : null;
  const [holder, setHolder] = useState(fund?.holder_user_id ?? '');
  const [budget, setBudget] = useState(fund?.budget_amount ?? '');
  const [bank, setBank] = useState(destination?.bank_code ?? '');
  const [account, setAccount] = useState(destination?.account_number ?? '');
  const [recipient, setRecipient] = useState(destination?.account_name ?? '');
  const [active, setActive] = useState(destination?.active ?? true);
  const [defaultDestination, setDefaultDestination] = useState(destination?.is_default ?? true);
  const [title, setTitle] = useState(request?.title ?? '');
  const [note, setNote] = useState(request?.note ?? '');
  const [due, setDue] = useState(''); // Blank on edit means omission, not clearing an existing deadline.
  const [amount, setAmount] = useState(contribution?.amount ?? '');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [destinationId, setDestinationId] = useState(
    destinations.find(
      (d) => d.active && d.confirmed_by_holder_at && d.destination_type === 'VIETQR',
    )?.id ?? '',
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const bankForm = ['enable', 'destination-create', 'destination-edit'].includes(kind);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    try {
      let body: Record<string, unknown> = { ...spec.versions };
      if (bankForm) {
        if (!bank.trim() || !account.trim() || !recipient.trim())
          throw Error('Nhập đủ mã ngân hàng, số tài khoản TEST và tên người nhận.');
        const config = {
          destination_type: 'VIETQR',
          bank_code: bank.trim(),
          account_number: account.trim(),
          account_name: recipient.trim(),
          active,
          is_default: defaultDestination,
        };
        if (kind === 'enable') {
          if (!members.some((m) => m.userId === holder && m.leftAt === null))
            throw Error('Chọn Holder đang là thành viên.');
          body = {
            holder_user_id: holder,
            currency: 'VND',
            destination: config,
            ...(budget === '' ? {} : { budget_amount: money(budget) }),
          };
        } else body = { ...body, ...config };
      } else if (kind === 'budget') body.budget_amount = budget === '' ? null : money(budget);
      else if (kind === 'amount') body.amount = money(amount, true);
      else if (kind === 'request-create' || kind === 'request-edit') {
        if (!title.trim()) throw Error('Nhập tên đợt thu.');
        body = { ...body, title: title.trim(), note };
        if (due) {
          const instant = localTimeToIso(due.slice(0, 10), due.slice(11), trip.timezone);
          if (!instant) throw Error('Hạn thu không hợp lệ trong múi giờ chuyến đi.');
          body.due_at = instant;
        }
        if (kind === 'request-create') {
          if (
            !destinations.some(
              (d) => d.id === destinationId && d.active && d.confirmed_by_holder_at,
            )
          )
            throw Error('Chọn đích nhận đã được Holder xác nhận.');
          const contributions = members
            .filter((m) => m.leftAt === null && amounts[m.userId]?.trim())
            .map((m) => ({
              member_user_id: m.userId,
              amount: money(amounts[m.userId]!.trim(), true),
              destination_id: destinationId,
            }));
          if (!contributions.length) throw Error('Nhập số tiền cho ít nhất một người.');
          body.contributions = contributions;
        }
      } else if (['waive', 'cancel', 'reject'].includes(kind)) {
        if (!reason.trim())
          throw Error('Nhập lý do rõ ràng, không kèm thông tin ngân hàng hoặc bí mật.');
        body.reason = reason.trim();
      }
      setError('');
      setPending(true);
      if (spec.recovery) await session.retry(body);
      else
        await session.submit({
          kind,
          tripId: trip.id,
          actorId: trip.currentMembership.userId,
          ...(fund ? { fundId: fund.id } : {}),
          ...(resource ? { resourceId: resource.id } : {}),
          body,
        });
      if (session.getSnapshot().state === 'SUCCEEDED') onClose();
      else if (session.getSnapshot().state !== 'FAILED') onClose();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== 'Invalid int64'
          ? cause.message
          : 'Số tiền phải là chuỗi số nguyên VND từ 1 tới 9223372036854775807 (ngân sách cho phép 0).',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} aria-label={labels[kind]}>
      <Alert tone="warning">
        Môi trường TEST. Không chuyển tiền thật. Chỉ xác nhận nhận tiền mới ghi tăng số dư. Đóng cửa
        sổ không hủy thao tác đã gửi.
      </Alert>
      {error && (
        <Alert tone="error" live>
          {error}
        </Alert>
      )}
      {kind === 'enable' && (
        <Select
          label="Người giữ quỹ (Holder)"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          required
        >
          <option value="">Chọn thành viên</option>
          {members
            .filter((m) => !m.leftAt)
            .map((m) => (
              <option key={m.id} value={m.userId}>
                {m.presentation.displayName ?? m.userId.slice(0, 8)}
              </option>
            ))}
        </Select>
      )}
      {(kind === 'enable' || kind === 'budget') && (
        <Input
          label="Ngân sách (VND)"
          inputMode="numeric"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          hint="Để trống để không đặt ngân sách. Ngân sách không làm tăng số dư."
        />
      )}
      {bankForm && (
        <>
          <Input
            label="Mã ngân hàng TEST"
            value={bank}
            maxLength={30}
            onChange={(e) => setBank(e.target.value)}
            required
            hint="Ví dụ: VCB. Chỉ dùng dữ liệu thử nghiệm."
          />
          <Input
            label="Số tài khoản TEST"
            value={account}
            maxLength={80}
            onChange={(e) => setAccount(e.target.value)}
            required
            autoComplete="off"
          />
          <Input
            label="Tên người nhận TEST"
            value={recipient}
            maxLength={150}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
          <label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{' '}
            Đích đang hoạt động
          </label>
          <label>
            <input
              type="checkbox"
              checked={defaultDestination}
              onChange={(e) => setDefaultDestination(e.target.checked)}
            />{' '}
            Đích mặc định
          </label>
          <p>Người giữ quỹ cần xác nhận thông tin nhận tiền trước khi tạo đợt thu.</p>
        </>
      )}
      {(kind === 'request-create' || kind === 'request-edit') && (
        <>
          <Input
            label="Tên đợt thu"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Ghi chú đợt thu"
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
          />
          <Input
            label={`Hạn thu (${trip.timezone})`}
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            hint={
              request?.due_at
                ? `Đang lưu: ${new Date(request.due_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}. Để trống để giữ nguyên hạn thu.`
                : 'Không bắt buộc.'
            }
          />
          {kind === 'request-create' && (
            <>
              <Select
                label="Đích nhận đã xác nhận"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
              >
                <option value="">Chọn đích nhận</option>
                {destinations
                  .filter(
                    (d) => d.active && d.confirmed_by_holder_at && d.destination_type === 'VIETQR',
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.account_name ?? 'Tài khoản nhận'} · {d.bank_code} · {d.account_number}
                    </option>
                  ))}
              </Select>
              <fieldset>
                <legend>Số tiền từng người (VND) — để trống để bỏ qua</legend>
                {members
                  .filter((m) => !m.leftAt)
                  .map((m) => (
                    <Input
                      key={m.id}
                      label={`Khoản đóng · ${m.presentation.displayName ?? m.userId.slice(0, 8)}`}
                      inputMode="numeric"
                      value={amounts[m.userId] ?? ''}
                      onChange={(e) => setAmounts((a) => ({ ...a, [m.userId]: e.target.value }))}
                    />
                  ))}
              </fieldset>
            </>
          )}
        </>
      )}
      {kind === 'amount' && (
        <Input
          label="Số tiền mới (VND)"
          value={amount}
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      )}
      {['reject', 'waive', 'cancel'].includes(kind) && (
        <Input
          label="Lý do"
          value={reason}
          maxLength={1000}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      )}
      {contribution && (
        <p>
          {statusLabels[contribution.status]} · {formatVnd(contribution.amount)}. Không sửa số tiền
          khi xác nhận.
        </p>
      )}
      {kind === 'destination-confirm' && (
        <p>
          Xác nhận trách nhiệm với thông tin nhận tiền này. Thao tác không xác minh tài khoản ngân
          hàng.
        </p>
      )}
      <Button type="submit" loading={pending} disabled={pending}>
        {spec.recovery ? 'Đối chiếu và gửi lại yêu cầu cũ' : 'Xác nhận · ' + labels[kind]}
      </Button>
    </form>
  );
}

function FundWorkspace({ trip, runtime }: { trip: TripDetailViewModel; runtime: FundRuntime }) {
  const actor = trip.currentMembership.userId,
    qc = useQueryClient();
  const { membership } = useMembersRepositories();
  const session = runtime.commands.forScope(actor, trip.id);
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['finance', actor, trip.id] });
    void qc.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] });
  }, [qc, actor, trip.id]);
  const op = useCommandSession(session, refresh);
  const [form, setForm] = useState<FormSpec | null>(null);
  const [financeOverlayOpen, setFinanceOverlayOpen] = useState(false);
  const [financeSection, setFinanceSection] = useState<FinanceSection>('general');
  const [instructionId, setInstructionId] = useState<string | null>(null);
  const financeSettingsRef = useRef<HTMLButtonElement>(null);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  const formTriggerRef = useRef<HTMLElement | null>(null);
  const enableTriggerRef = useRef<HTMLButtonElement>(null);
  const formContextRef = useRef<HTMLElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const fundQuery = useQuery({
    queryKey: ['finance', actor, trip.id, 'fund'],
    queryFn: ({ signal }) => runtime.fund(trip.id, signal),
  });
  const fund = fundQuery.data ?? null;
  const membersQuery = useInfiniteQuery({
    queryKey: ['members', trip.id, 'fund', actor],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }) => {
      const r = await membership.listMembers({
        tripId: trip.id,
        scenario: 'success',
        signal,
        ...(pageParam ? { cursor: pageParam } : {}),
        limit: 100,
      });
      if (r.status === 'error') throw r.error;
      return r.status === 'ready' ? r.data : { items: [], nextCursor: null };
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const members = [
    ...new Map(
      (membersQuery.data?.pages.flatMap((p) => p.items) ?? []).map((m) => [m.id, m]),
    ).values(),
  ];
  const destinations = useQuery({
    queryKey: ['finance', actor, trip.id, 'destinations', fund?.id],
    enabled: !!fund,
    queryFn: ({ signal }) => runtime.destinations(fund!.id, signal),
  });
  const requests = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'requests', fund?.id],
    initialPageParam: undefined as string | undefined,
    enabled: !!fund,
    queryFn: ({ pageParam, signal }) => runtime.requests(fund!.id, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const contributions = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'contributions', fund?.id],
    initialPageParam: undefined as string | undefined,
    enabled: !!fund,
    queryFn: ({ pageParam, signal }) => runtime.contributions(fund!.id, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const ledger = useInfiniteQuery({
    queryKey: ['finance', actor, trip.id, 'ledger', fund?.id],
    initialPageParam: undefined as string | undefined,
    enabled: !!fund,
    queryFn: ({ pageParam, signal }) => runtime.ledger(fund!.id, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const instruction = useQuery({
    queryKey: ['finance', actor, trip.id, 'instruction', instructionId],
    enabled: !!instructionId,
    queryFn: ({ signal }) => runtime.instruction(instructionId!, signal),
    gcTime: 0,
  });
  const name = (id: string) =>
    members.find((m) => m.userId === id)?.presentation.displayName ?? `User ${id.slice(0, 8)}`;
  const owner = trip.currentMembership.role === 'OWNER',
    holder = fund?.holder_user_id === actor;
  const showContext = fund !== null || (form !== null && form.kind !== 'enable');
  const blocked =
    op.busy ||
    unresolved(op) ||
    // A receipt settles the command before its invalidated projections finish
    // loading. New forms must snapshot versions from the completed reads.
    fundQuery.isFetching ||
    destinations.isFetching ||
    requests.isFetching ||
    contributions.isFetching ||
    membersQuery.isFetching ||
    trip.archivedAt !== null ||
    (fund !== null && fund.status !== 'OPEN');
  const rememberFormTrigger = () => {
    if (document.activeElement instanceof HTMLElement) {
      formTriggerRef.current = document.activeElement;
    }
  };
  const focusOpenForm = () => {
    formHeadingRef.current?.focus({ preventScroll: true });
    formHeadingRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const open = (kind: CommandKind, resource?: FormSpec['resource']) => {
    if (form) {
      focusOpenForm();
      return;
    }
    rememberFormTrigger();
    setForm({
      kind,
      resource,
      versions: {
        ...(fund ? { expected_finance_version: fund.finance_version } : {}),
        ...(resource ? { expected_version: resource.version } : {}),
      },
    });
  };
  const closeForm = useCallback(() => {
    const trigger = formTriggerRef.current ?? enableTriggerRef.current;
    formTriggerRef.current = null;
    setForm(null);
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected && !trigger.hasAttribute('disabled')) trigger.focus();
      else if (formContextRef.current) formContextRef.current.focus();
      else refreshButtonRef.current?.focus();
    });
  }, []);
  useEffect(() => {
    if (!form) return;
    const frame = window.requestAnimationFrame(() => {
      formHeadingRef.current?.focus({ preventScroll: true });
      formHeadingRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [form]);
  const data = <T extends { id: string }>(pages: { items: T[] }[] | undefined): T[] => [
    ...new Map((pages?.flatMap((p) => p.items) ?? []).map((row) => [row.id, row])).values(),
  ];
  const transactionRows: FinanceTransactionRow[] = data(ledger.data?.pages).map((row) => ({
    id: row.id,
    type: row.transaction_type,
    title: row.reason ??
      ({ CONTRIBUTION: 'Đợt đóng góp', EXPENSE: 'Khoản chi', REFUND: 'Hoàn tiền', REVERSAL: 'Điều chỉnh' }[row.transaction_type]),
    timeLabel: new Date(row.created_at).toLocaleString('vi-VN', { timeZone: trip.timezone }),
    memberId: row.actor_user_id,
    memberName: row.actor_user_id ? name(row.actor_user_id) : null,
    actorName: row.actor_user_id ? name(row.actor_user_id) : 'Chưa xác định',
    amount: row.amount,
    direction: row.direction,
    sequence: row.sequence,
    balanceAfter: row.balance_after,
    reason: row.reason,
  }));
  const renderContext = () => (
    <aside
      ref={formContextRef}
      className={`${styles.panel} ${fundStyles.gatewayContext}`}
      aria-label="Ngữ cảnh thao tác quỹ"
      tabIndex={-1}
    >
      {form && form.kind !== 'enable' ? (
        <>
          <div className={styles.actions}>
            <h2 ref={formHeadingRef} tabIndex={-1}>
              {labels[form.kind]}
            </h2>
            <Button variant="outline" onClick={closeForm}>
              Đóng biểu mẫu
            </Button>
          </div>
          <FundCommandForm
            key={form.kind + ':' + (form.resource?.id ?? '')}
            spec={form}
            trip={trip}
            fund={fund}
            destinations={destinations.data ?? []}
            members={members}
            session={session}
            onClose={closeForm}
          />
        </>
      ) : (
        <div className={fundStyles.gatewayContextEmpty}>
          <h2>Thao tác quỹ</h2>
          <p>
            Chọn một thao tác ở vùng dữ liệu bên trái. Biểu mẫu sẽ giữ nguyên vùng làm việc khi màn
            hình hẹp.
          </p>
          <p>TEST · Không chuyển tiền thật. Đóng vùng này không hủy thao tác đang chờ đối soát.</p>
        </div>
      )}
    </aside>
  );
  return (
    <>
      <OperationStatus
        session={session}
        onReenter={() => {
          const i = op.intent;
          if (i) {
            if (form) {
              focusOpenForm();
              return;
            }
            rememberFormTrigger();
            setForm({
              kind: i.kind,
              recovery: true,
              versions: i.versions,
              resource: destinations.data?.find((d) => d.id === i.resourceId),
            });
          }
        }}
      />
      <div className={styles.actions}>
        <Button ref={refreshButtonRef} variant="outline" onClick={refresh}>
          Tải lại quỹ
        </Button>
        {membersQuery.hasNextPage && (
          <Button variant="outline" onClick={() => void membersQuery.fetchNextPage()}>
            Tải thêm thành viên
          </Button>
        )}
      </div>
      {membersQuery.isError && (
        <QueryError error={membersQuery.error} retry={() => void membersQuery.refetch()} />
      )}
      {fundQuery.isSuccess && fund && (
        <>
          <FinanceGoal
            budget={fund.budget_amount}
            amount={fund.current_balance}
            format={formatVnd}
            onSettings={() => setFinanceOverlayOpen(true)}
            settingsRef={financeSettingsRef}
          />
          <FinanceStateBar
            status={fund.status}
            holderName={name(fund.holder_user_id)}
            owner={owner}
            holder={holder}
            balance={fund.current_balance}
            format={formatVnd}
            disabled={blocked}
            onBudget={() => open('budget')}
            onDestination={() => open('destination-create')}
          />
          {fund.status !== 'OPEN' && (
            <Alert>Quỹ đã ngừng nhận thay đổi. Bạn vẫn có thể xem lịch sử.</Alert>
          )}
          <FinanceKpis
            budget={fund.budget_amount}
            balance={fund.current_balance}
            reserved={fund.reserved_refund}
            available={fund.available_balance}
            format={formatVnd}
          />
          <FinanceTransactionPanel
            rows={transactionRows}
            format={formatVnd}
            loading={ledger.isPending}
            feedback={ledger.isError ? <QueryError error={ledger.error} retry={() => void ledger.refetch()} /> : undefined}
            hasMore={ledger.hasNextPage}
            loadingMore={ledger.isFetchingNextPage}
            onLoadMore={() => void ledger.fetchNextPage()}
            footer={<p>Chỉ các giao dịch đã tải được lọc. Số dư và tổng tiền lấy từ projection Finance.</p>}
          />
        </>
      )}
      <div className={showContext ? fundStyles.gatewayWorkspace : undefined}>
        <div className={showContext ? fundStyles.gatewayMain : undefined}>
          {fundQuery.isError ? (
            <QueryError error={fundQuery.error} retry={() => void fundQuery.refetch()} />
          ) : fundQuery.isPending ? (
            <ContentState state="loading" />
          ) : !fund ? (
            <section className={styles.panel}>
              <h2>Chuyến đi chưa bật quỹ</h2>
              <p>Chủ chuyến có thể chọn người giữ quỹ và thêm thông tin nhận tiền thử nghiệm.</p>
              {owner && (
                <Button
                  ref={enableTriggerRef}
                  disabled={blocked || !members.length}
                  onClick={() => open('enable')}
                >
                  Bật quỹ TEST
                </Button>
              )}
            </section>
          ) : (
            <>
              <section className={fundStyles.legacyFinance} aria-label="Thao tác chi tiết Finance">
                <div className={fundStyles.legacyFinanceHeading}>
                  <span>FINANCE WORKSPACE</span>
                  <h2>Thao tác chi tiết</h2>
                  <p>Quản lý đích nhận, đợt đóng góp và các trạng thái đối soát theo quyền hiện tại.</p>
                </div>
              <section className={styles.panel} aria-label="Đích nhận">
                <h2>Đích nhận TEST</h2>
                {destinations.isError ? (
                  <QueryError
                    error={destinations.error}
                    retry={() => void destinations.refetch()}
                  />
                ) : destinations.isPending ? (
                  <ContentState state="loading" />
                ) : (
                  <ul className={styles.list}>
                    {destinations.data.map((d) => (
                      <li key={d.id}>
                        <strong>
                          {d.destination_type === 'VIETQR' ? 'Tài khoản ngân hàng' : 'MOMO SANDBOX'}{' '}
                          · {d.active ? 'Đang hoạt động' : 'Đã tắt'}
                        </strong>
                        <p>
                          {d.confirmed_by_holder_at
                            ? 'Người giữ quỹ đã xác nhận'
                            : 'Chờ người giữ quỹ xác nhận'}
                        </p>
                        {d.account_name && (
                          <p>
                            {d.bank_code} · {d.account_number} · {d.account_name}
                          </p>
                        )}
                        {d.momo_phone && <p>MOMO SANDBOX · {d.momo_phone}</p>}
                        <div className={styles.actions}>
                          {owner && d.destination_type === 'VIETQR' && (
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onClick={() => open('destination-edit', d)}
                            >
                              Sửa đích nhận
                            </Button>
                          )}
                          {holder && d.active && !d.confirmed_by_holder_at && (
                            <Button
                              disabled={blocked}
                              onClick={() => open('destination-confirm', d)}
                            >
                              Xác nhận đích nhận
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={styles.panel} aria-label="Đợt thu">
                <h2>
                  <Icon name="plan" />
                  Đợt thu
                </h2>
                {owner && (
                  <Button
                    disabled={
                      blocked ||
                      !destinations.data?.some(
                        (d) =>
                          d.active && d.confirmed_by_holder_at && d.destination_type === 'VIETQR',
                      )
                    }
                    onClick={() => open('request-create')}
                  >
                    Tạo đợt thu
                  </Button>
                )}
                {requests.isPending && <ContentState state="loading" />}
                {requests.isSuccess && !data(requests.data?.pages).length && (
                  <p>Chưa có đợt thu.</p>
                )}
                {requests.isError && (
                  <QueryError
                    error={requests.error}
                    retry={() =>
                      void (requests.isFetchNextPageError
                        ? requests.fetchNextPage()
                        : requests.refetch())
                    }
                  />
                )}
                <ul className={styles.list}>
                  {data(requests.data?.pages).map((r) => (
                    <li key={r.id}>
                      <strong>
                        {r.title} ·{' '}
                        {r.status === 'OPEN'
                          ? 'Đang thu'
                          : r.status === 'CANCELLED'
                            ? 'Đã hủy'
                            : 'Đã đóng'}
                      </strong>
                      <p>
                        {r.note ?? 'Không có ghi chú'} · {r.contributions.length} khoản trong đợt
                      </p>
                      <p>
                        {r.due_at
                          ? 'Hạn thu: ' +
                            new Date(r.due_at).toLocaleString('vi-VN', { timeZone: trip.timezone })
                          : 'Chưa đặt hạn thu'}
                      </p>
                      {owner && r.status === 'OPEN' && (
                        <Button
                          variant="outline"
                          disabled={blocked}
                          onClick={() => open('request-edit', r)}
                        >
                          Sửa đợt thu
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {requests.hasNextPage && (
                  <Button
                    loading={requests.isFetchingNextPage}
                    onClick={() => void requests.fetchNextPage()}
                  >
                    Tải thêm đợt thu
                  </Button>
                )}
              </section>
              <section
                id="finance-contributions"
                className={styles.panel}
                aria-label="Các khoản đóng góp"
              >
                <h2>
                  <Icon name="members" />
                  Các khoản đóng góp
                </h2>
                {contributions.isPending && <ContentState state="loading" />}
                {contributions.isSuccess && !data(contributions.data?.pages).length && (
                  <p>Chưa có khoản đóng góp.</p>
                )}
                {contributions.isError && (
                  <QueryError
                    error={contributions.error}
                    retry={() =>
                      void (contributions.isFetchNextPageError
                        ? contributions.fetchNextPage()
                        : contributions.refetch())
                    }
                  />
                )}
                <ul className={styles.list}>
                  {data(contributions.data?.pages).map((c) => (
                    <li key={c.id} data-testid={'contribution-' + c.member_user_id}>
                      <strong>
                        {name(c.member_user_id)} · {formatVnd(c.amount)}
                      </strong>
                      <p>{statusLabels[c.status]}</p>
                      {c.rejected_reason && <p>Lý do từ chối gần nhất: {c.rejected_reason}</p>}
                      {c.waived_reason && <p>Lý do miễn: {c.waived_reason}</p>}
                      {c.cancelled_reason && <p>Lý do hủy: {c.cancelled_reason}</p>}
                      <div className={styles.actions}>
                        {c.status === 'PENDING' && c.member_user_id === actor && (
                          <>
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onClick={() => setInstructionId(c.id)}
                            >
                              Xem hướng dẫn TEST
                            </Button>
                            <Button disabled={blocked} onClick={() => open('report', c)}>
                              Báo đã chuyển TEST
                            </Button>
                          </>
                        )}
                        {c.status === 'TRANSFER_REPORTED' && holder && (
                          <>
                            <Button disabled={blocked} onClick={() => open('confirm', c)}>
                              Xác nhận đã nhận TEST
                            </Button>
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onClick={() => open('reject', c)}
                            >
                              Từ chối báo chuyển
                            </Button>
                          </>
                        )}
                        {c.status === 'PENDING' && owner && (
                          <>
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onClick={() => open('amount', c)}
                            >
                              Sửa số tiền
                            </Button>
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onClick={() => open('waive', c)}
                            >
                              Miễn khoản đóng
                            </Button>
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onClick={() => open('cancel', c)}
                            >
                              Hủy khoản đóng
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {contributions.hasNextPage && (
                  <Button
                    loading={contributions.isFetchingNextPage}
                    onClick={() => void contributions.fetchNextPage()}
                  >
                    Tải thêm khoản đóng
                  </Button>
                )}
              </section>
              <section id="finance-history" className={styles.panel} aria-label="Lịch sử quỹ">
                <h2>
                  <Icon name="fund" />
                  Lịch sử quỹ
                </h2>
                {ledger.isPending && <ContentState state="loading" />}
                {ledger.isSuccess && !data(ledger.data?.pages).length && (
                  <p>Chưa có giao dịch được ghi nhận.</p>
                )}
                {ledger.isError && (
                  <QueryError
                    error={ledger.error}
                    retry={() =>
                      void (ledger.isFetchNextPageError ? ledger.fetchNextPage() : ledger.refetch())
                    }
                  />
                )}
                <ul className={styles.list}>
                  {data(ledger.data?.pages).map((row) => (
                    <li key={row.id}>
                      <strong>
                        #{row.sequence} ·{' '}
                        {
                          {
                            CONTRIBUTION: 'Đóng góp',
                            EXPENSE: 'Chi quỹ',
                            REFUND: 'Hoàn tiền',
                            REVERSAL: 'Điều chỉnh',
                          }[row.transaction_type]
                        }{' '}
                        · {row.direction === 'IN' ? '+ ' : '− '}
                        {formatVnd(row.amount)}
                      </strong>
                      <p>
                        Số dư sau bút toán: {formatVnd(row.balance_after)} ·{' '}
                        {row.actor_user_id
                          ? `Người thực hiện: ${name(row.actor_user_id)}`
                          : 'Hệ thống'}{' '}
                        ·{' '}
                        {new Date(row.created_at).toLocaleString('vi-VN', {
                          timeZone: trip.timezone,
                        })}
                      </p>
                      {row.reason && <p>Chi tiết: {row.reason}</p>}
                    </li>
                  ))}
                </ul>
                {ledger.hasNextPage && (
                  <Button
                    loading={ledger.isFetchingNextPage}
                    onClick={() => void ledger.fetchNextPage()}
                  >
                    Tải thêm lịch sử
                  </Button>
                )}
                <p>
                  Lịch sử ghi nhận của quỹ. Các nghiệp vụ chi, hoàn dư và đóng quỹ chưa khả dụng.
                </p>
              </section>
              <div id="finance-unsupported" className={fundStyles.financeUnsupportedGrid}>
                <FinanceUnavailable title="Thành viên & quyền">
                  Quyền Owner và Fund Holder được lấy từ phiên hiện tại. Quản lý thành viên của
                  chuyến đi nằm ở trang Thành viên.
                </FinanceUnavailable>
                <FinanceUnavailable title="Khoản chi">
                  Gateway Finance hiện chưa có command tạo hoặc xác nhận khoản chi; màn hình này chỉ
                  giữ chỗ theo thiết kế.
                </FinanceUnavailable>
                <FinanceUnavailable title="Hoàn tiền">
                  Chưa có contract hoàn tiền trên Web. Không hiển thị số dư giả hoặc thao tác thanh
                  toán.
                </FinanceUnavailable>
                <FinanceUnavailable title="Bàn giao Fund Holder">
                  Holder không thể bàn giao trong phiên Finance hiện tại; quyền hiện tại vẫn được
                  hiển thị trung thực.
                </FinanceUnavailable>
              </div>
              </section>
            </>
          )}
        </div>
        {showContext && renderContext()}
      </div>
      {form?.kind === 'enable' && (
        <Drawer
          open
          label="Thiết lập bật quỹ"
          onDismiss={closeForm}
          side="center"
          className={financeOverlayStyles.enableDrawer ?? ''}
          overlayClassName={financeOverlayStyles.enableBackdrop ?? ''}
          showHeader={false}
          initialFocusRef={formHeadingRef}
          returnFocusRef={enableTriggerRef}
        >
          <div className={financeOverlayStyles.enableFrame}>
            <header className={financeOverlayStyles.enableHeader}>
              <div className={financeOverlayStyles.enableHeaderIcon} aria-hidden="true">
                <Icon name="fund" size={26} />
              </div>
              <div className={financeOverlayStyles.enableHeaderCopy}>
                <strong>Cài đặt quỹ nhóm</strong>
                <span>Thiết lập Finance · {trip.name} · Dữ liệu TEST</span>
              </div>
              <button
                className={financeOverlayStyles.enableClose}
                type="button"
                onClick={closeForm}
                aria-label="Đóng biểu mẫu bật quỹ"
              >
                <Icon name="close" size={20} />
              </button>
            </header>
            <main className={financeOverlayStyles.enableBody}>
              <h2 ref={formHeadingRef} tabIndex={-1}>
                {labels[form.kind]}
              </h2>
              <FundCommandForm
                key={form.kind + ':' + (form.resource?.id ?? '')}
                spec={form}
                trip={trip}
                fund={fund}
                destinations={destinations.data ?? []}
                members={members}
                session={session}
                onClose={closeForm}
              />
            </main>
          </div>
        </Drawer>
      )}
      <FinanceOverlay
          open={financeOverlayOpen}
          onDismiss={() => setFinanceOverlayOpen(false)}
          section={financeSection}
          onSectionChange={setFinanceSection}
          tripName={trip.name}
          status={fund?.status ?? 'NOT_ENABLED'}
          role={holder ? 'Fund Holder' : owner ? 'Owner' : 'Member'}
          returnFocusRef={financeSettingsRef}
          context={
            <>
              <h3>Tình trạng &amp; mục tiêu</h3>
              <p>Finance {fund?.status ?? 'NOT_ENABLED'} · VND</p>
              <p>Người giữ quỹ: {fund ? name(fund.holder_user_id) : 'Chưa chỉ định'}</p>
              <p>Số dư ghi sổ: {fund ? formatVnd(fund.current_balance) : 'Chưa có dữ liệu'}</p>
            </>
          }
        >
          {financeSection === 'general' ? (
            <>
              <h3>Cấu hình quỹ chung</h3>
              <dl>
                <div><dt>Trạng thái quỹ</dt><dd>{fund?.status ?? 'NOT_ENABLED'}</dd></div>
                <div><dt>Ngân sách mục tiêu</dt><dd>{formatVnd(fund?.budget_amount ?? null)}</dd></div>
                <div><dt>Tiền tệ</dt><dd>VND</dd></div>
              </dl>
              <p>Thay đổi cấu hình dùng command hiện hữu và chỉ hoàn tất sau khi Backend xác nhận.</p>
            </>
          ) : financeSection === 'contributions' ? (
            <>
              <h3>Đợt đóng góp</h3>
              <p>Đã tải {data(requests.data?.pages).length} đợt đóng góp và {data(contributions.data?.pages).length} khoản.</p>
              <p>Report transfer không ghi sổ; Holder confirm mới tạo một ledger entry.</p>
            </>
          ) : financeSection === 'receiving' ? (
            <>
              <h3>Thông tin nhận tiền</h3>
              <p>{destinations.data?.length ?? 0} đích nhận đã tải. Consent của Holder chỉ xác nhận trách nhiệm, không xác minh tài khoản ngân hàng.</p>
            </>
          ) : (
            <FinanceUnavailable title={financeSection === 'members' ? 'Thành viên & quyền' : financeSection === 'expenses' ? 'Khoản chi' : financeSection === 'refunds' ? 'Hoàn tiền' : financeSection === 'handover' ? 'Bàn giao Fund Holder' : 'Đóng Finance'}>
              Gateway chưa có contract mutation cho vùng này. Nội dung được giữ read-only để không tạo trạng thái hoặc bút toán giả.
            </FinanceUnavailable>
          )}
        </FinanceOverlay>
      <Drawer
        open={instructionId !== null}
        label="Hướng dẫn chuyển TEST"
        side="right"
        onDismiss={() => setInstructionId(null)}
      >
        {instruction.isError ? (
          <QueryError error={instruction.error} retry={() => void instruction.refetch()} />
        ) : instruction.data ? (
          <>
            <Alert tone="warning">
              TEST — không chuyển tiền thật. Không tải QR hoặc gửi thông tin tới provider bên ngoài.
            </Alert>
            <dl>
              {[
                ['Ngân hàng', instruction.data.bank_code],
                ['Tài khoản TEST', instruction.data.account_number],
                ['Người nhận', instruction.data.recipient_name],
                ['Số tiền', formatVnd(instruction.data.amount)],
                ['Nội dung', instruction.data.reference],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <ContentState state="loading" />
        )}
      </Drawer>
    </>
  );
}
export function GatewayFundPage({ runtime }: { runtime: FundRuntime }) {
  const { tripId = '' } = useParams(),
    repo = useTripRepository();
  const query = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => repo.getTrip({ tripId, scenario: 'success', signal }),
  });
  const trip = query.data?.status === 'ready' ? query.data.data : null;
  return (
    <section className={styles.page}>
      <div className={fundStyles.breadcrumb}>
        <Link to={paths.trip(tripId)}>Chuyến đi của tôi</Link>
        <span aria-hidden="true">›</span>
        <span>{trip?.name ?? 'Chuyến đi'}</span>
        <span aria-hidden="true">›</span>
        <h1>Quỹ nhóm</h1>
      </div>
      {trip && trip.permissions.canRead && !trip.currentMembership.leftAt ? (
        <>
          <TripHero trip={trip} compact variant="landscape" />
          <FundWorkspace
            key={trip.currentMembership.userId + ':' + trip.id}
            trip={trip}
            runtime={runtime}
          />
        </>
      ) : query.isPending ? (
        <ContentState state="loading" />
      ) : (
        <ContentState
          state="error"
          error={
            query.data?.status === 'error'
              ? query.data.error
              : { code: 'PERMISSION_DENIED', correlationId: null, retryable: false }
          }
          onRetry={() => void query.refetch()}
        />
      )}
    </section>
  );
}
