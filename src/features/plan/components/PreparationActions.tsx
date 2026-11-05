import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { paths } from '../../../app/route-paths';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { Select } from '../../../shared/components/Select';
import { Drawer } from '../../../shared/components/Drawer';
import { Alert } from '../../../shared/components/Alert';
import { ConfirmDialog } from '../../../shared/components/Ui';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import type {
  PlanViewModel,
  SelectedLocationViewModel,
  DressCodeViewModel,
  PackingItemViewModel,
} from '../model/plan';
import {
  activePlan,
  canTogglePacking,
  parsePreparationIntent,
  type PreparationIntent,
  type LocationWrite,
} from '../model/preparation';
import { restorePlanCommand } from '../model/plan-command-intent';
import { usePlanRepository } from '../repositories/plan-context';
import { usePlanCommands } from '../hooks/use-plan-commands';
import { useMembersRepositories } from '../../members/repositories/members-context';
import type { MembershipViewModel } from '../../members/model/members';
import { packingDateToIso, packingFormFromItem } from '../../packing/packing';
import { validCalendarDate } from '../../../shared/lib/calendar';
import { planDays } from '../model/plan-presentation';
import styles from './PreparationActions.module.css';

export interface PreparationProps {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  refresh: () => Promise<boolean>;
}
export function usePreparationCommands({ trip, plan, refresh }: PreparationProps) {
  const repository = usePlanRepository();
  const commands = usePlanCommands({
    tripId: trip.id,
    planVersion: plan.planVersion,
    refresh,
    recoveryScope: `${trip.id}:${trip.currentMembership.userId}`,
    restoreCommand: (p) => restorePlanCommand(repository, trip.id, p),
  });
  return {
    ...commands,
    locked: commands.pending || commands.blocked,
    submit: (intent: PreparationIntent) => {
      const payload = { kind: 'preparation' as const, intent };
      const command = restorePlanCommand(repository, trip.id, payload);
      return command ? commands.execute(command, payload) : Promise.resolve(false);
    },
  };
}
export function PreparationStatus(props: PreparationProps) {
  const commands = usePreparationCommands(props);
  if (commands.status === 'idle') return null;
  return (
    <div role="status" className={styles.status}>
      {commands.status === 'pending'
        ? 'Đang lưu…'
        : commands.status === 'success'
          ? 'Đã lưu thay đổi.'
          : commands.status === 'unknown'
            ? 'Chưa rõ kết quả lưu. Đối soát trước khi thực hiện thao tác khác.'
            : commands.status === 'conflict'
              ? 'Dữ liệu hoặc quyền đã thay đổi. Tải lại để đối chiếu.'
              : 'Chưa lưu được. Kiểm tra dữ liệu và quyền hiện tại.'}
      {commands.error?.correlationId && <small>Mã đối chiếu: {commands.error.correlationId}</small>}
      {commands.blocked && (
        <Button
          variant="outline"
          disabled={commands.pending}
          onClick={() => void commands.reconcile()}
        >
          Đối soát dữ liệu
        </Button>
      )}
      {commands.canRetryUnknown && (
        <Button
          variant="outline"
          disabled={commands.pending}
          onClick={() => void commands.retryUnknown()}
        >
          Kiểm tra lại lệnh cũ
        </Button>
      )}
    </div>
  );
}
type Item = SelectedLocationViewModel | DressCodeViewModel | PackingItemViewModel;
type Module = 'location' | 'dress' | 'packing';
function initialFields(
  module: Module,
  item?: Item,
  candidate?: LocationWrite,
): Record<string, string> {
  if (module === 'location') {
    const v = candidate ?? (item as SelectedLocationViewModel | undefined);
    return {
      name: v?.name ?? '',
      address: v?.address ?? '',
      latitude: v?.latitude ?? '',
      longitude: v?.longitude ?? '',
    };
  }
  if (module === 'dress') {
    const v = item as DressCodeViewModel | undefined;
    return {
      scopeType: v?.scopeType === 'ACTIVITY' ? 'ACTIVITY' : 'DAY',
      planDate: v?.planDate ?? '',
      activityId: v?.activityId ?? '',
      label: v?.label ?? '',
      description: v?.description ?? '',
      publicDescription: v?.publicDescription ?? '',
    };
  }
  const v = item as PackingItemViewModel | undefined;
  return {
    name: v?.name ?? '',
    quantity: v?.quantity ?? '1',
    unit: v?.unit ?? '',
    category: v?.category ?? '',
    note: v?.note ?? '',
    dueDate: '',
  };
}
export function PreparationActions({
  module,
  item,
  candidate,
  ...props
}: PreparationProps & { module: Module; item?: Item; candidate?: LocationWrite }) {
  const { trip, plan } = props;
  const commands = usePreparationCommands(props);
  const capability =
    module === 'location'
      ? 'locations_write'
      : module === 'dress'
        ? 'dress_codes_write'
        : 'packing_items_write';
  const enabled =
    activePlan(trip) && plan.permissions.canEdit && plan.capabilities?.[capability] === true;
  const legacy =
    module === 'dress' && (item as DressCodeViewModel | undefined)?.scopeType === 'TRIP';
  const [draft, setDraft] = useState<{
    fields: Record<string, string>;
    version: number;
    dueAt: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const affected =
    item && module === 'location'
      ? plan.activities.filter((a) => a.selectedLocationId === item.id)
      : [];
  const label = module === 'location' ? 'địa điểm' : module === 'dress' ? 'dress code' : 'vật dụng';
  const edit = () => {
    const fields = initialFields(module, item, candidate);
    const packing = module === 'packing' ? (item as PackingItemViewModel | undefined) : undefined;
    if (packing)
      fields.dueDate = packingFormFromItem({ ...packing, reminder: null }, trip.timezone).dueDate;
    setError('');
    setDraft({ fields, version: plan.planVersion, dueAt: packing?.dueAt ?? null });
  };
  const update = (key: string, value: string) =>
    setDraft((d) => (d ? { ...d, fields: { ...d.fields, [key]: value } } : d));
  const save = async () => {
    if (!draft || !enabled || commands.locked) return;
    if (draft.version !== plan.planVersion) {
      setError('Plan đã đổi. Bản nháp được giữ; đóng và mở lại để đối chiếu trước khi lưu.');
      return;
    }
    const f = draft.fields;
    let fields: unknown;
    if (module === 'location') {
      if (!item && plan.selectedLocations.length >= 50) {
        setError('Tối đa 50 địa điểm trong một chuyến đi.');
        return;
      }
      const source = candidate ?? (item as SelectedLocationViewModel | undefined);
      fields = {
        name: f.name?.trim(),
        address: f.address?.trim() || null,
        latitude: f.latitude?.trim() || null,
        longitude: f.longitude?.trim() || null,
        provider: source?.provider ?? null,
        providerPlaceId: source?.providerPlaceId ?? null,
        openingHours: source?.openingHours ?? null,
        fetchedAt: source?.fetchedAt ?? null,
      };
      if (
        !item &&
        source?.providerPlaceId &&
        plan.selectedLocations.some(
          (v) => v.provider === source.provider && v.providerPlaceId === source.providerPlaceId,
        )
      ) {
        setError('Địa điểm này đã có trong danh sách đã lưu.');
        return;
      }
    } else if (module === 'dress') {
      if (
        f.scopeType === 'DAY' &&
        (!f.planDate || !planDays(trip.startAt, trip.endAt, trip.timezone).includes(f.planDate))
      ) {
        setError('Ngày phải nằm trong chuyến đi.');
        return;
      }
      if (f.scopeType === 'ACTIVITY' && !plan.activities.some((a) => a.id === f.activityId)) {
        setError('Chọn Activity hiện có trong chuyến đi.');
        return;
      }
      fields = {
        scopeType: f.scopeType,
        planDate: f.scopeType === 'DAY' ? f.planDate : null,
        activityId: f.scopeType === 'ACTIVITY' ? f.activityId : null,
        label: f.label?.trim(),
        description: f.description?.trim() || null,
        publicDescription: f.publicDescription?.trim() || null,
      };
    } else {
      if (f.dueDate && !validCalendarDate(f.dueDate)) {
        setError('Ngày hạn không hợp lệ.');
        return;
      }
      const before = item as PackingItemViewModel | undefined;
      const unchanged =
        before &&
        packingFormFromItem({ ...before, reminder: null }, trip.timezone).dueDate === f.dueDate;
      fields = {
        name: f.name?.trim(),
        quantity: f.quantity?.trim(),
        unit: f.unit?.trim() || null,
        category: f.category?.trim() || null,
        note: f.note?.trim() || null,
        dueAt: unchanged
          ? draft.dueAt
          : f.dueDate
            ? packingDateToIso(f.dueDate, trip.timezone)
            : null,
      };
    }
    const intent = parsePreparationIntent({
      operation: `${module}-${item ? 'update' : 'create'}`,
      ...(item ? { id: item.id } : {}),
      fields,
    });
    if (!intent) {
      setError(
        'Kiểm tra các trường: tên, số lượng dương (tối đa 99.999.999,99), tọa độ theo cặp (tối đa 6 số lẻ), ngày/phạm vi hợp lệ.',
      );
      return;
    }
    if (await commands.submit(intent)) setDraft(null);
  };
  if (!enabled || legacy) return null;
  return (
    <div className={styles.actions}>
      <Button
        variant="outline"
        disabled={
          commands.locked || (!item && module === 'location' && plan.selectedLocations.length >= 50)
        }
        onClick={edit}
      >
        {item ? 'Sửa' : candidate ? 'Lưu' : 'Thêm'} {label}
      </Button>
      {item && (
        <Button variant="outline" disabled={commands.locked} onClick={() => setDeleting(true)}>
          Xóa {label}
        </Button>
      )}
      {deleting && affected.length > 0 ? (
        <Alert>
          <p>Gỡ hoặc đổi địa điểm của các Activity sau trước khi xóa:</p>
          <ul>
            {affected.map((a) => (
              <li key={a.id}>
                {a.title}
                {!a.startsAt ? ' · Chưa xếp giờ' : ''}
              </li>
            ))}
          </ul>
          <Link to={paths.plan(trip.id)}>Mở lịch trình để chỉnh sửa Activity</Link>
          <Button onClick={() => setDeleting(false)}>Đóng</Button>
        </Alert>
      ) : (
        <ConfirmDialog
          open={deleting}
          title={`Xóa ${label}?`}
          description="Thao tác sẽ lưu trên server, không chỉ trên thiết bị này."
          busy={commands.pending}
          disabled={commands.locked || !enabled}
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            if (!enabled || !item || commands.locked || affected.length) return;
            const intent = parsePreparationIntent({ operation: `${module}-delete`, id: item.id });
            if (intent)
              void commands.submit(intent).then((ok) => {
                if (ok) setDeleting(false);
              });
          }}
        />
      )}
      <Drawer
        open={!!draft}
        side="right"
        label={`${item ? 'Sửa' : 'Thêm'} ${label}`}
        onDismiss={() => {
          if (!commands.pending) setDraft(null);
        }}
      >
        {draft && (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={commands.pending || !enabled} className={styles.form}>
              {module === 'dress' && (
                <>
                  <Select
                    label="Phạm vi"
                    value={draft.fields.scopeType}
                    onChange={(e) => update('scopeType', e.target.value)}
                  >
                    <option value="DAY">Theo ngày</option>
                    <option value="ACTIVITY">Theo Activity</option>
                  </Select>
                  {draft.fields.scopeType === 'DAY' ? (
                    <Input
                      label="Ngày"
                      type="date"
                      required
                      value={draft.fields.planDate}
                      onChange={(e) => update('planDate', e.target.value)}
                    />
                  ) : (
                    <Select
                      label="Activity"
                      required
                      value={draft.fields.activityId}
                      onChange={(e) => update('activityId', e.target.value)}
                    >
                      <option value="">Chọn Activity</option>
                      {plan.activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </>
              )}
              <Input
                label={module === 'dress' ? 'Tiêu đề' : 'Tên'}
                required
                maxLength={module === 'dress' ? 100 : module === 'packing' ? 200 : 255}
                value={draft.fields[module === 'dress' ? 'label' : 'name'] ?? ''}
                onChange={(e) => update(module === 'dress' ? 'label' : 'name', e.target.value)}
              />
              {module === 'location' && (
                <>
                  <Input
                    label="Địa chỉ"
                    value={draft.fields.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                  <Input
                    label="Vĩ độ"
                    inputMode="decimal"
                    value={draft.fields.latitude}
                    onChange={(e) => update('latitude', e.target.value)}
                  />
                  <Input
                    label="Kinh độ"
                    inputMode="decimal"
                    value={draft.fields.longitude}
                    onChange={(e) => update('longitude', e.target.value)}
                  />
                </>
              )}
              {module === 'dress' && (
                <>
                  <Textarea
                    label="Mô tả"
                    value={draft.fields.description}
                    onChange={(e) => update('description', e.target.value)}
                  />
                  <Textarea
                    label="Mô tả công khai"
                    value={draft.fields.publicDescription}
                    onChange={(e) => update('publicDescription', e.target.value)}
                  />
                </>
              )}
              {module === 'packing' && (
                <>
                  <Input
                    label="Số lượng"
                    required
                    inputMode="decimal"
                    value={draft.fields.quantity}
                    onChange={(e) => update('quantity', e.target.value)}
                  />
                  <Input
                    label="Đơn vị"
                    maxLength={30}
                    value={draft.fields.unit}
                    onChange={(e) => update('unit', e.target.value)}
                  />
                  <Input
                    label="Phân loại"
                    maxLength={80}
                    value={draft.fields.category}
                    onChange={(e) => update('category', e.target.value)}
                  />
                  <Textarea
                    label="Ghi chú"
                    maxLength={500}
                    value={draft.fields.note}
                    onChange={(e) => update('note', e.target.value)}
                  />
                  <Input
                    label="Hạn chuẩn bị"
                    type="date"
                    value={draft.fields.dueDate}
                    onChange={(e) => update('dueDate', e.target.value)}
                  />
                  <p>
                    Phân công là thao tác riêng sau khi lưu. Đổi tên hoặc số lượng sẽ đưa vật dụng
                    về chưa hoàn thành.
                  </p>
                </>
              )}
            </fieldset>
            {error && <p role="alert">{error}</p>}
            {draft.version !== plan.planVersion && (
              <p role="alert">Plan đã thay đổi; bản nháp chưa được lưu.</p>
            )}
            <PreparationStatus {...props} />
            <Button
              type="submit"
              disabled={commands.locked || !enabled || draft.version !== plan.planVersion}
            >
              Lưu {label}
            </Button>
            <Button variant="outline" disabled={commands.pending} onClick={() => setDraft(null)}>
              Đóng
            </Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}

export function PackingCompletion({
  item,
  ...props
}: PreparationProps & { item: PackingItemViewModel }) {
  const commands = usePreparationCommands(props);
  if (
    !props.plan.capabilities?.packing_completion ||
    !canTogglePacking(props.trip, props.plan, item)
  )
    return null;
  return (
    <Button
      variant="outline"
      aria-pressed={item.status === 'COMPLETED'}
      disabled={commands.locked}
      onClick={() =>
        void commands.submit({
          operation: 'packing-completion',
          id: item.id,
          status: item.status === 'COMPLETED' ? 'TODO' : 'COMPLETED',
        })
      }
    >
      {item.status === 'COMPLETED' ? 'Bỏ hoàn thành' : 'Hoàn thành'} {item.name}
    </Button>
  );
}
export function PackingAssignment(props: PreparationProps & { item: PackingItemViewModel }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [version, setVersion] = useState(0);
  const { membership } = useMembersRepositories();
  const commands = usePreparationCommands(props);
  const enabled =
    activePlan(props.trip) &&
    props.plan.permissions.canEdit &&
    props.plan.capabilities?.packing_assignment === true;
  const roster = useQuery({
    queryKey: [
      'members',
      props.trip.id,
      'packing-assignment',
      props.trip.currentMembership.userId,
      props.trip.membershipRevision,
    ],
    enabled: open && enabled,
    queryFn: async ({ signal }) => {
      const items: MembershipViewModel[] = [];
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const result = await membership.listMembers({
          tripId: props.trip.id,
          scenario: 'success',
          signal,
          includeLeft: false,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        if (result.status === 'error') throw Error(result.error.code);
        if (result.status === 'empty') break;
        items.push(
          ...result.data.items.filter((m) => m.leftAt === null && m.tripId === props.trip.id),
        );
        cursor = result.data.nextCursor ?? undefined;
        if (cursor) {
          if (seen.has(cursor) || seen.size >= 10) throw Error('Invalid member cursor');
          seen.add(cursor);
        }
      } while (cursor);
      return [...new Map(items.map((m) => [m.id, m])).values()];
    },
  });
  if (!enabled) return null;
  return (
    <>
      <Button
        variant="outline"
        disabled={commands.locked}
        onClick={() => {
          setSelected(props.item.assignedMemberId ?? '');
          setVersion(props.plan.planVersion);
          setOpen(true);
        }}
      >
        Phân công {props.item.name}
      </Button>
      <Drawer
        open={open}
        side="right"
        label="Phân công vật dụng"
        onDismiss={() => {
          if (!commands.pending) setOpen(false);
        }}
      >
        <div className={styles.form}>
          <Select
            label="Người chuẩn bị"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={roster.isPending || commands.locked}
          >
            <option value="">Chưa phân công</option>
            {roster.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.presentation.displayName ?? m.id}
              </option>
            ))}
          </Select>
          {roster.isError && (
            <Alert>
              Chưa tải được danh sách thành viên.{' '}
              <Button onClick={() => void roster.refetch()}>Tải lại</Button>
            </Alert>
          )}
          <p>
            Đổi người phụ trách sẽ đưa vật dụng về chưa hoàn thành. Lịch sử được giữ trên server.
          </p>
          {version !== props.plan.planVersion && (
            <Alert>Plan đã đổi. Đóng và mở lại để đối chiếu.</Alert>
          )}
          <PreparationStatus {...props} />
          <Button
            disabled={
              !enabled ||
              commands.locked ||
              !roster.data ||
              version !== props.plan.planVersion ||
              (!!selected && !roster.data.some((m) => m.id === selected))
            }
            onClick={() =>
              void commands
                .submit({
                  operation: 'packing-assignment',
                  id: props.item.id,
                  assignedMemberId: selected || null,
                })
                .then((ok) => {
                  if (ok) setOpen(false);
                })
            }
          >
            Lưu phân công
          </Button>
        </div>
      </Drawer>
    </>
  );
}
