import { useCallback, useState, type FormEvent } from 'react';
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
import styles from '../../shared/styles/DemoWorkspace.module.css';

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
            hint="Ví dụ VCB; dùng dữ liệu TEST, không tải QR bên ngoài."
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
          <p>
            Holder phải xác nhận phiên bản này trước khi tạo đợt thu, kể cả khi Owner và Holder là
            một người.
          </p>
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
                ? `Đang lưu: ${new Date(request.due_at).toLocaleString('vi-VN', { timeZone: trip.timezone })}. Để trống giữ nguyên; API chưa hỗ trợ xóa hạn.`
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
                      {d.account_name ?? d.id.slice(0, 8)} · v{d.version}
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
          Xác nhận trách nhiệm với đúng phiên bản đích nhận v{resource?.version}. Đây không phải xác
          minh ngân hàng.
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
  const [instructionId, setInstructionId] = useState<string | null>(null);
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
  const blocked =
    op.busy ||
    unresolved(op) ||
    trip.archivedAt !== null ||
    (fund !== null && fund.status !== 'OPEN');
  const open = (kind: CommandKind, resource?: FormSpec['resource']) =>
    setForm({
      kind,
      resource,
      versions: {
        ...(fund ? { expected_finance_version: fund.finance_version } : {}),
        ...(resource ? { expected_version: resource.version } : {}),
      },
    });
  const data = <T extends { id: string }>(pages: { items: T[] }[] | undefined): T[] => [
    ...new Map((pages?.flatMap((p) => p.items) ?? []).map((row) => [row.id, row])).values(),
  ];
  return (
    <>
      <OperationStatus
        session={session}
        onReenter={() => {
          const i = op.intent;
          if (i)
            setForm({
              kind: i.kind,
              recovery: true,
              versions: i.versions,
              resource: destinations.data?.find((d) => d.id === i.resourceId),
            });
        }}
      />
      <div className={styles.actions}>
        <Button variant="outline" onClick={refresh}>
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
      {fundQuery.isError ? (
        <QueryError error={fundQuery.error} retry={() => void fundQuery.refetch()} />
      ) : fundQuery.isPending ? (
        <ContentState state="loading" />
      ) : !fund ? (
        <section className={styles.panel}>
          <h2>Chuyến đi chưa bật quỹ</h2>
          <p>
            Quyền đọc chuyến đi đã được xác nhận. Owner chọn một Holder đang hoạt động và nhập đích
            nhận TEST.
          </p>
          {owner && (
            <Button disabled={blocked || !members.length} onClick={() => open('enable')}>
              Bật quỹ TEST
            </Button>
          )}
        </section>
      ) : (
        <>
          <section className={styles.panel} aria-label="Trạng thái quỹ thật">
            <h2>Quỹ nhóm · {fund.status}</h2>
            <p>TEST · Chỉ ghi nhận thủ công, không chuyển tiền thật.</p>
            <p>
              Holder: {name(fund.holder_user_id)} · {owner ? 'Bạn là Owner. ' : ''}
              {holder ? 'Bạn là Holder.' : ''} · Finance v{fund.finance_version}
            </p>
            {fund.status !== 'OPEN' && (
              <Alert>
                Quỹ đang đóng/đã đóng: chỉ đọc. Writer closure, refund và expense nằm sau demo1.
              </Alert>
            )}
            <div className={styles.grid}>
              {[
                ['Ngân sách', fund.budget_amount],
                ['Số dư ghi sổ', fund.current_balance],
                ['Đang giữ cho hoàn dư', fund.reserved_refund],
                ['Số dư khả dụng', fund.available_balance],
              ].map(([label, value]) => (
                <div key={label}>
                  <p>{label}</p>
                  <strong className={styles.money}>{formatVnd(value ?? null)}</strong>
                </div>
              ))}
            </div>
            {owner && (
              <div className={styles.actions}>
                <Button disabled={blocked} onClick={() => open('budget')}>
                  Sửa ngân sách
                </Button>
                <Button disabled={blocked} onClick={() => open('destination-create')}>
                  Thêm đích nhận TEST
                </Button>
              </div>
            )}
          </section>
          <section className={styles.panel} aria-label="Đích nhận">
            <h2>Đích nhận TEST</h2>
            {destinations.isError ? (
              <QueryError error={destinations.error} retry={() => void destinations.refetch()} />
            ) : destinations.isPending ? (
              <ContentState state="loading" />
            ) : (
              <ul className={styles.list}>
                {destinations.data.map((d) => (
                  <li key={d.id}>
                    <strong>
                      {d.destination_type} · v{d.version} · {d.active ? 'Đang hoạt động' : 'Đã tắt'}
                    </strong>
                    <p>
                      {d.confirmed_by_holder_at
                        ? 'Holder đã xác nhận phiên bản này'
                        : 'Chưa được Holder xác nhận'}
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
                        <Button disabled={blocked} onClick={() => open('destination-confirm', d)}>
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
            <h2>Đợt thu</h2>
            {owner && (
              <Button
                disabled={
                  blocked ||
                  !destinations.data?.some(
                    (d) => d.active && d.confirmed_by_holder_at && d.destination_type === 'VIETQR',
                  )
                }
                onClick={() => open('request-create')}
              >
                Tạo đợt thu
              </Button>
            )}
            {requests.isError && (
              <QueryError error={requests.error} retry={() => void requests.refetch()} />
            )}
            <ul className={styles.list}>
              {data(requests.data?.pages).map((r) => (
                <li key={r.id}>
                  <strong>
                    {r.title} · {r.status}
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
                disabled={requests.isFetchingNextPage}
                onClick={() => void requests.fetchNextPage()}
              >
                Tải thêm đợt thu
              </Button>
            )}
          </section>
          <section className={styles.panel} aria-label="Các khoản đóng góp">
            <h2>Các khoản đóng góp</h2>
            {contributions.isError && (
              <QueryError error={contributions.error} retry={() => void contributions.refetch()} />
            )}
            <ul className={styles.list}>
              {data(contributions.data?.pages).map((c) => (
                <li key={c.id} data-testid={'contribution-' + c.member_user_id}>
                  <strong>
                    {name(c.member_user_id)} · {formatVnd(c.amount)}
                  </strong>
                  <p>
                    {statusLabels[c.status]} · v{c.version}
                  </p>
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
                disabled={contributions.isFetchingNextPage}
                onClick={() => void contributions.fetchNextPage()}
              >
                Tải thêm khoản đóng
              </Button>
            )}
            <p className={styles.metadata}>
              Danh sách có phân trang. Không suy tổng quỹ từ các khoản đã tải. Owner không có quyền
              báo chuyển hoặc xác nhận thay người khác.
            </p>
          </section>
          <section className={styles.panel} aria-label="Ledger">
            <h2>Sổ quỹ (ledger)</h2>
            {ledger.isError && (
              <QueryError error={ledger.error} retry={() => void ledger.refetch()} />
            )}
            <ul className={styles.list}>
              {data(ledger.data?.pages).map((row) => (
                <li key={row.id}>
                  <strong>
                    #{row.sequence} · {row.direction} · {row.transaction_type} ·{' '}
                    {formatVnd(row.amount)}
                  </strong>
                  <p>Số dư sau bút toán: {formatVnd(row.balance_after)}</p>
                </li>
              ))}
            </ul>
            {ledger.hasNextPage && (
              <Button
                disabled={ledger.isFetchingNextPage}
                onClick={() => void ledger.fetchNextPage()}
              >
                Tải thêm ledger
              </Button>
            )}
            <p>
              Chỉ đọc ledger đã ghi trên server. Chi quỹ, hoàn dư, đảo bút toán và đóng quỹ chưa mở
              trên Web demo1.
            </p>
          </section>
        </>
      )}
      <Drawer
        open={form !== null}
        label={form ? labels[form.kind] : 'Thao tác quỹ'}
        side="right"
        onDismiss={() => setForm(null)}
      >
        {form && (
          <FundCommandForm
            key={form.kind + ':' + (form.resource?.id ?? '')}
            spec={form}
            trip={trip}
            fund={fund}
            destinations={destinations.data ?? []}
            members={members}
            session={session}
            onClose={() => setForm(null)}
          />
        )}
      </Drawer>
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
      <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
      <h1>Quỹ nhóm</h1>
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
