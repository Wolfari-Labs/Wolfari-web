import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { restorePlanCommand, type PlanCommandIntent } from '../model/plan-command-intent';
import type { ActivityViewModel, PlanViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { usePlanRepository } from '../repositories/plan-context';
import { usePlanCommands } from '../hooks/use-plan-commands';
import { localTimeToIso } from '../model/plan-draft';
import { localDate } from '../model/plan-presentation';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Alert } from '../../../shared/components/Alert';
import styles from './GatewayPlanPanel.module.css';

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
  onSubmit,
  onCancel,
}: {
  activity: ActivityViewModel | null;
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  disabled: boolean;
  onSubmit: (fields: import('../model/plan').ActivityCreateInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(activity?.title ?? '');
  const [type, setType] = useState(activity?.activityType ?? 'SIGHTSEEING');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [publicDescription, setPublicDescription] = useState(activity?.publicDescription ?? '');
  const [location, setLocation] = useState(activity?.selectedLocationId ?? '');
  const [day, setDay] = useState(
    activity?.startsAt ? localDate(activity.startsAt, trip.timezone) : '',
  );
  const [start, setStart] = useState(clock(activity?.startsAt ?? null, trip.timezone));
  const [end, setEnd] = useState(clock(activity?.endsAt ?? null, trip.timezone));
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
    if (Boolean(day) !== Boolean(start) || Boolean(start) !== Boolean(end)) {
      setError(
        'Để lưu trên server, nhập đủ ngày và hai mốc giờ, hoặc để trống cả ba. Ngày chưa có giờ được giữ trong bản nháp trên thiết bị.',
      );
      return;
    }
    let startsAt: string | null = null;
    let endsAt: string | null = null;
    if (day) {
      try {
        startsAt = localTimeToIso(day, start, trip.timezone);
        endsAt = localTimeToIso(day, end, trip.timezone);
        if (
          clock(startsAt, trip.timezone) !== start ||
          clock(endsAt, trip.timezone) !== end ||
          localDate(startsAt, trip.timezone) !== day ||
          localDate(endsAt, trip.timezone) !== day ||
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
      setError('Địa điểm không còn tồn tại trên server.');
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
      position: activity?.position ?? plan.activities.length,
    });
  };
  return (
    <form
      className={styles.form}
      onSubmit={(event) => void submit(event)}
      aria-label={activity ? 'Sửa hoạt động trên server' : 'Tạo hoạt động trên server'}
      noValidate
    >
      <h3>{activity ? 'Sửa hoạt động trên server' : 'Tạo hoạt động trên server'}</h3>
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
        <label>
          Địa điểm trên server
          <select value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="">Không liên kết địa điểm</option>
            {plan.selectedLocations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {activity ? (
          <p>
            Đổi ngày được thực hiện trong bản nháp trên thiết bị và sẽ xóa giờ theo quy tắc sắp
            lịch.
          </p>
        ) : null}
        <Input
          label="Ngày có giờ trên server"
          type="date"
          value={day}
          min={localDate(trip.startAt, trip.timezone)}
          max={localDate(trip.endAt, trip.timezone)}
          disabled={!!activity}
          onChange={(event) => setDay(event.target.value)}
        />
        {activity && !day && (
          <p>Hoạt động chưa xếp lịch: chỉnh ngày/giờ trong bản nháp. Không tự xuất bản bản nháp.</p>
        )}
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
          label="Giờ bắt đầu trên server"
          type="time"
          disabled={!!activity && !day}
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
        <Input
          label="Giờ kết thúc trên server"
          type="time"
          disabled={!!activity && !day}
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
            }}
          >
            Bỏ lịch trên server
          </Button>
        )}
        <div className={styles.actions}>
          <Button type="submit">Lưu trên server</Button>
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
    (trigger.current ?? addRef.current)?.focus();
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
    <section className={styles.panel} aria-label="Hoạt động trên server">
      <header>
        <h2>Hoạt động trên server</h2>
        <p>
          Đã lưu trên server · Phiên bản {plan.planVersion}. Đổi thứ tự ở đây giữ nguyên giờ; kéo
          thả và đổi ngày thuộc bản nháp riêng trên thiết bị.
        </p>
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
      {commands.status === 'success' && <Alert tone="success">Đã lưu trên server.</Alert>}
      {commands.pending && <Alert>Đang xử lý, vui lòng chờ xác nhận từ server.</Alert>}
      {!commands.recoveryAvailable && (
        <Alert tone="error">
          Không thể lưu yêu cầu để phục hồi an toàn trong phiên này. Hãy bật bộ nhớ phiên rồi tải
          lại trước khi gửi thay đổi.
        </Alert>
      )}
      {commands.error && (
        <Alert tone="error">
          {messages[commands.error.code]}
          {commands.error.correlationId && (
            <span> Mã đối chiếu: {commands.error.correlationId}</span>
          )}
        </Alert>
      )}
      <div className={styles.actions}>
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
        {canEdit && repository.createActivity && (
          <Button
            ref={addRef}
            disabled={locked || !!editing || !!confirm}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setEditing({ activity: null, version: plan.planVersion });
            }}
          >
            Tạo hoạt động trên server
          </Button>
        )}
      </div>
      {editing && (
        <>
          {editing.version !== plan.planVersion && (
            <Alert tone="warning">
              Dữ liệu server đã đổi. Nội dung bạn nhập vẫn được giữ. Xem danh sách mới trước khi xác
              nhận lưu lại.
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
                    },
                  })
                : await execute({ kind: 'create', activity: fields });
              if (result) close();
              return result;
            }}
          />
        </>
      )}
      {confirm && (
        <div className={styles.form} role="group" aria-label="Xác nhận xóa hoạt động">
          <p>Xóa “{confirm.title}” trên server? Dress code gắn với hoạt động cũng có thể bị xóa.</p>
          {confirmVersion !== plan.planVersion && (
            <Alert tone="warning">
              Dữ liệu đã đổi. Hủy và chọn lại hoạt động sau khi đối chiếu để xác nhận xóa.
            </Alert>
          )}
          <Button
            disabled={locked || !canEdit || confirmVersion !== plan.planVersion}
            onClick={async () => {
              if (await execute({ kind: 'delete', activityId: confirm.id })) close();
            }}
          >
            Xác nhận xóa trên server
          </Button>
          <Button variant="outline" disabled={commands.pending} onClick={close}>
            Hủy xóa
          </Button>
        </div>
      )}
      <ol className={styles.list}>
        {items.map((activity, index) => {
          const canComplete =
            alive &&
            plan.permissions.canComplete &&
            (activity.status === 'TODO' ||
              canEdit ||
              activity.completedByUserId === trip.currentMembership.userId);
          return (
            <li key={activity.id} aria-label={activity.title} className={styles.item}>
              <h3>{activity.title}</h3>
              <p>
                {activity.activityType} ·{' '}
                {activity.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
              </p>
              <p>
                {activity.startsAt
                  ? `${localDate(activity.startsAt, trip.timezone)} · ${clock(activity.startsAt, trip.timezone)} – ${clock(activity.endsAt, trip.timezone)}`
                  : 'Chưa xếp lịch trên server'}
              </p>
              {activity.description && <p>{activity.description}</p>}
              <div className={styles.actions}>
                {canEdit && repository.updateActivity && (
                  <Button
                    variant="outline"
                    disabled={locked || !!editing || !!confirm}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setEditing({ activity, version: plan.planVersion });
                    }}
                  >
                    Sửa trên server
                  </Button>
                )}
                {canEdit && repository.deleteActivity && (
                  <Button
                    variant="outline"
                    disabled={locked || !!editing || !!confirm}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setConfirm(activity);
                      setConfirmVersion(plan.planVersion);
                    }}
                  >
                    Xóa trên server
                  </Button>
                )}
                {canComplete && repository.setActivityCompletion && (
                  <Button
                    variant="outline"
                    disabled={locked || !!editing || !!confirm}
                    onClick={() => {
                      const status = activity.status === 'TODO' ? 'COMPLETED' : 'TODO';
                      void execute({ kind: 'completion', activityId: activity.id, status });
                    }}
                  >
                    {activity.status === 'TODO' ? 'Hoàn tất' : 'Mở lại'}
                  </Button>
                )}
                {canEdit && repository.reorderActivities && (
                  <>
                    <Button
                      variant="plain"
                      disabled={locked || !!editing || !!confirm || index === 0}
                      onClick={() => void move(activity.id, -1)}
                    >
                      Đưa lên
                    </Button>
                    <Button
                      variant="plain"
                      disabled={locked || !!editing || !!confirm || index === items.length - 1}
                      onClick={() => void move(activity.id, 1)}
                    >
                      Đưa xuống
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {items.length === 0 && <p>Chưa có hoạt động trên server.</p>}
    </section>
  );
}
