import { useMemo, useState, type ReactNode, type RefObject } from 'react';
import styles from './FinanceDesktop.module.css';

export type FinanceTransactionType = 'CONTRIBUTION' | 'EXPENSE' | 'REFUND' | 'REVERSAL';
export type FinanceTransactionFilter = 'ALL' | FinanceTransactionType;

const financeAssets = {
  goal: '/assets/finance-v12/e761e.svg',
  all: '/assets/finance-v12/6170f.svg',
  contribution: '/assets/finance-v12/514da.svg',
  expense: '/assets/finance-v12/f8a51.svg',
  refund: '/assets/finance-v12/0ff3f.svg',
  download: '/assets/finance-v12/23b0f.svg',
} as const;

export interface FinanceTransactionRow {
  readonly id: string;
  readonly type: FinanceTransactionType;
  readonly title: string;
  readonly timeLabel: string;
  readonly memberId: string | null;
  readonly memberName: string | null;
  readonly actorName: string;
  readonly amount: string;
  readonly direction: 'IN' | 'OUT';
  readonly sequence: string;
  readonly balanceAfter: string;
  readonly reason: string | null;
}

export function FinanceGoal({
  budget,
  amount,
  amountLabel = 'Số dư hiện tại',
  format,
  onSettings,
  settingsRef,
}: {
  budget: string | null;
  amount: string | null;
  amountLabel?: string;
  format: (value: string | null) => string;
  onSettings?: () => void;
  settingsRef?: RefObject<HTMLButtonElement | null>;
}) {
  const ratio = useMemo(() => {
    if (budget === null || amount === null) return null;
    try {
      const target = BigInt(budget);
      if (target <= 0n) return null;
      const current = BigInt(amount);
      return Math.min(100, Math.max(0, Number((current * 10000n) / target) / 100));
    } catch {
      return null;
    }
  }, [amount, budget]);
  const percent = ratio === null ? '—' : `${ratio.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

  return (
    <section className={styles.goal} aria-label="Mục tiêu quỹ" data-finance-goal>
      <div className={styles.goalIcon} aria-hidden="true"><img src={financeAssets.goal} alt="" /></div>
      <div className={styles.goalLabel}>
        <span>Mục tiêu quỹ</span>
        <small>{amountLabel}</small>
      </div>
      <div className={styles.goalProgress}>
        <strong>{format(amount)} / {format(budget)}</strong>
        <div className={styles.track} role="progressbar" aria-label="Tiến độ mục tiêu quỹ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ratio ?? undefined}>
          <span style={{ width: ratio === null ? '0%' : `${ratio}%` }} />
        </div>
      </div>
      <span className={styles.percent}>{percent}</span>
      <button ref={settingsRef} type="button" className={styles.settings} onClick={onSettings} disabled={!onSettings}>
        <span aria-hidden="true">⚙</span> Cài đặt quỹ
      </button>
    </section>
  );
}

const filterLabels: Record<FinanceTransactionFilter, { label: string; icon?: string }> = {
  ALL: { label: 'Tất cả', icon: financeAssets.all },
  CONTRIBUTION: { label: 'Đóng góp', icon: financeAssets.contribution },
  EXPENSE: { label: 'Chi tiêu', icon: financeAssets.expense },
  REFUND: { label: 'Hoàn tiền', icon: financeAssets.refund },
  REVERSAL: { label: 'Đảo bút toán' },
};

function transactionLabel(type: FinanceTransactionType) {
  return type === 'CONTRIBUTION' ? 'Đóng góp' : type === 'EXPENSE' ? 'Chi tiêu' : type === 'REFUND' ? 'Hoàn tiền' : 'Đảo bút toán';
}

export function FinanceTransactionPanel({
  rows,
  format,
  loading = false,
  feedback,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  footer,
}: {
  rows: readonly FinanceTransactionRow[];
  format: (value: string | null) => string;
  loading?: boolean;
  feedback?: ReactNode;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  footer?: ReactNode;
}) {
  const [filter, setFilter] = useState<FinanceTransactionFilter>('ALL');
  const [member, setMember] = useState('ALL');
  const [kind, setKind] = useState('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const members = useMemo(() => Array.from(new Map(rows.filter((r) => r.memberId).map((r) => [r.memberId!, r.memberName ?? r.memberId!])).entries()), [rows]);
  const visible = rows.filter((row) => {
    if (filter !== 'ALL' && row.type !== filter) return false;
    if (member !== 'ALL' && row.memberId !== member) return false;
    if (kind === 'IN' && row.direction !== 'IN') return false;
    if (kind === 'OUT' && row.direction !== 'OUT') return false;
    if (kind === 'REVERSAL' && row.type !== 'REVERSAL') return false;
    return true;
  });

  return (
    <section className={styles.transactions} aria-label="Lịch sử quỹ" data-finance-transactions>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup} role="tablist" aria-label="Bộ lọc giao dịch">
          {(['ALL', 'CONTRIBUTION', 'EXPENSE', 'REFUND'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              tabIndex={filter === value ? 0 : -1}
              onClick={() => setFilter(value)}
              onKeyDown={(event) => {
                const tabs = Array.from(
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
                );
                const index = tabs.indexOf(event.currentTarget);
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index - 1 + tabs.length) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : -1;
                if (next < 0) return;
                event.preventDefault();
                tabs[next]?.focus();
                tabs[next]?.click();
              }}
            >
              {filterLabels[value].icon && <img src={filterLabels[value].icon} alt="" aria-hidden="true" />}
              {filterLabels[value].label}
            </button>
          ))}
        </div>
        <label className={styles.selectLabel}>Thành viên<select aria-label="Thành viên" value={member} onChange={(event) => setMember(event.target.value)}><option value="ALL">Mọi thành viên</option>{members.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className={styles.selectLabel}>Loại giao dịch<select aria-label="Loại giao dịch" value={kind} onChange={(event) => setKind(event.target.value)}><option value="ALL">Tất cả giao dịch</option><option value="IN">Tiền vào</option><option value="OUT">Tiền ra</option><option value="REVERSAL">Đảo bút toán</option></select></label>
        <button type="button" className={styles.export} disabled title="Xuất dữ liệu chưa có trong contract Finance"><img src={financeAssets.download} alt="" aria-hidden="true" /><span className={styles.srOnly}>Xuất dữ liệu chưa khả dụng</span></button>
      </div>
      <p className={styles.loadedOnly}>Bộ lọc áp dụng trên các giao dịch đã tải.</p>
      {feedback}
      {loading ? <div className={styles.empty} role="status">Đang tải lịch sử quỹ…</div> : visible.length === 0 ? <div className={styles.empty}>Chưa có giao dịch phù hợp.</div> : (
        <div className={styles.tableWrap}>
          <table>
            <caption className={styles.srOnly}>Các giao dịch quỹ nhóm</caption>
            <thead><tr><th>Thời gian</th><th>Giao dịch</th><th>Nội dung</th><th>Thành viên</th><th>Số tiền</th></tr></thead>
            <tbody>{visible.map((row) => {
              const isExpanded = expanded === row.id;
              return <tr key={row.id} className={isExpanded ? styles.expanded : undefined}>
                <td data-label="Thời gian">{row.timeLabel}</td>
                <td data-label="Giao dịch"><button type="button" className={styles.rowButton} aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : row.id)}><span className={row.direction === 'OUT' ? styles.out : styles.in} aria-hidden="true">{row.direction === 'OUT' ? '↑' : '↓'}</span>{transactionLabel(row.type)}</button></td>
                <td data-label="Nội dung">{row.title}{isExpanded && <dl className={styles.details}><div><dt>Sequence</dt><dd>{row.sequence}</dd></div><div><dt>Số dư sau</dt><dd>{format(row.balanceAfter)}</dd></div><div><dt>Actor</dt><dd>{row.actorName}</dd></div>{row.reason && <div><dt>Lý do</dt><dd>{row.reason}</dd></div>}</dl>}</td>
                <td data-label="Thành viên">{row.memberName ?? 'Chưa xác định'}</td>
                <td data-label="Số tiền" className={row.direction === 'OUT' ? styles.out : styles.in}>{row.direction === 'OUT' ? '−' : '+'}{format(row.amount)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      {hasMore && <button type="button" className={styles.loadMore} disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? 'Đang tải…' : 'Tải thêm giao dịch'}</button>}
      {footer}
    </section>
  );
}
