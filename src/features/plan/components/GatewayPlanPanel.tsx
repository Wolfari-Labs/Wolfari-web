import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { restorePlanCommand, type PlanCommandIntent } from '../model/plan-command-intent';
import type { ActivityViewModel, PlanViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { usePlanRepository } from '../repositories/plan-context';
import { usePlanCommands } from '../hooks/use-plan-commands';
import { localTimeToIso } from '../model/plan-draft';
import { localDate, planDays } from '../model/plan-presentation';
import { lastTripDate } from '../../../shared/lib/calendar';
import { Button } from '../../../shared/components/Button';
import { Select } from '../../../shared/components/Select';
import { Input } from '../../../shared/components/Input';
import { Alert } from '../../../shared/components/Alert';
import styles from './GatewayPlanPanel.module.css';
import { Drawer } from '../../../shared/components/Drawer';
import { RuntimeTimeline } from './RuntimeTimeline';
import { ConfirmDialog } from '../../../shared/components/Ui';
import { Icon } from '../../../shared/components/Icon';

function clock(value: string | null, timezone: string) {
  return value
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(value))
    : '';
}

function ActivityForm({
  activity,
  trip,
  plan,
  disabled,
  targetDay,
  onSubmit,
  onCancel,
}: {
  activity: ActivityViewModel | null;
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  disabled: boolean;
  targetDay?: string;
  onSubmit: (fields: import('../model/plan').ActivityCreateInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(activity?.title ?? '');
  const [type, setType] = useState(activity?.activityType ?? 'SIGHTSEEING');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [publicDescription, setPublicDescription] = useState(activity?.publicDescription ?? '');
  const [location, setLocation] = useState(activity?.selectedLocationId ?? '');
  const [day, setDay] = useState(
    targetDay ??
      (activity?.startsAt
        ? localDate(activity.startsAt, trip.timezone)
        : (activity?.scheduledDate ?? '')),
  );
  const [endDay, setEndDay] = useState(
    targetDay === '' ? '' : activity?.endsAt ? localDate(activity.endsAt, trip.timezone) : '',
  );
  const [start, setStart] = useState(
    targetDay === '' ? '' : clock(activity?.startsAt ?? null, trip.timezone),
  );
  const [end, setEnd] = useState(
    targetDay === '' ? '' : clock(activity?.endsAt ?? null, trip.timezone),
  );
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    if (!title.trim() || title.trim().length > 255 || !type.trim() || type.trim().length > 40) {
      setError('Tên là bắt buộc (tối đa 255 ký tự); loại hoạt động là bắt buộc (tối đa 40 ký tự).');
      return;
    }
    if (Boolean(start) !== Boolean(end) || (Boolean(start) && !day)) {
      setError('Nhập cả hai mốc giờ cùng ngày bắt đầu, hoặc để trống giờ để lưu lịch chỉ có ngày.');
      return;
    }
    let startsAt: string | null = null;
    let endsAt: string | null = null;
    if (day && !planDays(trip.startAt, trip.endAt, trip.timezone).includes(day)) {
      setError('Ngày phải nằm trong chuyến đi.');
      return;
    }
    if (start && day) {
      try {
        startsAt = localTimeToIso(day, start, trip.timezone);
        endsAt = localTimeToIso(endDay || day, end, trip.timezone);
        if (
          clock(startsAt, trip.timezone) !== start ||
          clock(endsAt, trip.timezone) !== end ||
          localDate(startsAt, trip.timezone) !== day ||
          localDate(endsAt, trip.timezone) !== (endDay || day) ||
          Date.parse(endsAt) <= Date.parse(startsAt) ||
          Date.parse(startsAt) < Date.parse(trip.startAt) ||
          Date.parse(endsAt) > Date.parse(trip.endAt)
        )
          throw Error('time');
      } catch {
        setError('Giờ không hợp lệ: kết thúc phải sau bắt đầu và cả hai nằm trong chuyến đi.');
        return;
      }
    }
    if (location && !plan.selectedLocations.some((item) => item.id === location)) {
      setError('Địa điểm này không còn tồn tại.');
      return;
    }
    setError('');
    await onSubmit({
      title: title.trim(),
      activityType: type.trim(),
      description: description || null,
      publicDescription: publicDescription || null,
      selectedLocationId: location || null,
      startsAt,
      endsAt,
      scheduledDate: startsAt ? null : day || null,
      position: activity?.position ?? plan.activities.length,
    });
  };
  return (
    <form
      className={styles.form}
      onSubmit={(event) => void submit(event)}
      aria-label={activity ? 'Sửa hoạt động' : 'Thêm hoạt động'}
      noValidate
    >
      <h3>{activity ? 'Sửa hoạt động' : 'Thêm hoạt động'}</h3>
      {error && <Alert tone="error">{error}</Alert>}
      <fieldset disabled={disabled}>
        <Input
          ref={titleRef}
          label="Tên hoạt động"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
          required
        />
        <Input
          label="Loại hoạt động"
          value={type}
          onChange={(event) => setType(event.target.value)}
          maxLength={40}
          required
        />
        <Input
          label="Mô tả"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Input
          label="Mô tả công khai"
          value={publicDescription}
          onChange={(event) => setPublicDescription(event.target.value)}
        />
        <Select
          label="Địa điểm"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        >
          <option value="">Không liên kết địa điểm</option>
          {plan.selectedLocations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <p>
          Chọn ngày không cần giờ; có thể đặt giờ kết thúc vào ngày tiếp theo. Mọi thay đổi chỉ áp
          dụng cho hoạt động này.
        </p>
        <Input
          label="Ngày bắt đầu hoặc ngày chưa có giờ"
          type="date"
          value={day}
          min={localDate(trip.startAt, trip.timezone)}
          max={lastTripDate(trip.endAt, trip.timezone)}
          onChange={(event) => setDay(event.target.value)}
        />
        {activity?.startsAt && !day && (
          <Button
            variant="plain"
            onClick={() => {
              setDay(localDate(activity.startsAt!, trip.timezone));
              setStart(clock(activity.startsAt, trip.timezone));
              setEnd(clock(activity.endsAt, trip.timezone));
            }}
          >
            Khôi phục giờ trước khi sửa
          </Button>
        )}
        <Input
          label="Giờ bắt đầu"
          type="time"
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
        <Input
          label="Ngày kết thúc (nếu có giờ)"
          type="date"
          value={endDay}
          min={day || undefined}
          max={localDate(trip.endAt, trip.timezone)}
          onChange={(event) => setEndDay(event.target.value)}
        />
        <Input
          label="Giờ kết thúc"
          type="time"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
        />
        {day && (
          <Button
            variant="plain"
            onClick={() => {
              setDay('');
              setStart('');
              setEnd('');
              setEndDay('');
            }}
          >
            Bỏ ngày và giờ
          </Button>
        )}
        <div className={styles.actions}>
          <Button type="submit">Lưu</Button>
          <Button variant="outline" onClick={onCancel}>
            Hủy chỉnh sửa
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

export function GatewayPlanPanel({
  trip,
  plan,
  refresh,
  onBusyChange,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  refresh: () => Promise<boolean>;
  onBusyChange: (busy: boolean) => void;
}) {
  const repository = usePlanRepository();
  const restoreCommand = useCallback(
    (payload: unknown) => restorePlanCommand(repository, trip.id, payload),
    [repository, trip.id],
  );
  const commands = usePlanCommands({
    tripId: trip.id,
    planVersion: plan.planVersion,
    refresh,
    recoveryScope: `${trip.id}:${trip.currentMembership.userId}`,
    restoreCommand,
  });
  const execute = (intent: PlanCommandIntent) => {
    const command = restoreCommand(intent);
    return command ? commands.execute(command, intent) : Promise.resolve(false);
  };
  const [editing, setEditing] = useState<{
    activity: ActivityViewModel | null;
    version: number;
    targetDay?: string;
  } | null>(null);
  const [confirm, setConfirm] = useState<ActivityViewModel | null>(null);
  const [confirmVersion, setConfirmVersion] = useState(0);
  const addRef = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const alive =
    trip.archivedAt === null &&
    trip.lifecycle !== 'ARCHIVED' &&
    trip.currentMembership.leftAt === null;
  const canEdit = alive && plan.permissions.canEdit;
  const locked = commands.pending || commands.blocked;
  useEffect(() => {
    onBusyChange(locked);
    return () => onBusyChange(false);
  }, [locked, onBusyChange]);
  const close = () => {
    setEditing(null);
    setConfirm(null);
  };
  const items = [...plan.activities].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const messages = {
    VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Kiểm tra lại nội dung trước khi lưu.',
    PERMISSION_DENIED: 'Bạn không còn quyền thực hiện thao tác này.',
    RESOURCE_NOT_FOUND: 'Hoạt động hoặc chuyến đi không còn tồn tại.',
    UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn.',
    VERSION_CONFLICT: 'Lịch trình đã thay đổi. Tải lại để đối chiếu trước khi lưu lại.',
    STATE_CONFLICT: 'Trạng thái chuyến đi đã thay đổi. Tải lại để đối chiếu.',
    IDEMPOTENCY_CONFLICT: 'Yêu cầu trùng khóa nhưng khác nội dung. Tải lại để đối chiếu.',
    SERVICE_UNAVAILABLE:
      'Chưa xác định thay đổi đã được lưu hay chưa. Không gửi yêu cầu mới; tải lại để đối chiếu.',
    RESOURCE_EXHAUSTED: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    FINANCE_OBLIGATION_BLOCKED: 'Thao tác bị chặn bởi trạng thái chuyến đi.',
  };
  const move = async (id: string, offset: number) => {
    if (!canEdit || locked || !repository.reorderActivities) return;
    const ids = items.map((item) => item.id);
    const index = ids.indexOf(id),
      target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await execute({ kind: 'reorder', activityIds: ids });
  };
  return (
    <section className={styles.panel} aria-label="Hoạt động trong lịch trình">
      <header>
        <h2>Lịch trình chung</h2>
        <p>Cùng nhau tạo nên một hành trình đáng nhớ.</p>
        <details>
          <summary>Chi tiết đồng bộ</summary>
          <p>
            Phiên bản {plan.planVersion}. Đổi thứ tự giữ nguyên giờ. Ngày chưa có giờ cũng được lưu
            và chia sẻ với thành viên.
          </p>
        </details>
      </header>
      {!canEdit && (
        <Alert>
          Bạn có thể xem lịch trình
          {plan.permissions.canComplete && alive
            ? ' và hoàn tất hoạt động theo quyền của mình'
            : ''}
          .
        </Alert>
      )}
      {commands.status === 'success' && <Alert tone="success">Đã lưu thay đổi.</Alert>}
      {commands.pending && <Alert>Đang lưu thay đổi…</Alert>}
      {!commands.recoveryAvailable && (
        <Alert tone="error">
          Không thể lưu yêu cầu để phục hồi an toàn trong phiên này. Hãy bật bộ nhớ phiên rồi tải
          lại trước khi gửi thay đổi.
        </Alert>
      )}
      {commands.error && !editing && (
        <Alert tone="error">
          {messages[commands.error.code]}
          {commands.error.correlationId && (
            <details>
              <summary>Chi tiết hỗ trợ</summary>Mã đối chiếu: {commands.error.correlationId}
            </details>
          )}
        </Alert>
      )}
      <div className={styles.actions}>
        {!editing && (
          <Button
            variant="outline"
            disabled={commands.pending}
            onClick={() => void commands.reconcile()}
          >
            Tải lại để đối chiếu
          </Button>
        )}
        {commands.status === 'unknown' && !editing && (
          <Button
            disabled={!commands.canRetryUnknown || commands.pending}
            onClick={async () => {
              if (await commands.retryUnknown()) close();
            }}
          >
            Thử lại đúng yêu cầu cũ
          </Button>
        )}
        {canEdit && repository.createActivity && (
          <Button
            icon={<Icon name="plus" />}
            ref={addRef}
            disabled={locked || !!editing || !!confirm}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setEditing({ activity: null, version: plan.planVersion });
            }}
          >
            Thêm hoạt động
          </Button>
        )}
      </div>
      <Drawer
        returnFocusRef={trigger}
        open={!!editing}
        label="Chỉnh sửa lịch trình"
        side="right"
        onDismiss={close}
      >
        {editing && (
          <>
            {commands.error && (
              <Alert tone="error">
                {messages[commands.error.code]}
                {commands.error.correlationId && (
                  <details>
                    <summary>Chi tiết hỗ trợ</summary>
                    {commands.error.correlationId}
                  </details>
                )}
              </Alert>
            )}
            <Button
              variant="outline"
              disabled={commands.pending}
              onClick={() => void commands.reconcile()}
            >
              Tải lại để đối chiếu
            </Button>
            {commands.status === 'unknown' && (
              <Button
                disabled={!commands.canRetryUnknown || commands.pending}
                onClick={async () => {
                  if (await commands.retryUnknown()) close();
                }}
              >
                Thử lại đúng yêu cầu cũ
              </Button>
            )}
            {editing.version !== plan.planVersion && (
              <Alert tone="warning">
                Lịch trình đã thay đổi. Nội dung bạn nhập vẫn được giữ. Xem danh sách mới trước khi
                xác nhận lưu lại.
              </Alert>
            )}
            {editing.version !== plan.planVersion && (
              <Button
                disabled={locked}
                onClick={() => setEditing({ ...editing, version: plan.planVersion })}
              >
                Đã đối chiếu, giữ nội dung nhập
              </Button>
            )}
            <ActivityForm
              key={editing.activity?.id ?? 'new'}
              activity={editing.activity}
              trip={trip}
              plan={plan}
              {...(editing.targetDay !== undefined ? { targetDay: editing.targetDay } : {})}
              disabled={locked || !canEdit || editing.version !== plan.planVersion}
              onCancel={close}
              onSubmit={async (fields) => {
                if (!canEdit || locked) return false;
                const result = editing.activity
                  ? await execute({
                      kind: 'update',
                      activityId: editing.activity!.id,
                      fields: {
                        title: fields.title,
                        activityType: fields.activityType,
                        description: fields.description ?? null,
                        publicDescription: fields.publicDescription ?? null,
                        selectedLocationId: fields.selectedLocationId ?? null,
                        startsAt: fields.startsAt ?? null,
                        endsAt: fields.endsAt ?? null,
                        scheduledDate: fields.scheduledDate ?? null,
                      },
                    })
                  : await execute({ kind: 'create', activity: fields });
                if (result) close();
                return result;
              }}
            />
          </>
        )}
      </Drawer>
      <ConfirmDialog
        open={!!confirm}
        title="Xóa hoạt động?"
        description={
          confirmVersion !== plan.planVersion
            ? 'Dữ liệu đã thay đổi. Hủy và chọn lại hoạt động sau khi đối chiếu.'
            : `Xóa “${confirm?.title ?? ''}”? Dress Code gắn với hoạt động cũng có thể bị xóa.`
        }
        confirmLabel="Xác nhận xóa"
        busy={commands.pending}
        onCancel={close}
        onConfirm={() => {
          if (confirm && !locked && canEdit && confirmVersion === plan.planVersion)
            void execute({ kind: 'delete', activityId: confirm.id }).then((ok) => {
              if (ok) close();
            });
        }}
      />
      <RuntimeTimeline
        trip={trip}
        plan={plan}
        disabled={locked || !!editing || !!confirm}
        canEdit={canEdit}
        onEdit={(activity) => {
          trigger.current = document.activeElement as HTMLElement;
          setEditing({ activity, version: plan.planVersion });
        }}
        onDelete={(activity) => {
          trigger.current = document.activeElement as HTMLElement;
          setConfirm(activity);
          setConfirmVersion(plan.planVersion);
        }}
        onComplete={(activity) => {
          void execute({
            kind: 'completion',
            activityId: activity.id,
            status: activity.status === 'TODO' ? 'COMPLETED' : 'TODO',
          });
        }}
        onMove={(id, offset) => void move(id, offset)}
        onReorder={(activityIds) => {
          void execute({ kind: 'reorder', activityIds });
        }}
        onDay={(activity, day) => {
          if (activity.startsAt) {
            setEditing({
              activity,
              targetDay: day === 'POOL' ? '' : day,
              version: plan.planVersion,
            });
          } else
            void execute({
              kind: 'update',
              activityId: activity.id,
              fields: { startsAt: null, endsAt: null, scheduledDate: day === 'POOL' ? null : day },
            });
        }}
      />
    </section>
  );
}
