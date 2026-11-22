import { useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripRepository } from '../trips/repositories/repository-context';
import { TripHero } from '../trips/components/TripHero';
import { useFundRepository } from './repositories/fund-context';
import {
  fundScenarios,
  isMoneyVnd,
  type ClosureStatus,
  type ContributionStatus,
  type ExpenseStatus,
  type FundScenario,
  type FundViewModel,
  type RefundStatus,
} from './model/fund';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import type { DomainError } from '../../shared/types/result';
import styles from './FundPage.module.css';
import { FinanceGoal, FinanceTransactionPanel, type FinanceTransactionRow } from './components/FinanceDesktop';
import { FinanceOverlay, type FinanceSection } from './components/FinanceOverlay';
import { GatewayFundPage } from './GatewayFundPage';

/** Keep Finance decimal strings as strings; null is an intentional unknown value. */
export const formatMoneyVnd = (value: string | null | undefined) => {
  if (value == null) return '—';
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return '—';
  const whole = normalized.replace(/^0+(?=\d)/, '');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
};

const date = (value: string | null) =>
  value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '—';

const contributionLabel: Record<ContributionStatus, string> = {
  PENDING: 'Đang chờ',
  TRANSFER_REPORTED: 'Đã báo chuyển khoản',
  CONFIRMED: 'Đã xác nhận',
  WAIVED: 'Đã miễn',
  CANCELLED: 'Đã hủy',
  REVERSED: 'Đã đảo ngược',
};
const expenseLabel: Record<ExpenseStatus, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Bị từ chối',
  REVERSED: 'Đã đảo ngược',
};
const refundLabel: Record<RefundStatus, string> = {
  PENDING: 'Đang chờ',
  HOLDER_REPORTED: 'Người giữ quỹ đã báo',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  REVERSED: 'Đã đảo ngược',
};

const closureLabel: Record<ClosureStatus, string> = {
  PENDING_CONFIRMATIONS: 'Đang chờ xác nhận',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã hủy',
};

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';
const contributionTone: Record<ContributionStatus, StatusTone> = {
  PENDING: 'warning',
  TRANSFER_REPORTED: 'warning',
  CONFIRMED: 'success',
  WAIVED: 'neutral',
  CANCELLED: 'neutral',
  REVERSED: 'danger',
};
const expenseTone: Record<ExpenseStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  REVERSED: 'danger',
};
const refundTone: Record<RefundStatus, StatusTone> = {
  PENDING: 'warning',
  HOLDER_REPORTED: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
  REVERSED: 'danger',
};
const fundStatusLabel = (status: FundViewModel['fund']['status']) =>
  status === 'OPEN' ? 'Đang mở' : status === 'CLOSING' ? 'Đang đóng' : 'Đã đóng';
/** Disabled preview actions keep their reason in the native tooltip. */
const previewActionReason = 'Chưa khả dụng trong bản xem trước';

/** Decorative initial derived from the display name already shown beside it. */
const initial = (name: string | null) => name?.trim().charAt(0).toLocaleUpperCase('vi-VN') || '·';

function ErrorState({ error, retry }: { error: DomainError; retry: () => void }) {
  return (
    <ContentState
      state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
      error={error}
      headingLevel={2}
      onRetry={retry}
    />
  );
}

function FundWorkspace({ data }: { data: FundViewModel }) {
  const [tab, setTab] = useState<'expenses' | 'contributions' | 'outside' | 'refunds'>('expenses');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('2026-10-12');
  const [note, setNote] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [financeOverlayOpen, setFinanceOverlayOpen] = useState(false);
  const [financeSection, setFinanceSection] = useState<FinanceSection>('general');
  const financeSettingsRef = useRef<HTMLButtonElement>(null);
  const readOnly = data.fund.status !== 'OPEN' || !data.permissions.canCreateExpense;
  const submitDraft = () => {
    if (!category || !isMoneyVnd(amount) || amount === '0') {
      setDraftMessage('Chọn hạng mục và nhập số tiền VND là số nguyên dương.');
      return;
    }
    setDraftMessage('Bản nháp hợp lệ · Chưa gửi, chưa trừ số dư.');
  };
  const closure = data.closure;
  const transactionRows: FinanceTransactionRow[] = data.ledger.map((row) => ({
    id: row.id,
    type: row.transactionType,
    title: row.presentation.title,
    timeLabel: date(row.createdAt),
    memberId: row.actorUserId,
    memberName: row.presentation.actor.displayName,
    actorName: row.presentation.actor.displayName ?? 'Chưa xác định',
    amount: row.amount,
    direction: row.direction,
    sequence: row.sequence,
    balanceAfter: row.balanceAfter,
    reason: row.reason,
  }));
  const statusIcon = data.fund.status === 'OPEN' ? 'fund' : data.fund.status === 'CLOSING' ? 'hourglass' : 'lock';
  return (
    <>
      <section className={styles.stateBar} aria-label="Trạng thái quỹ" data-status={data.fund.status}>
        <span className={styles.bannerIcon} aria-hidden="true"><Icon name={statusIcon} size={22} /></span>
        <div className={styles.bannerCopy}>
          <div className={styles.bannerTitle}>
            <h2>Quỹ nhóm · {fundStatusLabel(data.fund.status)}</h2>
          </div>
          <p>{data.viewerRole === 'HOLDER' ? 'Bạn là người giữ quỹ.' : 'Bạn là thành viên của quỹ này.'}</p>
        </div>
        <div className={styles.bannerActions}>
          <Button variant="outline" disabled title={previewActionReason} icon={<Icon name="lock" size={17} />}>Bắt đầu đóng quỹ</Button>
          <Button variant="outline" disabled title={previewActionReason} icon={<Icon name="members" size={17} />}>Thông tin giữ quỹ</Button>
        </div>
      </section>
      {closure && (
        <section className={styles.closure} aria-label="Trạng thái đóng quỹ" data-closed={closure.closedAt ? 'true' : 'false'}>
          <span className={styles.closureIcon} aria-hidden="true"><Icon name={closure.closedAt ? 'lock' : 'hourglass'} size={18} /></span>
          <div><strong>Đóng quỹ · {closureLabel[closure.status]}</strong>{closure.closedAt && <span>Ngày {date(closure.closedAt)}</span>}</div>
          {closure.blockers.length ? <ul>{closure.blockers.map((blocker) => <li key={blocker.code}>{blocker.label}{blocker.amount ? ` · ${formatMoneyVnd(blocker.amount)}` : ''}</li>)}</ul> : <span className={styles.clear}>Không còn khoản cần xử lý</span>}
        </section>
      )}
      <section className={styles.metrics} aria-label="Tổng hợp quỹ">
        <div data-tone="budget"><span className={styles.metricIcon} aria-hidden="true"><Icon name="tag" size={22} /></span><p><span>Ngân sách mục tiêu</span><strong>{formatMoneyVnd(data.fund.budgetAmount)}</strong></p></div>
        <div data-tone="contributions"><span className={styles.metricIcon} aria-hidden="true"><Icon name="members" size={22} /></span><p><span>Đóng góp đã xác nhận</span><strong className={styles.green}>{formatMoneyVnd(data.totals.confirmedContributions)}</strong></p></div>
        <div data-tone="expenses"><span className={styles.metricIcon} aria-hidden="true"><Icon name="receipt" size={22} /></span><p><span>Đã chi từ quỹ</span><strong className={styles.blue}>{formatMoneyVnd(data.totals.confirmedExpenses)}</strong></p></div>
        <div data-tone="available"><span className={styles.metricIcon} aria-hidden="true"><Icon name="fund" size={22} /></span><p><span>Khả dụng</span><strong className={styles.teal}>{formatMoneyVnd(data.fund.availableBalance)}</strong><small className={styles.metricHint}>Giữ hoàn dư {formatMoneyVnd(data.fund.reservedRefund)}</small></p></div>
      </section>
      <div className={styles.moneyNote}><Icon name="info" size={16} /> Wolfari ghi nhận và đối chiếu, không giữ hoặc chuyển tiền thật.</div>
      <div className={styles.workspace}>
        <section className={styles.ledger} aria-label="Sổ quỹ">
          <div className={styles.tabs} role="tablist" aria-label="Các vùng quỹ">
            {([
              ['expenses', 'Chi quỹ'],
              ['contributions', 'Đóng góp'],
              ['outside', 'Ngoài quỹ'],
              ['refunds', 'Hoàn dư'],
            ] as const).map(([value, label]) => (
              <button key={value} id={`fund-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls="fund-tabpanel" tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(event) => {
                const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                if (!tabs?.length) return;
                const index = Array.from(tabs).indexOf(event.currentTarget);
                const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
                    : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
                if (next === null) return;
                event.preventDefault();
                tabs[next]?.focus();
                tabs[next]?.click();
              }}>{label}</button>
            ))}
          </div>
          {tab === 'expenses' ? (
            <div id="fund-tabpanel" role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>
              <div className={styles.table} role="table" aria-label="Khoản chi từ quỹ">
              <div className={styles.tableHead} role="row"><span role="columnheader">#</span><span role="columnheader">Hạng mục</span><span role="columnheader">Số tiền</span><span role="columnheader">Người thực hiện</span><span role="columnheader">Ngày</span><span role="columnheader">Trạng thái</span></div>
              {data.expenses.map((item, index) => <div className={styles.row} role="row" key={item.id}><span role="cell">{index + 1}</span><strong role="cell">{item.title}</strong><b role="cell">{formatMoneyVnd(item.amount)}</b><span className={styles.person} role="cell"><i aria-hidden="true">{initial(item.presentation.displayName)}</i>{item.presentation.displayName ?? 'Thành viên'}</span><span role="cell">{date(item.paidAt)}</span><em role="cell" data-tone={expenseTone[item.status]}>{expenseLabel[item.status]}</em></div>)}
            </div>
            </div>
          ) : tab === 'contributions' ? (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.contributions.map((item) => <li key={item.id}><strong>{item.presentation.displayName ?? 'Thành viên'}</strong><span>{formatMoneyVnd(item.amount)}</span><em data-tone={contributionTone[item.status]}>{contributionLabel[item.status]}</em></li>)}</ul>
          ) : tab === 'outside' ? (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.notes.map((item) => <li key={item.id}><strong>{item.description}</strong><span>{formatMoneyVnd(item.amount)}</span><em data-tone="neutral">Ngoài sổ quỹ</em></li>)}</ul>
          ) : (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.refunds.map((item) => <li key={item.id}><strong>{item.reason ?? 'Hoàn dư'}</strong><span>{formatMoneyVnd(item.amount)}</span><em data-tone={refundTone[item.status]}>{refundLabel[item.status]}</em></li>)}</ul>
          )}
          <div className={styles.balanceNote}>Số dư ghi sổ {formatMoneyVnd(data.fund.currentBalance)} − đang giữ {formatMoneyVnd(data.fund.reservedRefund)} = khả dụng {formatMoneyVnd(data.fund.availableBalance)}. Đề nghị chưa xác nhận chưa được ghi sổ.{data.nextCursor ? ' Còn giao dịch cũ hơn chưa tải.' : ''}</div>
        </section>
        <section className={styles.formPanel} aria-labelledby="fund-draft-title">
          <div className={styles.formHeader}>
            <span className={styles.formIcon} aria-hidden="true"><Icon name="receipt" size={22} /></span>
            <div>
              <h2 id="fund-draft-title">Đề nghị chi từ quỹ</h2>
              <p className={styles.formHint}>Người giữ quỹ xác nhận trước khi ghi sổ.</p>
            </div>
          </div>
          <Select label="Hạng mục" value={category} onChange={(e) => setCategory(e.target.value)} disabled={readOnly}><option value="">Chọn hạng mục</option><option value="hotel">Khách sạn</option><option value="transport">Di chuyển</option><option value="food">Ăn uống</option></Select>
          <div className={styles.twoFields}>
            <Input label="Số tiền (VND)" aria-label="Số tiền (VND)" inputMode="numeric" placeholder="Nhập số tiền" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={readOnly} leadingIcon={<span className={styles.fieldChip}><Icon name="fund" size={18} /></span>} />
            <Input label="Ngày chi" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={readOnly} leadingIcon={<span className={styles.fieldChip}><Icon name="calendar" size={18} /></span>} />
          </div>
          <Input label="Ghi chú" placeholder="Nhập ghi chú..." value={note} onChange={(e) => setNote(e.target.value)} disabled={readOnly} leadingIcon={<span className={styles.fieldChip}><Icon name="edit" size={18} /></span>} />
          {draftMessage && <Alert live>{draftMessage}</Alert>}
          <Button onClick={submitDraft} disabled={readOnly} icon={<Icon name="check" size={17} />}>Kiểm tra bản nháp</Button>
        </section>
      </div>
      <FinanceGoal
        budget={data.fund.budgetAmount}
        amount={data.fund.currentBalance}
        format={formatMoneyVnd}
        onSettings={() => setFinanceOverlayOpen(true)}
        settingsRef={financeSettingsRef}
      />
      <FinanceTransactionPanel
        rows={transactionRows}
        format={formatMoneyVnd}
      />
      <FinanceOverlay
        open={financeOverlayOpen}
        onDismiss={() => setFinanceOverlayOpen(false)}
        section={financeSection}
        onSectionChange={setFinanceSection}
        tripName="Đà Nẵng 3N2Đ"
        status={data.fund.status}
        role={data.viewerRole === 'HOLDER' ? 'Người giữ quỹ' : 'Thành viên'}
        returnFocusRef={financeSettingsRef}
        context={<><h3>Tình trạng &amp; mục tiêu</h3><p>Quỹ {fundStatusLabel(data.fund.status).toLocaleLowerCase('vi-VN')} · VND</p><p>Người giữ quỹ: {data.viewerRole === 'HOLDER' ? 'Bạn' : 'Thành viên khác'}</p></>}
      >
        {financeSection === 'general' ? <><h3>Cấu hình quỹ chung</h3><p>Ngân sách mục tiêu {formatMoneyVnd(data.fund.budgetAmount)}.</p></> : financeSection === 'contributions' ? <><h3>Đợt đóng góp</h3><p>{data.contributions.length} khoản đóng góp.</p></> : <CapabilityNote tone="warning">Phần này chưa khả dụng; chỉ xem, không tạo giao dịch.</CapabilityNote>}
      </FinanceOverlay>
    </>
  );
}

export function FundPage() {
  const repository = useFundRepository();
  return repository.runtime ? <GatewayFundPage runtime={repository.runtime} /> : <FixtureFundPage />;
}
function FixtureFundPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository();
  const repository = useFundRepository();
  const [scenario, setScenario] = useState<FundScenario>('success');
  const tripQuery = useQuery({ queryKey: ['trip', 'detail', tripId, 'success'], queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }) });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed = !!trip && trip.id === tripId && trip.permissions.canRead && trip.currentMembership.leftAt === null;
  const fundQuery = useQuery({ queryKey: ['fund', tripId, scenario], queryFn: ({ signal }) => repository.getFund({ tripId, scenario, signal }), enabled: allowed });
  const result = fundQuery.data;
  const fund = result?.status === 'ready' ? result.data : null;
  const error = tripQuery.isError || fundQuery.isError ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true } : tripQuery.data?.status === 'error' ? tripQuery.data.error : trip && !allowed ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false } : result?.status === 'error' ? result.error : null;
  return (
    <section className={styles.page} data-flow="fund-preview" data-node-id="768:7778">
      <PageBreadcrumb
        className={styles.breadcrumb}
        items={[{ label: 'Tổng quan chuyến đi', to: paths.trip(tripId) }]}
        current="Quỹ nhóm"
        mobile={<div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Chuyến đi của tôi</Link><span aria-hidden="true">›</span><span>{trip?.name ?? 'Chuyến đi'}</span><span aria-hidden="true">›</span><h1>Quỹ nhóm</h1></div>}
      />
      {trip && <TripHero trip={trip} compact variant="landscape" />}
      {error ? <ErrorState error={error} retry={() => { void tripQuery.refetch(); void fundQuery.refetch(); }} /> : tripQuery.isPending || (allowed && fundQuery.isPending) ? <ContentState state="loading" headingLevel={2} /> : fund ? <FundWorkspace data={fund} /> : <ContentState state="empty" headingLevel={2} />}
      {previewEnabled && <details className="preview" data-preview="fund"><summary>Fund preview · Dữ liệu minh họa</summary><Select label="Trạng thái quỹ" value={scenario} onChange={(e) => { const next = fundScenarios.find((item) => item === e.target.value); if (next) setScenario(next); }}>{fundScenarios.map((item) => <option key={item}>{item}</option>)}</Select>{fund && <p>Finance version {fund.fund.financeVersion} · {fund.viewerRole} · {fund.environment} fixture</p>}</details>}
    </section>
  );
}
