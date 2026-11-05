import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRuntimeServices } from '../../../app/gateway-context';
import { Button } from '../../../shared/components/Button';
import { Select } from '../../../shared/components/Select';
import { Checkbox } from '../../../shared/components/Checkbox';
import { Card } from '../../../shared/components/Ui';
import { ProviderSource } from '../../map/TravelTools';
import { activePlan } from '../model/preparation';
import { planDays } from '../model/plan-presentation';
import type { RecommendationItem, RecommendationScope, RecommendationType } from '../model/travel';
import {
  PreparationStatus,
  usePreparationCommands,
  type PreparationProps,
} from './PreparationActions';
import styles from './PreparationActions.module.css';

const names: Record<string, string> = {
  name: 'Tên',
  label: 'Tiêu đề',
  quantity: 'Số lượng',
  unit: 'Đơn vị',
  category: 'Phân loại',
  note: 'Ghi chú',
  scope_type: 'Phạm vi',
  plan_date: 'Ngày',
  activity_id: 'Activity',
  activity_ids: 'Thứ tự Activity',
  selected_location_id: 'Địa điểm',
  starts_at: 'Bắt đầu',
  ends_at: 'Kết thúc',
  position: 'Vị trí',
  description: 'Mô tả',
  public_description: 'Mô tả công khai',
  assigned_member_id: 'Người phụ trách',
};
function ProposalValues({ item, ...props }: PreparationProps & { item: RecommendationItem }) {
  const format = (key: string, value: unknown): string => {
    if (value === null) return 'Chưa có';
    if (Array.isArray(value)) return value.map((v) => format(key, v)).join(' → ');
    if (typeof value === 'string') {
      if (key === 'activity_id' || key === 'activity_ids')
        return props.plan.activities.find((a) => a.id === value)?.title ?? value;
      if (key === 'selected_location_id')
        return props.plan.selectedLocations.find((a) => a.id === value)?.name ?? value;
      if (['starts_at', 'ends_at'].includes(key) && Number.isFinite(Date.parse(value)))
        return new Intl.DateTimeFormat('vi-VN', {
          dateStyle: 'short',
          timeStyle: 'short',
          hourCycle: 'h23',
          timeZone: props.trip.timezone,
        }).format(new Date(value));
      if (key === 'plan_date' && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value.split('-').reverse().join('/');
      return value;
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
  const current = props.plan.activities.find(
    (a) => a.id === item.values.id || a.id === item.values.activity_id,
  );
  return (
    <>
      <h4>Thay đổi dự kiến</h4>
      {item.type === 'ROUTE_ORDER' && (
        <p>
          Thứ tự hiện tại:{' '}
          {[...props.plan.activities]
            .sort((a, b) => a.position - b.position)
            .map((a) => a.title)
            .join(' → ')}
        </p>
      )}
      {current && (
        <p>
          Hiện tại: {current.title} · vị trí {current.position} ·{' '}
          {format('starts_at', current.startsAt)} → {format('ends_at', current.endsAt)}
        </p>
      )}
      <dl>
        {Object.entries(item.values).map(([key, value]) => (
          <div key={key}>
            <dt>{names[key] ?? key}</dt>
            <dd>{format(key, value)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
export function RecommendationPanel({
  type,
  ...props
}: PreparationProps & { type: RecommendationType }) {
  const service = useRuntimeServices()?.travel;
  const commands = usePreparationCommands(props);
  const [date, setDate] = useState('');
  const [locationIds, setLocationIds] = useState<string[]>([]),
    [activityIds, setActivityIds] = useState<string[]>([]);
  const [request, setRequest] = useState<{
    version: number;
    scope: RecommendationScope;
    nonce: number;
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState<string[]>([]);
  const [expired, setExpired] = useState(false),
    [closed, setClosed] = useState(false);
  const requestCap = type === 'ROUTE_ORDER' ? 'route_order_request' : 'packing_dress_request';
  const applyCap = type === 'ROUTE_ORDER' ? 'route_order_apply' : 'packing_dress_apply';
  const result = useQuery({
    queryKey: [
      'recommendations',
      props.trip.id,
      props.trip.currentMembership.userId,
      type,
      request,
    ],
    enabled: !!service && !!request && !!props.plan.capabilities?.[requestCap],
    retry: false,
    queryFn: ({ signal }) =>
      service!.recommend(props.trip.id, type, request!.scope, request!.version, signal),
  });
  const proposal = closed ? undefined : result.data;
  useEffect(() => {
    if (!proposal) return;
    const remaining = Date.parse(proposal.expiresAt) - Date.now();
    setExpired(remaining <= 0);
    const timer = setTimeout(() => setExpired(true), Math.max(0, Math.min(remaining, 2147483647)));
    return () => clearTimeout(timer);
  }, [proposal]);
  const duplicate = (item: RecommendationItem) =>
    item.type === 'PACKING_ITEM' &&
    (item.duplicateOf.length > 0 ||
      props.plan.packingItems.some(
        (p) =>
          p.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN') ===
          String(item.values.name ?? '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLocaleLowerCase('vi-VN'),
      ));
  const stale = !!proposal && proposal.basePlanVersion !== props.plan.planVersion;
  const canApply =
    activePlan(props.trip) &&
    props.plan.permissions.canEdit &&
    !!props.plan.capabilities?.[applyCap] &&
    !!proposal &&
    proposal.status === 'PENDING' &&
    !proposal.providerSources.some((p) => p.isMock) &&
    !stale &&
    !expired &&
    Date.parse(proposal.expiresAt) > Date.now();
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  if (!props.plan.capabilities?.[requestCap]) return null;
  return (
    <Card
      className={styles.form}
      aria-label={type === 'ROUTE_ORDER' ? 'Gợi ý thứ tự ghé thăm' : 'Gợi ý Dress Code và Packing'}
    >
      <h2>{type === 'ROUTE_ORDER' ? 'Gợi ý thứ tự ghé thăm' : 'Gợi ý Dress Code và Packing'}</h2>
      <Select label="Phạm vi ngày" value={date} onChange={(e) => setDate(e.target.value)}>
        <option value="">Cả chuyến</option>
        {planDays(props.trip.startAt, props.trip.endAt, props.trip.timezone).map((day) => (
          <option key={day} value={day}>
            {day.split('-').reverse().join('/')}
          </option>
        ))}
      </Select>
      <details>
        <summary>Chọn Activity và địa điểm (bỏ trống để dùng toàn phạm vi)</summary>
        {props.plan.activities.map((a) => (
          <Checkbox
            key={a.id}
            checked={activityIds.includes(a.id)}
            onChange={() => setActivityIds((ids) => toggle(ids, a.id))}
          >
            {a.title}
          </Checkbox>
        ))}
        {props.plan.selectedLocations.map((p) => (
          <Checkbox
            key={p.id}
            checked={locationIds.includes(p.id)}
            onChange={() => setLocationIds((ids) => toggle(ids, p.id))}
          >
            {p.name}
          </Checkbox>
        ))}
      </details>
      <Button
        disabled={!service || result.isFetching}
        onClick={() => {
          setSelected([]);
          setConfirmed([]);
          setClosed(false);
          setRequest({
            version: props.plan.planVersion,
            scope: {
              ...(date ? { date } : {}),
              ...(activityIds.length
                ? {
                    activity_ids: activityIds.filter((id) =>
                      props.plan.activities.some((a) => a.id === id),
                    ),
                  }
                : {}),
              ...(locationIds.length
                ? {
                    selected_location_ids: locationIds.filter((id) =>
                      props.plan.selectedLocations.some((p) => p.id === id),
                    ),
                  }
                : {}),
            },
            nonce: Date.now(),
          });
        }}
      >
        Yêu cầu gợi ý
      </Button>
      {result.isFetching && <p role="status">Đang tạo gợi ý; Plan chưa thay đổi.</p>}
      {result.isError && (
        <p role="alert">
          Chưa tạo được gợi ý. Plan không thay đổi; bạn vẫn có thể chỉnh sửa thủ công.
        </p>
      )}
      {proposal && (
        <>
          <p>
            Gợi ý hỗ trợ quyết định, không bảo đảm phương án tối ưu tuyệt đối. Chỉ lưu thay đổi sau
            khi áp dụng.
          </p>
          {proposal.providerSources.map((meta, index) => (
            <ProviderSource
              key={`${meta.provider}:${index}`}
              meta={meta}
              timezone={props.trip.timezone}
            />
          ))}
          {proposal.warnings.map((w, i) => (
            <p role="status" key={i}>
              {w}
            </p>
          ))}
          {proposal.items.map((item) => (
            <article key={item.id}>
              <Checkbox
                checked={selected.includes(item.id)}
                disabled={!canApply || commands.locked}
                onChange={() => setSelected((ids) => toggle(ids, item.id))}
              >
                {String(
                  item.values.label ??
                    item.values.name ??
                    (item.type === 'ROUTE_ORDER' ? 'Thứ tự ghé thăm' : item.type),
                )}
              </Checkbox>
              <p>Lý do: {item.reason}</p>
              <ProposalValues item={item} {...props} />
              {duplicate(item) && (
                <>
                  <p role="alert">
                    Đã có vật dụng tương tự. Bỏ chọn để bỏ qua; không tự cộng số lượng.
                  </p>
                  <Checkbox
                    checked={confirmed.includes(item.id)}
                    disabled={!canApply || commands.locked}
                    onChange={() => setConfirmed((ids) => toggle(ids, item.id))}
                  >
                    Tôi chọn tạo vật dụng riêng dù tương tự mục đã có
                  </Checkbox>
                </>
              )}
            </article>
          ))}
          {!proposal.items.length && <p>Không có thay đổi được đề xuất.</p>}
          {(stale || expired) && (
            <p role="alert">Gợi ý đã cũ hoặc hết hạn. Yêu cầu gợi ý mới trước khi áp dụng.</p>
          )}
          {!props.plan.permissions.canEdit && (
            <p>Bạn được xem/yêu cầu gợi ý, nhưng không có quyền áp dụng.</p>
          )}
          <PreparationStatus {...props} />
          <Button
            disabled={
              !canApply ||
              commands.locked ||
              !selected.length ||
              proposal.items.some(
                (i) => selected.includes(i.id) && duplicate(i) && !confirmed.includes(i.id),
              )
            }
            onClick={() => {
              if (!canApply || Date.parse(proposal.expiresAt) <= Date.now()) return;
              void commands
                .submit({
                  operation: 'recommendation-apply',
                  id: proposal.id,
                  selectedItemIds: [...selected],
                  basePlanVersion: proposal.basePlanVersion,
                })
                .then((ok) => {
                  if (ok) setClosed(true);
                });
            }}
          >
            Áp dụng các thay đổi đã chọn
          </Button>
          <Button variant="outline" disabled={commands.pending} onClick={() => setClosed(true)}>
            Đóng xem trước
          </Button>
        </>
      )}
    </Card>
  );
}
