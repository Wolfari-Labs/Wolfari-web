import type { ReactNode } from 'react';
import { Badge } from '../../../shared/components/Ui';
import { Button } from '../../../shared/components/Button';
import { Icon, type IconName } from '../../../shared/components/Icon';
import styles from '../FundPage.module.css';

export type FinanceTab = 'contributions' | 'history' | 'members' | 'expenses' | 'refunds';

export function FinanceKpis({
  budget,
  balance,
  reserved,
  available,
  format,
}: {
  budget: string | null;
  balance: string;
  reserved: string;
  available: string;
  format: (value: string | null) => string;
}) {
  const items = [
    ['Ngân sách mục tiêu', budget, 'budget', 'tag'],
    ['Số dư ghi sổ', balance, 'balance', 'receipt'],
    ['Đang giữ cho hoàn dư', reserved, 'reserved', 'hourglass'],
    ['Khả dụng', available, 'available', 'fund'],
  ] as const satisfies readonly (readonly [string, string | null, string, IconName])[];
  return (
    <section className={styles.financeKpis} aria-label="Tổng quan quỹ">
      {items.map(([label, value, tone, icon]) => (
        <div className={styles.financeKpi} data-tone={tone} key={label}>
          <i className={styles.financeKpiIcon} aria-hidden="true">
            <Icon name={icon} size={22} />
          </i>
          <span>{label}</span>
          <strong>{format(value)}</strong>
        </div>
      ))}
    </section>
  );
}

export function FinanceStateBar({
  status,
  holderName,
  owner,
  holder,
  balance,
  format,
  onBudget,
  onDestination,
  disabled,
}: {
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  holderName: string;
  owner: boolean;
  holder: boolean;
  balance?: string;
  format?: (value: string) => string;
  onBudget?: () => void;
  onDestination?: () => void;
  disabled?: boolean;
}) {
  const statusLabel =
    status === 'OPEN' ? 'Đang mở' : status === 'CLOSING' ? 'Đang chốt' : 'Đã đóng';
  return (
    <section className={styles.financeStateBar} aria-label="Trạng thái quỹ" data-status={status}>
      <span className={styles.financeStateIcon} aria-hidden="true">
        <Icon name={status === 'OPEN' ? 'fund' : status === 'CLOSING' ? 'hourglass' : 'lock'} size={22} />
      </span>
      <div className={styles.financeStateCopy}>
        <div className={styles.financeEyebrow}>
          <Badge>VietQR</Badge>
          <span>Quỹ nhóm</span>
        </div>
        <h2>Quỹ nhóm · {statusLabel}</h2>
        <p>
          Người giữ quỹ: {holderName}. {owner ? 'Bạn là chủ chuyến. ' : ''}
          {holder
            ? 'Bạn là người giữ quỹ.'
            : 'Tiền về thẳng tài khoản người giữ quỹ; ứng dụng ghi nhận và đối chiếu, không giữ tiền.'}
        </p>
        {balance && format && (
          <span className={styles.financeSrOnly}>Số dư ghi sổ {format(balance)}</span>
        )}
      </div>
      <span className={styles.financeRoleBadge}>
        <Badge tone={status === 'OPEN' ? 'success' : 'warning'}>
          {holder ? 'Fund Holder' : 'Thành viên'}
        </Badge>
      </span>
      {owner && onBudget && (
        <Button variant="outline" disabled={disabled} onClick={onBudget}>
          Sửa ngân sách
        </Button>
      )}
      {owner && onDestination && (
        <Button
          variant="outline"
          aria-label="Thêm tài khoản nhận"
          disabled={disabled}
          onClick={onDestination}
        >
          Thông tin nhận tiền
        </Button>
      )}
    </section>
  );
}

export function FinanceTabs({
  value,
  onChange,
}: {
  value: FinanceTab;
  onChange: (value: FinanceTab) => void;
}) {
  const items: readonly [FinanceTab, string][] = [
    ['contributions', 'Đợt đóng góp'],
    ['history', 'Lịch sử'],
    ['members', 'Thành viên & quyền'],
    ['expenses', 'Khoản chi'],
    ['refunds', 'Hoàn tiền'],
  ];
  return (
    <div className={styles.financeTabs} role="tablist" aria-label="Các vùng quỹ">
      {items.map(([item, label]) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={value === item}
          tabIndex={value === item ? 0 : -1}
          onClick={() => onChange(item)}
          onKeyDown={(event) => {
            const buttons = Array.from(
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              ) ?? [],
            );
            const index = buttons.indexOf(event.currentTarget);
            const next =
              event.key === 'ArrowRight'
                ? (index + 1) % buttons.length
                : event.key === 'ArrowLeft'
                  ? (index - 1 + buttons.length) % buttons.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? buttons.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            buttons[next]?.focus();
            buttons[next]?.click();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FinanceUnavailable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.financeUnavailable} aria-label={title}>
      <div className={styles.financeUnavailableIcon} aria-hidden="true">
        —
      </div>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      <span className={styles.financeUnavailableBadge}>
        <Badge tone="neutral">Chưa khả dụng</Badge>
      </span>
    </section>
  );
}
