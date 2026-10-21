import { useState } from 'react';
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
  type ContributionStatus,
  type ExpenseStatus,
  type FundScenario,
  type FundViewModel,
  type RefundStatus,
} from './model/fund';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import type { DomainError } from '../../shared/types/result';
import styles from './FundPage.module.css';

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
  HOLDER_REPORTED: 'Holder đã báo',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  REVERSED: 'Đã đảo ngược',
};

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
  const [tab, setTab] = useState<'expenses' | 'contributions' | 'outside' | 'refunds' | 'history'>('expenses');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('2026-10-12');
  const [note, setNote] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const readOnly = data.fund.status !== 'OPEN' || !data.permissions.canCreateExpense;
  const submitDraft = () => {
    if (!category || !isMoneyVnd(amount) || amount === '0') {
      setDraftMessage('Chọn hạng mục và nhập số tiền VND là số nguyên dương.');
      return;
    }
    setDraftMessage('Bản nháp hợp lệ · Chưa gửi, chưa trừ số dư.');
  };
  const closure = data.closure;
  return (
    <>
      <section className={styles.stateBar} aria-label="Trạng thái quỹ">
        <div>
          <span className={styles.environment}>{data.environment} · {data.fund.status}</span>
          <h2>Quỹ nhóm · {data.fund.status === 'OPEN' ? 'Đang mở' : data.fund.status === 'CLOSING' ? 'Đang đóng' : 'Đã đóng'}</h2>
          <p>{data.viewerRole === 'HOLDER' ? 'Bạn là Fund Holder.' : 'Bạn là thành viên của quỹ này.'} Dữ liệu chỉ là bản xem trước, không giữ hoặc chuyển tiền thật.</p>
        </div>
        <span className={styles.holder}>{data.viewerRole}</span>
        <Button variant="outline" disabled aria-describedby="fund-command-note">Bắt đầu đóng quỹ</Button>
        <Button variant="outline" disabled aria-describedby="fund-command-note">Thông tin giữ quỹ</Button>
        <CapabilityNote id="fund-command-note" tone="warning">
          Các thao tác Finance đang bị vô hiệu hóa trong bản xem trước; chưa có Gateway command.
        </CapabilityNote>
      </section>
      {closure && (
        <section className={styles.closure} aria-label="Trạng thái đóng quỹ">
          <div><strong>Closure: {closure.status}</strong><span>{closure.closedAt ? `Hoàn tất ${date(closure.closedAt)}` : 'Chờ đủ xác nhận'}</span></div>
          {closure.blockers.length ? <ul>{closure.blockers.map((blocker) => <li key={blocker.code}>{blocker.label}{blocker.amount ? ` · ${formatMoneyVnd(blocker.amount)}` : ''}</li>)}</ul> : <span className={styles.clear}>Không còn blocker</span>}
        </section>
      )}
      <section className={styles.metrics} aria-label="Tổng hợp quỹ">
        <div><span>Ngân sách mục tiêu</span><strong>{formatMoneyVnd(data.fund.budgetAmount)}</strong></div>
        <div><span>Đóng góp đã xác nhận</span><strong className={styles.green}>{formatMoneyVnd(data.totals.confirmedContributions)}</strong></div>
        <div><span>Đã chi từ quỹ</span><strong className={styles.blue}>{formatMoneyVnd(data.totals.confirmedExpenses)}</strong></div>
        <div><span>Khả dụng · đang giữ {formatMoneyVnd(data.fund.reservedRefund)}</span><strong className={styles.teal}>{formatMoneyVnd(data.fund.availableBalance)}</strong></div>
      </section>
      <div className={styles.workspace}>
        <section className={styles.ledger} aria-label="Sổ quỹ">
          <div className={styles.tabs} role="tablist" aria-label="Các vùng quỹ">
            {([
              ['expenses', 'Chi quỹ'],
              ['contributions', 'Đóng góp'],
              ['outside', 'Ngoài quỹ'],
              ['refunds', 'Hoàn dư'],
              ['history', 'Lịch sử'],
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
            <div id="fund-tabpanel" className={styles.table} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>
              <div className={styles.tableHead} role="row"><span>#</span><span>Hạng mục</span><span>Số tiền</span><span>Người thực hiện</span><span>Ngày</span><span>Trạng thái</span></div>
              {data.expenses.map((item, index) => <div className={styles.row} role="row" key={item.id}><span>{index + 1}</span><strong>{item.title}</strong><b>{formatMoneyVnd(item.amount)}</b><span>{item.presentation.displayName ?? 'Thành viên'}</span><span>{date(item.paidAt)}</span><em>{expenseLabel[item.status]}</em></div>)}
            </div>
          ) : tab === 'contributions' ? (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.contributions.map((item) => <li key={item.id}><strong>{item.presentation.displayName ?? 'Thành viên'}</strong><span>{formatMoneyVnd(item.amount)}</span><em>{contributionLabel[item.status]}</em></li>)}</ul>
          ) : tab === 'outside' ? (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.notes.map((item) => <li key={item.id}><strong>{item.description}</strong><span>{formatMoneyVnd(item.amount)}</span><em>Ngoài sổ quỹ</em></li>)}</ul>
          ) : tab === 'refunds' ? (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.refunds.map((item) => <li key={item.id}><strong>{item.reason ?? 'Hoàn dư'}</strong><span>{formatMoneyVnd(item.amount)}</span><em>{refundLabel[item.status]}</em></li>)}</ul>
          ) : (
            <ul id="fund-tabpanel" className={styles.simpleList} role="tabpanel" aria-labelledby={`fund-tab-${tab}`} tabIndex={0}>{data.ledger.map((item) => <li key={item.id}><strong>#{item.sequence} · {item.presentation.title}</strong><span>{item.direction} {formatMoneyVnd(item.amount)}</span><em>Số dư {formatMoneyVnd(item.balanceAfter)}</em></li>)}</ul>
          )}
          <div className={styles.balanceNote}>Số dư ghi sổ {formatMoneyVnd(data.fund.currentBalance)} − đang giữ {formatMoneyVnd(data.fund.reservedRefund)} = khả dụng {formatMoneyVnd(data.fund.availableBalance)}. Đề nghị chưa xác nhận chưa được ghi sổ. {data.nextCursor ? `Còn trang ledger tiếp theo: ${data.nextCursor}` : ''}</div>
        </section>
        <section className={styles.formPanel} aria-labelledby="fund-draft-title">
          <h2 id="fund-draft-title">Đề nghị chi từ quỹ</h2>
          <p className={styles.formHint}>Fund Holder xác nhận trước khi ghi sổ.</p>
          <CapabilityNote tone="warning">Bản nháp chỉ kiểm tra dữ liệu trên trình duyệt; chưa gửi request và chưa ghi sổ.</CapabilityNote>
          <Select label="Hạng mục" value={category} onChange={(e) => setCategory(e.target.value)} disabled={readOnly}><option value="">Chọn hạng mục</option><option value="hotel">Khách sạn</option><option value="transport">Di chuyển</option><option value="food">Ăn uống</option></Select>
          <Input label="Số tiền (VND)" aria-label="Số tiền (VND)" inputMode="numeric" placeholder="Nhập số tiền" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={readOnly} />
          <div className={styles.twoFields}><Input label="Ngày chi" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={readOnly} /><Input label="Ghi chú" placeholder="Nhập ghi chú..." value={note} onChange={(e) => setNote(e.target.value)} disabled={readOnly} /></div>
          <div className={styles.receipt}>Bản nháp · Chưa gửi, chưa trừ số dư</div>
          {draftMessage && <Alert live>{draftMessage}</Alert>}
          <Button onClick={submitDraft} disabled={readOnly}>Kiểm tra bản nháp</Button>
        </section>
      </div>
    </>
  );
}

export function FundPage() {
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
      <div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Chuyến đi của tôi</Link><span aria-hidden="true">›</span><span>{trip?.name ?? 'Chuyến đi'}</span><span aria-hidden="true">›</span><h1>Quỹ nhóm</h1></div>
      {trip && <TripHero trip={trip} compact variant="landscape" />}
      {error ? <ErrorState error={error} retry={() => { void tripQuery.refetch(); void fundQuery.refetch(); }} /> : tripQuery.isPending || (allowed && fundQuery.isPending) ? <ContentState state="loading" headingLevel={2} /> : fund ? <FundWorkspace data={fund} /> : <ContentState state="empty" headingLevel={2} />}
      {previewEnabled && <details className="preview" data-preview="fund"><summary>Fund preview · Dữ liệu minh họa</summary><Select label="Trạng thái quỹ" value={scenario} onChange={(e) => { const next = fundScenarios.find((item) => item === e.target.value); if (next) setScenario(next); }}>{fundScenarios.map((item) => <option key={item}>{item}</option>)}</Select>{fund && <p>Finance version {fund.fund.financeVersion} · {fund.viewerRole} · {fund.environment} fixture</p>}</details>}
    </section>
  );
}
