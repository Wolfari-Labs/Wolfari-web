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
  type ContributionStatus,
  type ExpenseStatus,
  type FundScenario,
  type FundViewModel,
  type RefundStatus,
} from './model/fund';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import type { DomainError } from '../../shared/types/result';
import styles from './FundPage.module.css';
import { FinanceTransactionPanel, type FinanceTransactionRow } from './components/FinanceDesktop';
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

const pendingLabels: Record<ContributionStatus | ExpenseStatus | RefundStatus, string> = {
  PENDING: 'Đang chờ',
  TRANSFER_REPORTED: 'Đã báo chuyển khoản',
  CONFIRMED: 'Đã xác nhận',
  WAIVED: 'Đã miễn',
  CANCELLED: 'Đã hủy',
  REVERSED: 'Đã đảo bút toán',
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Chờ xác nhận',
  REJECTED: 'Bị từ chối',
  HOLDER_REPORTED: 'Người giữ quỹ đã báo',
};

const fundStatusLabel = (status: FundViewModel['fund']['status']) =>
  status === 'OPEN' ? 'Đang mở' : status === 'CLOSING' ? 'Đang đóng' : 'Đã đóng';
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
  return (
    <>
      <section className={styles.metrics} aria-label="Tổng hợp quỹ">
        <div data-tone="budget">
          <span className={styles.metricIcon} aria-hidden="true">
            <Icon name="tag" size={22} />
          </span>
          <p>
            <span>Ngân sách mục tiêu</span>
            <strong>{formatMoneyVnd(data.fund.budgetAmount)}</strong>
          </p>
        </div>
        <div data-tone="contributions">
          <span className={styles.metricIcon} aria-hidden="true">
            <Icon name="members" size={22} />
          </span>
          <p>
            <span>Đóng góp đã xác nhận</span>
            <strong className={styles.green}>
              {formatMoneyVnd(data.totals.confirmedContributions)}
            </strong>
          </p>
        </div>
        <div data-tone="expenses">
          <span className={styles.metricIcon} aria-hidden="true">
            <Icon name="receipt" size={22} />
          </span>
          <p>
            <span>Đã chi từ quỹ</span>
            <strong className={styles.blue}>{formatMoneyVnd(data.totals.confirmedExpenses)}</strong>
          </p>
        </div>
        <div data-tone="available">
          <span className={styles.metricIcon} aria-hidden="true">
            <Icon name="fund" size={22} />
          </span>
          <p>
            <span>Khả dụng</span>
            <strong className={styles.teal}>{formatMoneyVnd(data.fund.availableBalance)}</strong>
            <small className={styles.metricHint}>
              Giữ hoàn dư {formatMoneyVnd(data.fund.reservedRefund)}
            </small>
          </p>
        </div>
      </section>
      <div className={styles.workspace}>
        <div className={styles.transactionColumn}>
          <FinanceTransactionPanel
            rows={transactionRows}
            format={formatMoneyVnd}
            statusSummary={`Quỹ ${fundStatusLabel(data.fund.status).toLocaleLowerCase('vi-VN')} · ${data.viewerRole === 'HOLDER' ? 'Bạn giữ quỹ' : 'Thành viên'}`}
            onSettings={() => setFinanceOverlayOpen(true)}
            settingsRef={financeSettingsRef}
          />
        </div>
      </div>
      <FinanceOverlay
        open={financeOverlayOpen}
        onDismiss={() => setFinanceOverlayOpen(false)}
        section={financeSection}
        onSectionChange={setFinanceSection}
        tripName="Đà Nẵng 3N2Đ"
        status={data.fund.status}
        role={data.viewerRole === 'HOLDER' ? 'Người giữ quỹ' : 'Thành viên'}
        returnFocusRef={financeSettingsRef}
        context={
          <>
            <h3>Tình trạng &amp; mục tiêu</h3>
            <p>Quỹ {fundStatusLabel(data.fund.status).toLocaleLowerCase('vi-VN')} · VND</p>
            <p>Người giữ quỹ: {data.viewerRole === 'HOLDER' ? 'Bạn' : 'Thành viên khác'}</p>
          </>
        }
      >
        {financeSection === 'general' ? (
          <>
            <h3>Cấu hình quỹ chung</h3>
            <p>Ngân sách mục tiêu {formatMoneyVnd(data.fund.budgetAmount)}.</p>
          </>
        ) : financeSection === 'contributions' ? (
          <>
            <h3>Đợt đóng góp</h3>
            <p>{data.contributions.length} khoản đóng góp.</p>
            <ul className={styles.simpleList}>
              {data.contributions.map((item) => (
                <li key={item.id}>
                  <strong>{item.presentation.displayName ?? 'Thành viên'}</strong>
                  <span>{formatMoneyVnd(item.amount)}</span>
                  <em>{pendingLabels[item.status]}</em>
                </li>
              ))}
            </ul>
          </>
        ) : financeSection === 'expenses' ? (
          <section className={styles.formPanel} aria-labelledby="fund-draft-title">
            <div className={styles.formHeader}>
              <span className={styles.formIcon} aria-hidden="true">
                <Icon name="receipt" size={22} />
              </span>
              <div>
                <h3 id="fund-draft-title">Đề nghị chi từ quỹ</h3>
                <p className={styles.formHint}>Người giữ quỹ xác nhận trước khi ghi sổ.</p>
              </div>
            </div>
            <Select
              label="Hạng mục"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={readOnly}
            >
              <option value="">Chọn hạng mục</option>
              <option value="hotel">Khách sạn</option>
              <option value="transport">Di chuyển</option>
              <option value="food">Ăn uống</option>
            </Select>
            <div className={styles.twoFields}>
              <Input
                label="Số tiền (VND)"
                aria-label="Số tiền (VND)"
                inputMode="numeric"
                placeholder="Nhập số tiền"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={readOnly}
                leadingIcon={
                  <span className={styles.fieldChip}>
                    <Icon name="fund" size={18} />
                  </span>
                }
              />
              <Input
                label="Ngày chi"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                disabled={readOnly}
                leadingIcon={
                  <span className={styles.fieldChip}>
                    <Icon name="calendar" size={18} />
                  </span>
                }
              />
            </div>
            <Input
              label="Ghi chú"
              placeholder="Nhập ghi chú..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              leadingIcon={
                <span className={styles.fieldChip}>
                  <Icon name="edit" size={18} />
                </span>
              }
            />
            {draftMessage && <Alert live>{draftMessage}</Alert>}
            <Button
              onClick={submitDraft}
              disabled={readOnly}
              icon={<Icon name="check" size={17} />}
            >
              Kiểm tra bản nháp
            </Button>
          </section>
        ) : financeSection === 'notes' ? (
          <>
            <h3>Chi ngoài quỹ</h3>
            {data.notes.length ? (
              <ul className={styles.simpleList}>
                {data.notes.map((item) => (
                  <li key={item.id}>
                    <strong>{item.description}</strong>
                    <span>{formatMoneyVnd(item.amount)}</span>
                    <em>Ngoài sổ quỹ</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Chưa có khoản chi ngoài quỹ.</p>
            )}
          </>
        ) : financeSection === 'refunds' ? (
          <>
            <h3>Hoàn tiền</h3>
            {data.refunds.length ? (
              <ul className={styles.simpleList}>
                {data.refunds.map((item) => (
                  <li key={item.id}>
                    <strong>{item.reason ?? item.presentation.displayName ?? 'Hoàn dư'}</strong>
                    <span>{formatMoneyVnd(item.amount)}</span>
                    <em>{pendingLabels[item.status]}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Chưa có khoản hoàn tiền.</p>
            )}
          </>
        ) : financeSection === 'members' ? (
          <>
            <h3>Thông tin giữ quỹ</h3>
            <p>Vai trò của bạn: {data.viewerRole === 'HOLDER' ? 'Người giữ quỹ' : 'Thành viên'}.</p>
            <p>Người giữ quỹ xác nhận các khoản chi trước khi ghi sổ.</p>
            <Link to={paths.trip(data.tripId) + '/members'}>Xem thành viên chuyến đi</Link>
          </>
        ) : financeSection === 'closure' ? (
          <>
            <h3>Điều kiện đóng quỹ</h3>
            <p>Trạng thái: {fundStatusLabel(data.fund.status)}.</p>
            {data.blockers.length ? (
              <ul className={styles.simpleList}>
                {data.blockers.map((blocker) => (
                  <li key={blocker.code}>
                    <strong>{blocker.label}</strong>
                    <span>{formatMoneyVnd(blocker.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Không còn khoản cần xử lý.</p>
            )}
            <p>Bản xem trước chỉ hiển thị điều kiện, không thay đổi trạng thái quỹ.</p>
          </>
        ) : (
          <CapabilityNote tone="warning">
            Bản xem trước chưa có dữ liệu cho phần này. Mở một chuyến đi dùng dữ liệu hệ thống để
            thực hiện thao tác quỹ.
          </CapabilityNote>
        )}
      </FinanceOverlay>
    </>
  );
}

export function FundPage() {
  const repository = useFundRepository();
  return repository.runtime ? (
    <GatewayFundPage runtime={repository.runtime} />
  ) : (
    <FixtureFundPage />
  );
}
function FixtureFundPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository();
  const repository = useFundRepository();
  const [scenario, setScenario] = useState<FundScenario>('success');
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed =
    !!trip &&
    trip.id === tripId &&
    trip.permissions.canRead &&
    trip.currentMembership.leftAt === null;
  const fundQuery = useQuery({
    queryKey: ['fund', tripId, scenario],
    queryFn: ({ signal }) => repository.getFund({ tripId, scenario, signal }),
    enabled: allowed,
  });
  const result = fundQuery.data;
  const fund = result?.status === 'ready' ? result.data : null;
  const error =
    tripQuery.isError || fundQuery.isError
      ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
      : tripQuery.data?.status === 'error'
        ? tripQuery.data.error
        : trip && !allowed
          ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
          : result?.status === 'error'
            ? result.error
            : null;
  return (
    <section className={styles.page} data-flow="fund-preview" data-node-id="768:7778">
      {trip && <TripHero trip={trip} compact variant="landscape" />}
      {error ? (
        <ErrorState
          error={error}
          retry={() => {
            void tripQuery.refetch();
            void fundQuery.refetch();
          }}
        />
      ) : tripQuery.isPending || (allowed && fundQuery.isPending) ? (
        <ContentState state="loading" headingLevel={2} />
      ) : fund ? (
        <FundWorkspace data={fund} />
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details className="preview" data-preview="fund">
          <summary>Fund preview · Dữ liệu minh họa</summary>
          <Select
            label="Trạng thái quỹ"
            value={scenario}
            onChange={(e) => {
              const next = fundScenarios.find((item) => item === e.target.value);
              if (next) setScenario(next);
            }}
          >
            {fundScenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          {fund && (
            <p>
              Finance version {fund.fund.financeVersion} · {fund.viewerRole} · {fund.environment}{' '}
              fixture
            </p>
          )}
        </details>
      )}
    </section>
  );
}
