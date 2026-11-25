import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Checkbox } from '../../../shared/components/Checkbox';
import { Drawer } from '../../../shared/components/Drawer';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { useWriteScope } from '../../../shared/lib/use-write-scope';
import { planDays } from '../model/plan-presentation';
import { activePlan } from '../model/preparation';
import type {
  PreparationRecommendation,
  PreparationRecommendationType,
} from '../model/preparation-recommendation';
import { restorePlanCommand } from '../model/plan-command-intent';
import { usePlanRepository } from '../repositories/plan-context';
import { usePlanCommands } from '../hooks/use-plan-commands';
import { PreparationStatus, type PreparationProps } from './PreparationActions';
import styles from './PreparationSuggestions.module.css';

const warningLabels: Record<string, string> = {
  WEATHER_UNAVAILABLE: 'Chưa có đủ dữ liệu thời tiết. Gợi ý dựa trên hoạt động đã lên lịch.',
  FORECAST_OUT_OF_RANGE: 'Ngày đi nằm ngoài khoảng dự báo thời tiết.',
  ALREADY_IN_PLAN: 'Vật dụng đã có trong hành lý.',
  MANUAL_DRESS_CODE: 'Hoạt động đã có trang phục do thành viên tạo.',
  ACTIVITY_REMOVED: 'Hoạt động đã được xóa.',
};

export function PreparationSuggestions({
  type,
  ...props
}: PreparationProps & { type: Exclude<PreparationRecommendationType, 'ALL'> }) {
  const { trip, plan, refresh } = props;
  const repository = usePlanRepository();
  const service = repository.recommendations;
  const commands = usePlanCommands({
    tripId: trip.id,
    planVersion: plan.planVersion,
    refresh,
    recoveryScope: `${trip.id}:${trip.currentMembership.userId}`,
    restoreCommand: (payload) => restorePlanCommand(repository, trip.id, payload),
  });
  const writeScope = useWriteScope(`${trip.id}:${trip.currentMembership.userId}`);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [proposal, setProposal] = useState<PreparationRecommendation | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expired, setExpired] = useState(false);
  const label = type === 'PACKING' ? 'Gợi ý hành lý' : 'Gợi ý trang phục';
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!proposal) return;
    const remaining = Date.parse(proposal.expiresAt) - Date.now();
    setExpired(remaining <= 0);
    const timeout = setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => clearTimeout(timeout);
  }, [proposal]);
  if (!service || !activePlan(trip)) return null;
  const locked = busy || commands.pending || commands.blocked;
  const stale = proposal !== null && proposal.basePlanVersion !== plan.planVersion;
  const canApply =
    !!proposal &&
    proposal.status === 'PREVIEWED' &&
    proposal.canApply &&
    plan.permissions.canEdit &&
    !stale &&
    !expired;
  const duplicate = (id: string) =>
    proposal?.items.find((item) => item.id === id)?.warnings.includes('ALREADY_IN_PLAN') === true;

  async function preview() {
    if (!service || locked || inFlight.current) return;
    inFlight.current = true;
    controller.current?.abort();
    controller.current = new AbortController();
    const signal = AbortSignal.any([writeScope(), controller.current.signal]);
    setBusy(true);
    setError('');
    setNotice('');
    setProposal(null);
    setSelected([]);
    try {
      const next = await service.preview({
        tripId: trip.id,
        type,
        ...(date ? { date } : {}),
        signal,
      });
      if (signal.aborted) return;
      setProposal(next);
      setSelected([]);
    } catch {
      if (!signal.aborted) setError('Chưa tạo được gợi ý. Bạn có thể thử lại.');
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  async function apply() {
    if (
      !proposal ||
      !canApply ||
      locked ||
      !selected.length ||
      Date.parse(proposal.expiresAt) <= Date.now()
    )
      return;
    const payload = {
      kind: 'recommendation-apply' as const,
      recommendationId: proposal.id,
      itemIds: [...selected],
    };
    const command = restorePlanCommand(repository, trip.id, payload);
    if (!command) return;
    const signal = writeScope();
    await commands.execute(async (context) => {
      const result = await service!.apply({
        ...context,
        tripId: trip.id,
        recommendationId: payload.recommendationId,
        itemIds: payload.itemIds,
      });
      if (result.status === 'success' && !signal.aborted) {
        setProposal(result.data);
        setSelected([]);
        const applied = result.data.applied;
        setNotice(
          applied?.createdCount
            ? `Đã thêm ${applied.createdCount} mục vào ${type === 'PACKING' ? 'hành lý' : 'trang phục'}.${applied.skippedCount ? ` Bỏ qua ${applied.skippedCount} mục không còn phù hợp.` : ''}`
            : 'Đã đối chiếu gợi ý. Các mục đã có được bỏ qua.',
        );
      }
      return result;
    }, payload);
  }
  async function ignore() {
    if (!proposal || !service || locked || inFlight.current) return;
    inFlight.current = true;
    const signal = writeScope();
    setBusy(true);
    setError('');
    try {
      const result = await service.ignore({
        tripId: trip.id,
        recommendationId: proposal.id,
        signal,
      });
      if (signal.aborted) return;
      setProposal(result);
      setSelected([]);
      setNotice('Đã bỏ qua gợi ý.');
    } catch {
      if (!signal.aborted) setError('Chưa bỏ qua được gợi ý. Bạn có thể thử lại.');
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        icon={<Icon name="lightbulb" size={17} />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Drawer
        open={open}
        label={label}
        side="right"
        onDismiss={() => {
          if (!busy && !commands.pending) setOpen(false);
        }}
      >
        <div className={styles.content}>
          <div className={styles.controls}>
            <Select
              label="Phạm vi ngày"
              value={date}
              disabled={locked}
              onChange={(event) => {
                setDate(event.target.value);
                setProposal(null);
                setSelected([]);
                setNotice('');
                setError('');
              }}
            >
              <option value="">Cả chuyến</option>
              {planDays(trip.startAt, trip.endAt, trip.timezone).map((day) => (
                <option key={day} value={day}>
                  {day.split('-').reverse().join('/')}
                </option>
              ))}
            </Select>
            <Button disabled={locked} loading={busy} onClick={() => void preview()}>
              Tạo gợi ý
            </Button>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          {notice && (
            <Alert tone="success" live>
              {notice}
            </Alert>
          )}
          {proposal && (
            <>
              {proposal.warnings.map((warning) => (
                <p className={styles.note} key={warning}>
                  {warningLabels[warning] ?? 'Gợi ý có dữ liệu nguồn chưa đầy đủ.'}
                </p>
              ))}
              {proposal.sources.map((source, index) => (
                <p className={styles.source} key={`${source.provider}:${index}`}>
                  {source.isMock
                    ? 'Dữ liệu mô phỏng'
                    : source.stale
                      ? 'Dữ liệu thời tiết cũ'
                      : 'Dữ liệu tham khảo'}
                  {source.attribution.map((credit) => (
                    <a key={credit.url} href={credit.url} target="_blank" rel="noreferrer">
                      {credit.text}
                    </a>
                  ))}
                </p>
              ))}
              {stale && proposal.status === 'PREVIEWED' && (
                <Alert tone="warning">Lịch trình đã thay đổi. Tạo gợi ý mới để đối chiếu.</Alert>
              )}
              {expired && proposal.status === 'PREVIEWED' && (
                <Alert tone="warning">Gợi ý đã hết hạn. Tạo gợi ý mới để tiếp tục.</Alert>
              )}
              <ul className={styles.items}>
                {proposal.items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <Checkbox
                      checked={selected.includes(item.id)}
                      disabled={!canApply || locked || duplicate(item.id)}
                      onChange={() =>
                        setSelected((ids) =>
                          ids.includes(item.id)
                            ? ids.filter((id) => id !== item.id)
                            : [...ids, item.id],
                        )
                      }
                    >
                      {item.title}
                    </Checkbox>
                    {item.quantity && (
                      <p>
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : ''}
                      </p>
                    )}
                    {item.activityId && (
                      <p>
                        {plan.activities.find((activity) => activity.id === item.activityId)
                          ?.title ?? 'Hoạt động đã lên lịch'}
                      </p>
                    )}
                    {item.date && <p>{item.date.split('-').reverse().join('/')}</p>}
                    {item.description && <p>{item.description}</p>}
                    {item.reasons.map((reason, index) => (
                      <p key={index}>{reason}</p>
                    ))}
                    {item.warnings.map((warning) => (
                      <small key={warning}>
                        {warningLabels[warning] ?? 'Kiểm tra lại mục này trước khi áp dụng.'}
                      </small>
                    ))}
                  </li>
                ))}
              </ul>
              {!proposal.items.length && (
                <p>Chưa có gợi ý phù hợp. Hãy thêm hoạt động vào lịch trình để nhận gợi ý.</p>
              )}
              {!plan.permissions.canEdit && (
                <p className={styles.note}>
                  Bạn có thể xem gợi ý. Người có quyền sửa lịch trình sẽ chọn áp dụng.
                </p>
              )}
              {proposal.status === 'PREVIEWED' && (
                <div className={styles.actions}>
                  {plan.permissions.canEdit && (
                    <Button
                      disabled={!canApply || locked || !selected.length}
                      onClick={() => void apply()}
                    >
                      Áp dụng mục đã chọn
                    </Button>
                  )}
                  <Button variant="outline" disabled={locked} onClick={() => void ignore()}>
                    Bỏ qua gợi ý
                  </Button>
                </div>
              )}
            </>
          )}
          <PreparationStatus {...props} hideSuccess />
        </div>
      </Drawer>
    </>
  );
}
