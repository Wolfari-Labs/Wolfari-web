import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { paths } from '../../../app/route-paths';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';
import { useMembersRepositoriesOptional } from '../../members/repositories/members-context';
import type { MembershipViewModel } from '../../members/model/members';
import { usePlanRepository } from '../../plan/repositories/plan-context';
import type { TripDetailViewModel } from '../model/trip-detail';
import type { PersonalReminder, TripManagementAction } from '../repositories/trip.repository';
import { useTripRepository } from '../repositories/repository-context';
import { localTimeToIso } from '../../plan/model/plan-draft';
import { TripPlanExport } from './TripPlanExport';
import styles from './TripSettingsOperations.module.css';

interface LifecycleAttempt {
  action: TripManagementAction;
  reason: string;
  newOwnerMemberId?: string;
  expectedPlanVersion: number;
  expectedMembershipRevision: number;
  expectedExportRevision: number;
  idempotencyKey: string;
}

interface ReminderAttempt {
  sourceType: PersonalReminder['source_type'];
  sourceId: string;
  remindAt: string;
  idempotencyKey: string;
}

type LifecycleSection = 'archive' | 'delete' | 'transfer';
type OperationsSection = 'export' | 'notifications' | LifecycleSection;

const lifecycleLabels: Record<TripManagementAction, string> = {
  ARCHIVE: 'Lưu trữ chuyến đi',
  REOPEN: 'Mở lại chuyến đi',
  DELETE: 'Xóa chuyến đi',
  TRANSFER: 'Chuyển quyền Owner',
};

function ignoreBusyChange() {}

function validReminderAttempt(value: unknown): value is ReminderAttempt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<ReminderAttempt>;
  return (
    (row.sourceType === 'ACTIVITY' || row.sourceType === 'PACKING') &&
    typeof row.sourceId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(row.sourceId) &&
    typeof row.remindAt === 'string' &&
    Number.isFinite(Date.parse(row.remindAt)) &&
    typeof row.idempotencyKey === 'string' &&
    /^[0-9a-f-]{36}$/i.test(row.idempotencyKey)
  );
}

function readReminderAttempt(key: string): { value: ReminderAttempt | null; invalid: boolean } {
  try {
    const raw = browserStorage('sessionStorage')?.getItem(key) ?? null;
    if (!raw) return { value: null, invalid: false };
    const value: unknown = JSON.parse(raw);
    return validReminderAttempt(value) ? { value, invalid: false } : { value: null, invalid: true };
  } catch {
    return { value: null, invalid: true };
  }
}

function validLifecycleAttempt(value: unknown): value is LifecycleAttempt {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<LifecycleAttempt>;
  return (
    ['ARCHIVE', 'REOPEN', 'DELETE', 'TRANSFER'].includes(v.action ?? '') &&
    typeof v.reason === 'string' &&
    typeof v.expectedPlanVersion === 'number' &&
    Number.isSafeInteger(v.expectedPlanVersion) &&
    typeof v.expectedMembershipRevision === 'number' &&
    Number.isSafeInteger(v.expectedMembershipRevision) &&
    typeof v.expectedExportRevision === 'number' &&
    Number.isSafeInteger(v.expectedExportRevision) &&
    typeof v.idempotencyKey === 'string' &&
    /^[0-9a-f-]{36}$/i.test(v.idempotencyKey) &&
    (v.action !== 'TRANSFER' ||
      (typeof v.newOwnerMemberId === 'string' && /^[0-9a-f-]{36}$/i.test(v.newOwnerMemberId)))
  );
}

function readAttempt(key: string): { value: LifecycleAttempt | null; invalid: boolean } {
  try {
    const raw = browserStorage('sessionStorage')?.getItem(key) ?? null;
    if (!raw) return { value: null, invalid: false };
    const value: unknown = JSON.parse(raw);
    return validLifecycleAttempt(value)
      ? { value, invalid: false }
      : { value: null, invalid: true };
  } catch {
    return { value: null, invalid: true };
  }
}

function labelMember(member: MembershipViewModel) {
  return member.presentation.displayName ?? member.userId.slice(0, 8);
}

function sourceTimeToLocal(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

function reminderLabel(status: PersonalReminder['status']) {
  const labels: Record<PersonalReminder['status'], string> = {
    PENDING: 'Đang chờ',
    PROCESSING: 'Đang gửi',
    SENT: 'Đã gửi',
    CANCELLED: 'Đã hủy',
    FAILED: 'Không gửi được',
  };
  return labels[status];
}

function ReminderManager({
  trip,
  onBusyChange,
}: {
  trip: TripDetailViewModel;
  onBusyChange: (busy: boolean) => void;
}) {
  const repository = useTripRepository();
  const planRepository = usePlanRepository();
  const actor = trip.currentMembership.userId;
  const queryClient = useQueryClient();
  const attemptKey = `wolfari:trip-reminder:v1:${actor}:${trip.id}`;
  const initial = useRef(readReminderAttempt(attemptKey));
  const storage = useRef(createStorageFallback());
  const [source, setSource] = useState(
    initial.current.value
      ? `${initial.current.value.sourceType}:${initial.current.value.sourceId}`
      : '',
  );
  const [remindAt, setRemindAt] = useState(() =>
    initial.current.value ? sourceTimeToLocal(initial.current.value.remindAt, trip.timezone) : '',
  );
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  useEffect(() => {
    onBusyChange(!!busyId);
    return () => onBusyChange(false);
  }, [busyId, onBusyChange]);
  const [attempt, setAttempt] = useState<ReminderAttempt | null>(initial.current.value);
  const [unknown, setUnknown] = useState(!!initial.current.value);
  const [invalidAttempt] = useState(initial.current.invalid);
  const planQuery = useQuery({
    queryKey: ['plan', trip.id, 'reminder-sources', actor],
    enabled: !!repository.createReminder,
    queryFn: async ({ signal }) => {
      const result = await planRepository.getPlan({ tripId: trip.id, scenario: 'success', signal });
      if (result.status !== 'ready') throw Error('Plan unavailable');
      return result.data;
    },
  });
  const list = useQuery({
    queryKey: ['trip', 'reminders', trip.id, actor],
    enabled: !!repository.listReminders,
    queryFn: ({ signal }) => repository.listReminders!({ tripId: trip.id, signal }),
  });
  const sources = useMemo(() => {
    const plan = planQuery.data;
    return [
      ...(plan?.activities.flatMap((item) =>
        item.startsAt && item.status === 'TODO'
          ? [{ id: item.id, type: 'ACTIVITY' as const, label: item.title, dueAt: item.startsAt }]
          : [],
      ) ?? []),
      ...(plan?.packingItems.flatMap((item) =>
        item.dueAt && item.status === 'TODO'
          ? [{ id: item.id, type: 'PACKING' as const, label: item.name, dueAt: item.dueAt }]
          : [],
      ) ?? []),
    ];
  }, [planQuery.data]);
  const selected = sources.find((item) => `${item.type}:${item.id}` === source);
  const pendingReminders = list.data?.filter((item) => item.status === 'PENDING') ?? [];

  async function submit() {
    if (!repository.createReminder || busyId) return;
    const retry = unknown && attempt;
    let next = attempt;
    if (!retry) {
      if (list.isPending || list.isError) {
        setError('Tải danh sách lời nhắc thành công trước khi tạo lời nhắc mới.');
        return;
      }
      if (pendingReminders.length >= 50) {
        setError('Đã đạt giới hạn 50 lời nhắc đang chờ cho chuyến đi này.');
        return;
      }
      if (!selected || !remindAt) {
        setError('Chọn một mục có thời hạn và thời điểm nhắc.');
        return;
      }
      let remindInstant: string;
      try {
        remindInstant = localTimeToIso(remindAt.slice(0, 10), remindAt.slice(11), trip.timezone);
      } catch {
        setError('Thời điểm nhắc không hợp lệ trong múi giờ của chuyến đi.');
        return;
      }
      const remindTime = Date.parse(remindInstant);
      if (remindTime <= Date.now() || remindTime > Date.parse(selected.dueAt)) {
        setError('Thời điểm nhắc phải nằm trong tương lai và không muộn hơn thời hạn.');
        return;
      }
      next = {
        sourceType: selected.type,
        sourceId: selected.id,
        remindAt: remindInstant,
        idempotencyKey: crypto.randomUUID(),
      };
      if (
        storage.current.write(
          browserStorage('sessionStorage'),
          attemptKey,
          JSON.stringify(next),
        ) !== 'saved'
      ) {
        setError('Không thể lưu yêu cầu vào bộ nhớ phiên; lời nhắc chưa được gửi.');
        return;
      }
      setAttempt(next);
    }
    if (!next) return;
    setBusyId('create');
    setError('');
    try {
      await repository.createReminder({
        tripId: trip.id,
        sourceType: next.sourceType,
        sourceId: next.sourceId,
        remindAt: next.remindAt,
        idempotencyKey: next.idempotencyKey,
        signal: new AbortController().signal,
      });
      storage.current.write(browserStorage('sessionStorage'), attemptKey, null);
      setAttempt(null);
      setUnknown(false);
      setSource('');
      setRemindAt('');
      await queryClient.invalidateQueries({ queryKey: ['trip', 'reminders', trip.id] });
    } catch (cause) {
      const status =
        cause && typeof cause === 'object' && 'status' in cause
          ? Number((cause as { status?: unknown }).status)
          : null;
      if (status !== null && status >= 400 && status < 500) {
        storage.current.write(browserStorage('sessionStorage'), attemptKey, null);
        setAttempt(null);
        setUnknown(false);
        setError(
          status === 409
            ? 'Backend từ chối lời nhắc do trạng thái hoặc giới hạn đã thay đổi. Tải lại danh sách rồi thử lại.'
            : 'Backend từ chối lời nhắc. Kiểm tra mục được chọn rồi thử lại.',
        );
        await queryClient.invalidateQueries({ queryKey: ['trip', 'reminders', trip.id] });
      } else {
        setUnknown(true);
        setError('Chưa xác định được kết quả. Thử lại sẽ gửi lại đúng yêu cầu cũ.');
      }
    } finally {
      setBusyId('');
    }
  }

  async function cancel(reminderId: string) {
    if (!repository.cancelReminder || busyId) return;
    setBusyId(reminderId);
    setError('');
    try {
      await repository.cancelReminder({
        tripId: trip.id,
        reminderId,
        signal: new AbortController().signal,
      });
      await queryClient.invalidateQueries({ queryKey: ['trip', 'reminders', trip.id] });
    } catch {
      setError('Chưa hủy được lời nhắc. Tải lại danh sách để kiểm tra trạng thái.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <section className={styles.section} aria-labelledby="trip-reminders-heading">
      <h3 id="trip-reminders-heading">Thông báo của bạn</h3>
      {!repository.listReminders || !repository.createReminder ? (
        <p>Thông báo theo chuyến đi chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
      ) : (
        <>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Select
              label="Mục cần nhắc"
              value={source}
              disabled={!!attempt || planQuery.isPending || planQuery.isError}
              onChange={(event) => {
                setSource(event.target.value);
                setRemindAt('');
              }}
            >
              <option value="">Chọn hoạt động hoặc vật dụng</option>
              {sources.map((item) => (
                <option key={item.type + item.id} value={`${item.type}:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Input
              label="Thời điểm nhắc"
              type="datetime-local"
              value={remindAt}
              disabled={!!attempt}
              max={selected ? sourceTimeToLocal(selected.dueAt, trip.timezone) : undefined}
              onChange={(event) => setRemindAt(event.target.value)}
            />
            <Button
              type="submit"
              loading={busyId === 'create'}
              disabled={
                !!busyId ||
                invalidAttempt ||
                (!attempt &&
                  (!selected || pendingReminders.length >= 50 || list.isPending || list.isError))
              }
            >
              {unknown ? 'Thử lại đúng yêu cầu cũ' : 'Tạo lời nhắc'}
            </Button>
          </form>
          {invalidAttempt && (
            <Alert tone="warning">
              Yêu cầu nhắc đã lưu không hợp lệ. Hãy tải lại Trip để đối chiếu trước khi tạo yêu cầu
              khác.
            </Alert>
          )}
          {planQuery.isError && (
            <Alert tone="warning">Chưa tải được các mục có thời hạn trong Plan.</Alert>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          {list.isPending ? (
            <p role="status">Đang tải lời nhắc…</p>
          ) : list.isError ? (
            <Alert tone="error">Chưa tải được lời nhắc. Tải lại trang để thử lại.</Alert>
          ) : (
            <ul className={styles.reminders}>
              {(list.data ?? []).map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{reminderLabel(item.status)}</strong>
                    <small>
                      {new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: trip.timezone,
                      }).format(new Date(item.remind_at))}
                    </small>
                  </span>
                  {item.status === 'PENDING' && repository.cancelReminder && (
                    <Button
                      variant="outline"
                      disabled={!!busyId}
                      loading={busyId === item.id}
                      onClick={() => void cancel(item.id)}
                    >
                      Hủy
                    </Button>
                  )}
                </li>
              ))}
              {!list.data?.length && <li>Chưa có lời nhắc cá nhân.</li>}
              {pendingReminders.length >= 50 && <li>Đã đạt giới hạn 50 lời nhắc đang chờ.</li>}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function TripLifecycleManager({
  trip,
  section,
  onBusyChange,
  initialTransferMemberId,
}: {
  trip: TripDetailViewModel;
  section: LifecycleSection;
  onBusyChange: (busy: boolean) => void;
  initialTransferMemberId?: string;
}) {
  const repository = useTripRepository();
  const membership = useMembersRepositoriesOptional()?.membership;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const owner = trip.currentMembership.role === 'OWNER';
  const archived = trip.lifecycle === 'ARCHIVED';
  const requestedAction: TripManagementAction =
    section === 'delete'
      ? 'DELETE'
      : section === 'transfer'
        ? 'TRANSFER'
        : archived
          ? 'REOPEN'
          : 'ARCHIVE';
  const key = `wolfari:trip-lifecycle:v1:${trip.currentMembership.userId}:${trip.id}`;
  const initial = useRef(readAttempt(key));
  const [attempt, setAttempt] = useState(initial.current.value);
  const [invalidAttempt, setInvalidAttempt] = useState(initial.current.invalid);
  const action = attempt?.action ?? requestedAction;
  const [reason, setReason] = useState(initial.current.value?.reason ?? '');
  const [newOwner, setNewOwner] = useState(
    initial.current.value?.newOwnerMemberId ?? initialTransferMemberId ?? '',
  );
  const [confirmed, setConfirmed] = useState(!!initial.current.value);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  const [unknown, setUnknown] = useState(!!initial.current.value);
  const [error, setError] = useState('');
  const storage = useRef(createStorageFallback());
  const transferAvailable = !archived || !!attempt;
  const roster = useInfiniteQuery({
    queryKey: [
      'members',
      trip.id,
      'trip-settings',
      trip.currentMembership.userId,
      trip.membershipRevision,
    ],
    enabled:
      owner &&
      !!repository.manageTrip &&
      !!membership &&
      action === 'TRANSFER' &&
      !attempt &&
      transferAvailable,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }) => {
      if (!membership) throw Error('Members repository unavailable');
      const result = await membership.listMembers({
        tripId: trip.id,
        scenario: 'success',
        signal,
        includeLeft: false,
        limit: 100,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      if (result.status === 'error') throw result.error;
      return result.status === 'ready' ? result.data : { items: [], nextCursor: null };
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const candidates =
    roster.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (member) =>
          member.tripId === trip.id &&
          member.leftAt === null &&
          member.id !== trip.currentMembership.id,
      ) ?? [];

  function persist(value: LifecycleAttempt | null) {
    const saved = storage.current.write(
      browserStorage('sessionStorage'),
      key,
      value ? JSON.stringify(value) : null,
    );
    if (saved !== 'saved') {
      setError('Không thể lưu yêu cầu vào bộ nhớ phiên; thao tác chưa được gửi.');
      return false;
    }
    setInvalidAttempt(false);
    return true;
  }
  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
      queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
      queryClient.invalidateQueries({ queryKey: ['plan', trip.id] }),
      queryClient.invalidateQueries({ queryKey: ['members', trip.id] }),
      queryClient.invalidateQueries({
        queryKey: ['finance', trip.currentMembership.userId, trip.id],
      }),
    ]);
  }
  async function submit() {
    if (
      !repository.manageTrip ||
      busy ||
      invalidAttempt ||
      !owner ||
      !trip.permissions.canRead ||
      trip.currentMembership.leftAt !== null ||
      (!unknown && action === 'TRANSFER' && !transferAvailable)
    )
      return;
    let snapshot = attempt;
    if (!unknown) {
      if (
        !confirmed ||
        !reason.trim() ||
        (action === 'TRANSFER' && !candidates.some((member) => member.id === newOwner))
      ) {
        setError('Nhập lý do và chọn thành viên mới nếu chuyển quyền Owner.');
        return;
      }
      snapshot = {
        action,
        reason: reason.trim(),
        ...(action === 'TRANSFER' ? { newOwnerMemberId: newOwner } : {}),
        expectedPlanVersion: trip.planVersion,
        expectedMembershipRevision: trip.membershipRevision,
        expectedExportRevision: trip.exportRevision,
        idempotencyKey: crypto.randomUUID(),
      };
      if (!persist(snapshot)) return;
      setAttempt(snapshot);
    }
    if (!snapshot) return;
    setBusy(true);
    setError('');
    try {
      await repository.manageTrip({
        tripId: trip.id,
        ...snapshot,
        signal: new AbortController().signal,
      });
      persist(null);
      setAttempt(null);
      setUnknown(false);
      setReason('');
      setNewOwner('');
      setConfirmed(false);
      await refresh();
      if (snapshot.action === 'DELETE') navigate(paths.trips, { replace: true });
    } catch (cause) {
      const status =
        cause && typeof cause === 'object' && 'status' in cause
          ? Number((cause as { status?: unknown }).status)
          : null;
      const kind =
        cause && typeof cause === 'object' && 'kind' in cause
          ? String((cause as { kind?: unknown }).kind)
          : '';
      if (
        [400, 403, 404, 409].includes(status ?? 0) ||
        (kind === 'http' && status !== null && status < 500)
      ) {
        persist(null);
        setAttempt(null);
        setUnknown(false);
        setError('Backend từ chối thao tác. Tải lại Trip để kiểm tra trạng thái và revision mới.');
        await refresh();
      } else {
        setUnknown(true);
        setError('Chưa xác định được kết quả. Thử lại sẽ dùng đúng payload và mã yêu cầu đã lưu.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!owner) return null;
  return (
    <section className={styles.section} aria-labelledby="trip-lifecycle-heading">
      <h3 id="trip-lifecycle-heading">{lifecycleLabels[requestedAction]}</h3>
      {!repository.manageTrip ? (
        <p>Lifecycle chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
      ) : (
        <>
          {attempt && action !== requestedAction && (
            <Alert tone="warning">
              Yêu cầu “{lifecycleLabels[action]}” trước đó chưa xác định được kết quả. Hãy thử lại
              đúng yêu cầu này trước khi thực hiện thao tác khác.
            </Alert>
          )}
          {invalidAttempt && (
            <Alert tone="warning">
              Yêu cầu lifecycle đã lưu không hợp lệ. Tải lại Trip trước khi gửi thao tác mới.
            </Alert>
          )}
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {action === 'TRANSFER' && (
              <Select
                label="Owner mới"
                value={newOwner}
                disabled={!!attempt || busy}
                onChange={(event) => setNewOwner(event.target.value)}
              >
                <option value="">Chọn thành viên</option>
                {attempt && !candidates.some((member) => member.id === newOwner) && (
                  <option value={newOwner}>Thành viên đã chọn trong yêu cầu đang chờ</option>
                )}
                {candidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {labelMember(member)}
                  </option>
                ))}
              </Select>
            )}
            <Textarea
              label="Lý do"
              value={reason}
              maxLength={1000}
              disabled={!!attempt || busy}
              onChange={(event) => setReason(event.target.value)}
            />
            <label className={styles.confirm}>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={!!attempt || busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Tôi xác nhận thao tác này và đã kiểm tra các ràng buộc Finance.
            </label>
            {error && <Alert tone={unknown ? 'warning' : 'error'}>{error}</Alert>}
            {action === 'TRANSFER' && !attempt && !transferAvailable && (
              <Alert tone="warning">Mở lại chuyến đi trước khi chuyển quyền Owner.</Alert>
            )}
            {action === 'TRANSFER' && !attempt && roster.isError && (
              <Alert tone="error">Chưa tải đủ danh sách thành viên để chuyển quyền Owner.</Alert>
            )}
            {action === 'TRANSFER' && !attempt && !membership && (
              <Alert tone="warning">
                Danh sách thành viên chưa khả dụng để chuyển quyền Owner.
              </Alert>
            )}
            {action === 'TRANSFER' && !attempt && roster.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                disabled={roster.isFetchingNextPage}
                loading={roster.isFetchingNextPage}
                onClick={() => {
                  if (!roster.isFetchingNextPage) void roster.fetchNextPage();
                }}
              >
                Tải thêm thành viên
              </Button>
            )}
            <Button
              type="submit"
              loading={busy}
              disabled={
                busy ||
                invalidAttempt ||
                !confirmed ||
                (!unknown &&
                  ((action === 'TRANSFER' && !transferAvailable) ||
                    !reason.trim() ||
                    (action === 'TRANSFER' && !candidates.some((m) => m.id === newOwner))))
              }
              data-destructive={action === 'DELETE' || undefined}
            >
              {unknown
                ? 'Thử lại đúng yêu cầu cũ'
                : action === 'REOPEN'
                  ? 'Mở lại'
                  : action === 'DELETE'
                    ? 'Xóa chuyến đi'
                    : action === 'TRANSFER'
                      ? 'Chuyển Owner'
                      : 'Lưu trữ'}
            </Button>
          </form>
          {action !== 'REOPEN' && (
            <p className={styles.note}>
              Backend sẽ chặn thao tác nếu Finance còn nghĩa vụ chưa xử lý.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function TripSettingsOperations({
  trip,
  section,
  onBusyChange,
  initialTransferMemberId,
}: {
  trip: TripDetailViewModel;
  section: OperationsSection;
  onBusyChange?: (busy: boolean) => void;
  initialTransferMemberId?: string;
}) {
  const actor = trip.currentMembership.userId;
  const handleBusyChange = onBusyChange ?? ignoreBusyChange;
  if (!trip.permissions.canRead || trip.currentMembership.leftAt !== null) return null;

  return (
    <div className={styles.column}>
      <section className={styles.panel}>
        {section === 'export' ? (
          <TripPlanExport
            key={`${trip.id}:${actor}:${trip.planVersion}:${trip.membershipRevision}:${trip.exportRevision}`}
            trip={trip}
            onBusyChange={handleBusyChange}
          />
        ) : section === 'notifications' ? (
          <ReminderManager
            key={`${trip.id}:${actor}`}
            trip={trip}
            onBusyChange={handleBusyChange}
          />
        ) : (
          <TripLifecycleManager
            key={`${trip.id}:${actor}:${section}`}
            trip={trip}
            section={section}
            onBusyChange={handleBusyChange}
            {...(initialTransferMemberId ? { initialTransferMemberId } : {})}
          />
        )}
      </section>
    </div>
  );
}
