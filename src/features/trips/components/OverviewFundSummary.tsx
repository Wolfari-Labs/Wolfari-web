import type { RuntimeFund } from '../../fund/model/runtime-fund';
import { formatVnd } from '../../fund/GatewayFundPage';
import { OverviewProgress } from './OverviewProgress';
import styles from '../TripDashboard.module.css';

export function OverviewFundSummary({ fund }: { fund: RuntimeFund | null | undefined }) {
  if (!fund) {
    const label = fund === null ? 'Chưa bật quỹ nhóm.' : 'Chưa khả dụng';
    return (
      <OverviewProgress percent={null} label={label}>
        <p className={styles.summaryValue}>—</p>
        <p className={styles.summaryDetail}>{label}</p>
      </OverviewProgress>
    );
  }
  const balance = BigInt(fund.current_balance);
  const budget = fund.budget_amount === null ? null : BigInt(fund.budget_amount);
  // Keep int64 amounts exact. Only convert the bounded bar value to Number.
  const ratio = budget !== null && budget > 0n ? (balance * 100n + budget / 2n) / budget : null;
  const percent = ratio === null ? null : Number(ratio < 0n ? 0n : ratio > 100n ? 100n : ratio);
  const detail =
    ratio === null
      ? budget === 0n
        ? 'Ngân sách 0 ₫'
        : 'Chưa đặt ngân sách'
      : `${ratio}% ngân sách · ${formatVnd(fund.budget_amount)}`;
  return (
    <OverviewProgress percent={percent} label={`Số dư quỹ so với ngân sách: ${detail}`}>
      <p
        className={styles.summaryValue}
        aria-label={`Số dư quỹ: ${formatVnd(fund.current_balance)}`}
      >
        {formatVnd(fund.current_balance)}
      </p>
      <p className={styles.summaryDetail}>{detail}</p>
    </OverviewProgress>
  );
}
