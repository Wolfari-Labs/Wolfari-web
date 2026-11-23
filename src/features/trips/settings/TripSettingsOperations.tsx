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
import type {
  PersonalReminder,
  TripManagementAction,
} from '../repositories/trip.repository';
import { useTripRepository } from '../repositories/repository-context';
import { useTripCoverImage } from '../hooks/use-trip-cover-image';
import { localTimeToIso } from '../../plan/model/plan-draft';
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
    return validReminderAttempt(value)
      ? { value, invalid: false }
      : { value: null, invalid: true };
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

function CoverEditor({ trip }: { trip: TripDetailViewModel }) {
  const repository = useTripRepository();
  const queryClient = useQueryClient();
  const cover = useTripCoverImage(trip.id, trip.presentation.coverAvailable);
  const coverSrc = cover.src ?? trip.presentation.cover?.src;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Chọn ảnh JPEG hoặc PNG có dung lượng tối đa 5 MB.');
      return;
    }
    if (!repository.uploadCover) {
      setError('Tải ảnh bìa chưa khả dụng trong chế độ dữ liệu hiện tại.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await repository.uploadCover({ tripId: trip.id, file, signal: new AbortController().signal });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', 'cover', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
      ]);
    } catch {
      setError('Chưa tải được ảnh bìa. Kiểm tra kết nối rồi thử lại.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!repository.removeCover || busy) return;
    setBusy(true);
    setError('');
    try {
      await repository.removeCover({ tripId: trip.id, signal: new AbortController().signal });
      await Promise.all([
        queryClient.removeQueries({ queryKey: ['trip', 'cover', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
      ]);
    } catch {
      setError('Chưa xóa được ảnh bìa. Trạng thái hiện tại chưa thay đổi trên giao diện.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.section} aria-labelledby="trip-cover-heading">
      <h3 id="trip-cover-heading">Ảnh bìa chuyến đi</h3>
      {coverSrc ? (
        <img className={styles.cover} src={coverSrc} alt="" />
      ) : cover.isError ? (
        <div>
          <Alert tone="error">Chưa tải được ảnh bìa.</Alert>
          <Button variant="outline" disabled={cover.isFetching} onClick={() => void cover.refetch()}>
            Tải lại ảnh
          </Button>
        </div>
      ) : (
        <p>
          {cover.isPending && repository.getCover && trip.presentation.coverAvailable
            ? 'Đang tải ảnh bìa…'
            : trip.presentation.coverAvailable
              ? 'Ảnh bìa chưa thể tải trong chế độ dữ liệu hiện tại.'
              : 'Chưa có ảnh bìa.'}
        </p>
      )}
      {trip.permissions.canUpdate && trip.lifecycle !== 'ARCHIVED' && (
        <div className={styles.actions}>
          <label className={styles.fileButton}>
            Chọn ảnh
            <input
              type="file"
              accept="image/jpeg,image/png"
              disabled={busy || !repository.uploadCover}
              onChange={(event) => {
                void upload(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {trip.presentation.coverAvailable && (
            <Button variant="outline" loading={busy} disabled={busy} onClick={() => void remove()}>
              Xóa ảnh
            </Button>
          )}
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </section>
  );
}

function ReminderManager({ trip }: { trip: TripDetailViewModel }) {
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
    initial.current.value
      ? sourceTimeToLocal(initial.current.value.remindAt, trip.timezone)
      : '',
  );
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
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
      <h3 id="trip-reminders-heading">Nhắc nhở của bạn</h3>
      {!repository.listReminders || !repository.createReminder ? (
        <p>Nhắc nhở theo Trip chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
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
                (!attempt && (!selected || pendingReminders.length >= 50 || list.isPending || list.isError))
              }
            >
              {unknown ? 'Thử lại đúng yêu cầu cũ' : 'Tạo lời nhắc'}
            </Button>
          </form>
          {invalidAttempt && (
            <Alert tone="warning">
              Yêu cầu nhắc đã lưu không hợp lệ. Hãy tải lại Trip để đối chiếu trước khi tạo yêu cầu khác.
            </Alert>
          )}
          {planQuery.isError && <Alert tone="warning">Chưa tải được các mục có thời hạn trong Plan.</Alert>}
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
  roster,
  canLoadMoreRoster,
  loadingRoster,
  loadMoreRoster,
  rosterError,
  rosterUnavailable,
  onDeleted,
}: {
  trip: TripDetailViewModel;
  roster: readonly MembershipViewModel[];
  canLoadMoreRoster: boolean;
  loadingRoster: boolean;
  loadMoreRoster: () => void;
  rosterError: boolean;
  rosterUnavailable: boolean;
  onDeleted: () => void;
}) {
  const repository = useTripRepository();
  const queryClient = useQueryClient();
  const owner = trip.currentMembership.role === 'OWNER';
  const key = `wolfari:trip-lifecycle:v1:${trip.currentMembership.userId}:${trip.id}`;
  const initial = useRef(readAttempt(key));
  const [attempt, setAttempt] = useState(initial.current.value);
  const [invalidAttempt, setInvalidAttempt] = useState(initial.current.invalid);
  const [action, setAction] = useState<TripManagementAction>(
    trip.lifecycle === 'ARCHIVED' ? 'REOPEN' : 'ARCHIVE',
  );
  const [reason, setReason] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(!!initial.current.value);
  const [error, setError] = useState('');
  const storage = useRef(createStorageFallback());

  useEffect(() => {
    if (attempt) {
      setAction(attempt.action);
      setReason(attempt.reason);
      setNewOwner(attempt.newOwnerMemberId ?? '');
      setConfirmed(true);
    }
  }, [attempt]);

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
      queryClient.invalidateQueries({ queryKey: ['finance', trip.currentMembership.userId, trip.id] }),
    ]);
  }
  async function submit() {
    if (!repository.manageTrip || busy || invalidAttempt) return;
    let snapshot = attempt;
    if (!unknown) {
      if (!reason.trim() || (action === 'TRANSFER' && !newOwner)) {
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
      await refresh();
      if (snapshot.action === 'DELETE') onDeleted();
    } catch (cause) {
      const status = cause && typeof cause === 'object' && 'status' in cause
        ? Number((cause as { status?: unknown }).status)
        : null;
      const kind = cause && typeof cause === 'object' && 'kind' in cause
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
  const archived = trip.lifecycle === 'ARCHIVED';
  const candidates = roster.filter(
    (member) => member.leftAt === null && member.id !== trip.currentMembership.id,
  );
  return (
    <section className={styles.section} aria-labelledby="trip-lifecycle-heading">
      <h3 id="trip-lifecycle-heading">Quản lý chuyến đi</h3>
      {!repository.manageTrip ? (
        <p>Lifecycle chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
      ) : (
        <>
          {invalidAttempt && (
            <Alert tone="warning">Yêu cầu lifecycle đã lưu không hợp lệ. Tải lại Trip trước khi gửi thao tác mới.</Alert>
          )}
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Select
              label="Thao tác"
              value={action}
              disabled={!!attempt || busy}
              onChange={(event) => setAction(event.target.value as TripManagementAction)}
            >
              {!archived && <option value="ARCHIVE">Lưu trữ chuyến đi</option>}
              {archived && <option value="REOPEN">Mở lại chuyến đi</option>}
              {!archived && <option value="TRANSFER">Chuyển quyền Owner</option>}
              <option value="DELETE">Xóa chuyến đi</option>
            </Select>
            {action === 'TRANSFER' && (
              <Select
                label="Owner mới"
                value={newOwner}
                disabled={!!attempt || busy}
                onChange={(event) => setNewOwner(event.target.value)}
              >
                <option value="">Chọn thành viên</option>
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
          {rosterError && (
            <Alert tone="error">Chưa tải đủ danh sách thành viên để chuyển quyền Owner.</Alert>
          )}
          {rosterUnavailable && (
            <Alert tone="warning">Danh sách thành viên chưa khả dụng để chuyển quyền Owner.</Alert>
          )}
          {canLoadMoreRoster && (
            <Button
              type="button"
              variant="outline"
              disabled={loadingRoster}
              loading={loadingRoster}
              onClick={loadMoreRoster}
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
                (!unknown && (!reason.trim() || (action === 'TRANSFER' && !candidates.some((m) => m.id === newOwner))))
              }
              data-destructive={action === 'DELETE' || undefined}
            >
              {unknown ? 'Thử lại đúng yêu cầu cũ' : action === 'REOPEN' ? 'Mở lại' : action === 'DELETE' ? 'Xóa chuyến đi' : action === 'TRANSFER' ? 'Chuyển Owner' : 'Lưu trữ'}
            </Button>
          </form>
          {action !== 'REOPEN' && (
            <p className={styles.note}>Backend sẽ chặn thao tác nếu Finance còn nghĩa vụ chưa xử lý.</p>
          )}
        </>
      )}
    </section>
  );
}

export function TripSettingsOperations({
  trip,
  ownerName,
}: {
  trip: TripDetailViewModel;
  ownerName: string | null;
}) {
  const repository = useTripRepository();
  const membersRepositories = useMembersRepositoriesOptional();
  const membership = membersRepositories?.membership;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const actor = trip.currentMembership.userId;
  const roster = useInfiniteQuery({
    queryKey: ['members', trip.id, 'trip-settings', actor, trip.membershipRevision],
    enabled:
      !!repository.manageTrip &&
      !!membership &&
      trip.currentMembership.role === 'OWNER',
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
  const members = roster.data?.pages.flatMap((page) => page.items) ?? [];
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  async function exportPlan() {
    if (!repository.planPdf || pdfBusy) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      const blob = await repository.planPdf({ tripId: trip.id, signal: new AbortController().signal });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `wolfari-plan-${trip.id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError('Chưa tải được Plan PDF. Thử lại sau.');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className={styles.column}>
      <section className={styles.panel} aria-labelledby="trip-members-reminders-heading">
        <h2 id="trip-members-reminders-heading">Thành viên & nhắc nhở</h2>
        <p>{trip.currentMembership.role === 'OWNER' ? `Chủ chuyến: ${ownerName ?? 'Bạn'}` : 'Bạn là thành viên chuyến đi'}</p>
        {repository.listReminders && repository.createReminder ? (
          <ReminderManager trip={trip} />
        ) : (
          <section className={styles.section}>
            <h3>Nhắc nhở của bạn</h3>
            <p>Nhắc nhở theo Trip chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
          </section>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="trip-files-heading">
        <h2 id="trip-files-heading">Ảnh & tài liệu</h2>
        <CoverEditor trip={trip} />
        <div className={styles.section}>
          <h3>Plan PDF</h3>
          {repository.planPdf ? (
            <>
              <Button variant="outline" loading={pdfBusy} disabled={pdfBusy} onClick={() => void exportPlan()}>
                Tải Plan PDF
              </Button>
              {pdfError && <Alert tone="error">{pdfError}</Alert>}
            </>
          ) : (
            <p>Tải Plan PDF chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
          )}
        </div>
      </section>
      <TripLifecycleManager
        trip={trip}
        roster={members}
        canLoadMoreRoster={!!roster.hasNextPage}
        loadingRoster={roster.isFetchingNextPage}
        rosterError={roster.isError}
        rosterUnavailable={!!repository.manageTrip && !membership}
        loadMoreRoster={() => {
          if (roster.hasNextPage && !roster.isFetchingNextPage) void roster.fetchNextPage();
        }}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ['trips', 'list'] });
          navigate(paths.trips, { replace: true });
        }}
      />
    </div>
  );
}
