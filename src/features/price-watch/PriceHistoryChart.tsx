import { useLayoutEffect, useRef, useState } from 'react';
import styles from './PriceHistoryChart.module.css';

/** One plotted fare. `amount` stays a bigint so int64 VND strings never lose precision. */
export interface PriceChartPoint {
  readonly id: string;
  readonly amount: bigint;
  /** Short x-axis label, already formatted by the caller (e.g. `12/09`). */
  readonly axisLabel: string;
  /** Hover text for the point, already formatted by the caller. */
  readonly title: string;
}

const top = 18;
const bottom = 192;
/** Right margin reserved for the threshold label. */
const labelGutter = 76;

const minOf = (values: readonly bigint[]) =>
  values.reduce((current, value) => (value < current ? value : current));
const maxOf = (values: readonly bigint[]) =>
  values.reduce((current, value) => (value > current ? value : current));

/** Smallest 1/2/5 × 10^n step that splits `range` into fewer than four intervals. */
function niceStep(range: bigint) {
  for (let power = 1n; ; power *= 10n) {
    for (const multiple of [1n, 2n, 5n]) {
      if (range / (power * multiple) < 4n) return power * multiple;
    }
  }
}

/** Rounded axis bounds (1/2/5 × 10^n steps, at most ~5 ticks) computed without floats. */
export function niceScale(values: readonly bigint[]) {
  let min = minOf(values);
  let max = maxOf(values);
  if (min === max) {
    const pad = max / 10n || 1n;
    min = min > pad ? min - pad : 0n;
    max += pad;
  }
  const step = niceStep(max - min);
  const lo = (min / step) * step;
  const hi = ((max + step - 1n) / step) * step;
  const ticks: bigint[] = [];
  for (let value = lo; value <= hi; value += step) ticks.push(value);
  return { lo, hi, ticks };
}

/** Axis unit chosen from the largest tick so labels stay short (2,35 · triệu ₫). */
export function axisUnit(hi: bigint) {
  return hi >= 1_000_000_000n
    ? { divisor: 1_000_000_000n, name: 'tỷ ₫', short: 'tỷ' }
    : hi >= 1_000_000n
      ? { divisor: 1_000_000n, name: 'triệu ₫', short: 'tr' }
      : { divisor: 1_000n, name: 'nghìn ₫', short: 'N' };
}

export function compactAmount(value: bigint, divisor: bigint) {
  const hundredths = (value * 100n + divisor / 2n) / divisor;
  const whole = (hundredths / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimal = (hundredths % 100n).toString().padStart(2, '0').replace(/0+$/, '');
  return decimal ? `${whole},${decimal}` : whole;
}

/**
 * Single-series fare history with a labelled threshold reference line. Presentation only:
 * callers pass already-validated amounts; the table view stays the accessible fallback.
 */
export function PriceHistoryChart({
  points,
  threshold,
  label,
  description,
}: {
  points: readonly PriceChartPoint[];
  threshold: bigint;
  label: string;
  description: string;
}) {
  // The viewBox follows the rendered width so 11px labels stay 11px at every column width.
  const frame = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(560);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => setWidth(Math.max(280, Math.round(element.clientWidth)) || 560);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const right = width - labelGutter;
  const { lo, hi, ticks } = niceScale([...points.map(({ amount }) => amount), threshold]);
  const unit = axisUnit(hi);
  const tickLabels = ticks.map((value) => compactAmount(value, unit.divisor));
  const left = Math.max(...tickLabels.map((text) => text.length)) * 6.6 + 16;
  const span = hi - lo;
  const y = (amount: bigint) =>
    bottom -
    (span === 0n ? 0.5 : Number(((amount - lo) * 10_000n) / span) / 10_000) * (bottom - top);
  const plotted = points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? (left + right) / 2
        : left + 8 + (index * (right - left - 16)) / (points.length - 1),
    y: y(point.amount),
  }));
  const line = plotted
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area =
    plotted.length > 1
      ? `${line} L ${plotted.at(-1)!.x.toFixed(1)} ${bottom} L ${plotted[0]!.x.toFixed(1)} ${bottom} Z`
      : '';
  const thresholdY = y(threshold);
  const last = plotted.at(-1);
  const axisIndexes =
    plotted.length >= 3
      ? [0, Math.floor((plotted.length - 1) / 2), plotted.length - 1]
      : plotted.map((_, index) => index);
  return (
    <figure className={styles.chart} ref={frame}>
      <svg viewBox={`0 0 ${width} 222`} role="img" aria-label={label}>
        <desc>{description}</desc>
        {ticks.map((value, index) => (
          <g key={value.toString()}>
            <line x1={left} x2={right} y1={y(value)} y2={y(value)} className={styles.grid} />
            {/* Rounding can repeat a label on very large amounts; print each value once. */}
            {tickLabels[index] !== tickLabels[index - 1] && (
              <text x={left - 8} y={y(value) + 4} textAnchor="end" className={styles.axis}>
                {tickLabels[index]}
              </text>
            )}
          </g>
        ))}
        {area && <path d={area} className={styles.area} />}
        <line x1={left} x2={right} y1={thresholdY} y2={thresholdY} className={styles.threshold} />
        {/* Labelled in the right margin so it never collides with the price line. */}
        <text x={right + 10} y={thresholdY - 3} className={styles.thresholdLabel}>
          Ngưỡng
          <tspan x={right + 10} dy="14">
            {compactAmount(threshold, unit.divisor)} {unit.short}
          </tspan>
        </text>
        <path d={line} className={styles.line} />
        {plotted.map((point) => (
          <g key={point.id} className={styles.pointGroup}>
            <circle
              cx={point.x}
              cy={point.y}
              r={point === last ? 5.5 : 4.5}
              className={point === last ? styles.lastPoint : styles.point}
            />
            <circle cx={point.x} cy={point.y} r="16" className={styles.hit}>
              <title>{point.title}</title>
            </circle>
          </g>
        ))}
        {axisIndexes.map((index) => {
          const point = plotted[index]!;
          return (
            <text
              key={point.id}
              x={point.x}
              y={216}
              textAnchor={
                plotted.length === 1
                  ? 'middle'
                  : index === 0
                    ? 'start'
                    : index === plotted.length - 1
                      ? 'end'
                      : 'middle'
              }
              className={styles.axis}
            >
              {point.axisLabel}
            </text>
          );
        })}
      </svg>
      <figcaption className={styles.legend}>
        <span className={styles.legendPrice}>Giá quan sát</span>
        <span className={styles.unit}>Đơn vị: {unit.name}</span>
      </figcaption>
    </figure>
  );
}

/** Tiny decorative trend for a watch card; the chart panel carries the accessible detail. */
export function PriceSparkline({ amounts }: { amounts: readonly bigint[] }) {
  if (amounts.length < 2) return null;
  const min = minOf(amounts);
  const max = maxOf(amounts);
  const span = max - min;
  const points = amounts.map((amount, index) => ({
    x: 3 + (index * 74) / (amounts.length - 1),
    y: 25 - (span === 0n ? 0.5 : Number(((amount - min) * 10_000n) / span) / 10_000) * 20,
  }));
  const end = points.at(-1)!;
  return (
    <svg className={styles.sparkline} viewBox="0 0 80 30" aria-hidden="true" focusable="false">
      <polyline points={points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />
      <circle cx={end.x} cy={end.y} r="2.75" />
    </svg>
  );
}
