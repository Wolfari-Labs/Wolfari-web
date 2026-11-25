import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { paths } from '../../../app/route-paths';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { PageBreadcrumb } from '../../../shared/components/PageBreadcrumb';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { TripHero } from '../components/TripHero';
import type { TripDetailViewModel } from '../model/trip-detail';
import type { TripListViewModel } from '../model/trip-list';
import { updateTripInListPages } from '../model/trip-list-cache';
import { tripQueryKeys } from '../model/trip-query-keys';
import { useTripRepository } from '../repositories/repository-context';
import type { UpdateTripIntent, UpdateTripResult } from '../repositories/trip.repository';
import styles from './TripSettingsPage.module.css';
import { calendarDate } from '../../../shared/lib/calendar';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';
import { useMembersRepositoriesOptional } from '../../members/repositories/members-context';
import { TripSettingsOperations } from './TripSettingsOperations';
import { TripSettingsOverlay, type TripSettingsSection } from './TripSettingsOverlay';

interface SavedSettingsAttempt {
  intent: UpdateTripIntent;
  draft: { name: string; description: string; publicDescription: string };
}

function readSettingsAttempt(raw: string | null): SavedSettingsAttempt | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('intent' in value) || !('draft' in value))
    throw Error('Invalid settings journal');
  const { intent, draft } = value;
  if (!intent || typeof intent !== 'object' || !draft || typeof draft !== 'object')
    throw Error('Invalid settings journal');
  if (
    !('idempotencyKey' in intent) ||
    typeof intent.idempotencyKey !== 'string' ||
    !intent.idempotencyKey ||
    !('expectedPlanVersion' in intent) ||
    !Number.isSafeInteger(intent.expectedPlanVersion) ||
    !('expectedExportRevision' in intent) ||
    !Number.isSafeInteger(intent.expectedExportRevision) ||
    !('name' in draft) ||
    typeof draft.name !== 'string' ||
    !('description' in draft) ||
    typeof draft.description !== 'string' ||
    !('publicDescription' in draft) ||
    typeof draft.publicDescription !== 'string'
  )
    throw Error('Invalid settings journal');
  const parsedIntent = intent as UpdateTripIntent;
  if (
    (parsedIntent.name !== undefined && typeof parsedIntent.name !== 'string') ||
    (parsedIntent.description !== undefined &&
      parsedIntent.description !== null &&
      typeof parsedIntent.description !== 'string') ||
    (parsedIntent.publicDescription !== undefined &&
      parsedIntent.publicDescription !== null &&
      typeof parsedIntent.publicDescription !== 'string') ||
    (parsedIntent.name === undefined &&
      parsedIntent.description === undefined &&
      parsedIntent.publicDescription === undefined)
  )
    throw Error('Invalid settings journal');
  return { intent: parsedIntent, draft: draft as SavedSettingsAttempt['draft'] };
}

function displayDate(value: string, timezone: string, exclusive = false) {
  const date = calendarDate(Date.parse(value) - (exclusive ? 1 : 0), timezone).split('-');
  return date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : value;
}

function requestKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `trip-settings-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function mutationMessage(result: Exclude<UpdateTripResult, { status: 'updated' }>) {
  switch (result.status) {
    case 'forbidden':
      return 'Bạn không còn quyền chỉnh sửa chuyến đi này.';
    case 'not-found':
      return 'Không tìm thấy chuyến đi để cập nhật.';
    case 'conflict':
      return 'Thông tin chuyến đi đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra bản nháp rồi xác nhận lưu lần nữa.';
    case 'unavailable':
      return 'Dịch vụ đang tạm gián đoạn. Bản nháp được giữ nguyên; bạn có thể thử lưu lại.';
    case 'unknown':
      return 'Chưa xác định được kết quả lưu. Bản nháp được giữ nguyên; thử lại sẽ dùng cùng mã yêu cầu.';
    case 'validation-error':
      return 'Vui lòng kiểm tra lại thông tin cần lưu.';
  }
}

function memberCountLabel(count: number | null) {
  return `${count ?? '—'} / —`;
}

function ReadOnlyTripField({ label, value }: { label: string; value: string }) {
  return (
    <dl className={styles.fieldBox}>
      <div className={styles.displayField}>
        <dt className={styles.fieldName}>{label}</dt>
        <dd className={styles.fieldValue}>{value}</dd>
      </div>
    </dl>
  );
}

function ReadOnlyTripSummary({
  trip,
  memberCount,
}: {
  trip: TripDetailViewModel;
  memberCount: number | null;
}) {
  return (
    <>
      <ReadOnlyTripField label="Địa điểm" value="Chưa cập nhật" />
      <ReadOnlyTripField
        label="Thành viên (hiện tại / tối đa)"
        value={memberCountLabel(memberCount)}
      />
      <ReadOnlyTripField label="Ngày đi" value={displayDate(trip.startAt, trip.timezone)} />
      <ReadOnlyTripField label="Ngày về" value={displayDate(trip.endAt, trip.timezone, true)} />
    </>
  );
}

function RowIcon({ name }: { name: IconName }) {
  return (
    <span className={styles.rowIcon} aria-hidden="true">
      <Icon name={name} size={16} />
    </span>
  );
}

function TripInformationView({
  trip,
  memberCount,
  onSettings,
  settingsRef,
}: {
  trip: TripDetailViewModel;
  memberCount: number | null;
  onSettings: () => void;
  settingsRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <section className={styles.card} aria-labelledby="trip-information-heading">
      <div className={styles.cardHeading}>
        <div className={styles.cardTitle}>
          <span className={styles.iconBadge} aria-hidden="true">
            <Icon name="settings" size={22} />
          </span>
          <div>
            <h2 id="trip-information-heading">Thông tin chuyến đi</h2>
            <p>Tên, địa điểm, thành viên và thời gian chuyến đi.</p>
          </div>
        </div>
        <Button
          ref={settingsRef}
          id="edit-trip-information"
          className={styles.settingsButton}
          icon={<Icon name="settings" size={18} />}
          onClick={onSettings}
        >
          Cài đặt chuyến đi
        </Button>
      </div>
      <div className={styles.viewBody}>
        <dl className={styles.informationGrid}>
          <div className={styles.fullWidth}>
            <dt>
              <RowIcon name="edit" />
              Tên chuyến đi
            </dt>
            <dd>{trip.name}</dd>
          </div>
          <div>
            <dt>
              <RowIcon name="map" />
              Địa điểm
            </dt>
            <dd>Chưa cập nhật</dd>
          </div>
          <div>
            <dt>
              <RowIcon name="members" />
              Thành viên (hiện tại / tối đa)
            </dt>
            <dd>{memberCountLabel(memberCount)}</dd>
          </div>
          <div>
            <dt>
              <RowIcon name="calendar" />
              Ngày đi
            </dt>
            <dd>{displayDate(trip.startAt, trip.timezone)}</dd>
          </div>
          <div>
            <dt>
              <RowIcon name="calendar" />
              Ngày về
            </dt>
            <dd>{displayDate(trip.endAt, trip.timezone, true)}</dd>
          </div>
          <div className={styles.descriptionBox}>
            <dt>
              <RowIcon name="fileText" />
              Mô tả chuyến đi
            </dt>
            <dd>{trip.description || 'Chưa có mô tả'}</dd>
          </div>
          {trip.publicDescription && (
            <div className={styles.descriptionBox}>
              <dt>
                <RowIcon name="share" />
                Mô tả công khai
              </dt>
              <dd>{trip.publicDescription}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

function EditableTripField({
  label,
  value,
  editing,
  disabled,
  multiline = false,
  error,
  onEdit,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  disabled: boolean;
  multiline?: boolean;
  error?: string | undefined;
  onEdit: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.fieldBox} data-editing={editing}>
      {editing ? (
        multiline ? (
          <Textarea
            label={label}
            value={value}
            disabled={disabled}
            error={error}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Input
            label={label}
            value={value}
            disabled={disabled}
            maxLength={201}
            error={error}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
          />
        )
      ) : (
        <div className={styles.displayField}>
          <span className={styles.fieldName}>{label}</span>
          <p className={styles.fieldValue}>{value || 'Chưa có mô tả'}</p>
          <button
            type="button"
            className={styles.editFieldButton}
            aria-label={`Chỉnh sửa ${label.toLocaleLowerCase('vi-VN')}`}
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              onEdit();
            }}
          >
            <Icon name="edit" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function TripInformationForm({
  trip,
  memberCount,
  onCancel,
  onSaved,
  onRefresh,
  canSave,
  onLockChange,
}: {
  trip: TripDetailViewModel;
  memberCount: number | null;
  onCancel: () => void;
  onSaved: (trip: TripDetailViewModel) => void;
  onRefresh: () => Promise<boolean>;
  canSave: boolean;
  onLockChange: (locked: boolean) => void;
}) {
  const repository = useTripRepository();
  const queryClient = useQueryClient();
  const journalKey = `wolfari:trip-settings:v1:${trip.currentMembership.userId}:${trip.id}`;
  const journal = useRef(createStorageFallback());
  const restored = useRef<{
    saved: SavedSettingsAttempt | null;
    blocked: boolean;
    invalid: boolean;
    storageIssue: boolean;
  } | null>(null);
  if (!restored.current) {
    const entry = journal.current.read(browserStorage('sessionStorage'), journalKey);
    try {
      const saved = readSettingsAttempt(entry.raw);
      restored.current = {
        saved,
        blocked: !!saved || entry.status !== 'saved',
        invalid: false,
        storageIssue: entry.status !== 'saved',
      };
    } catch {
      restored.current = { saved: null, blocked: true, invalid: true, storageIssue: false };
    }
  }
  const [name, setName] = useState(restored.current.saved?.draft.name ?? trip.name);
  const [description, setDescription] = useState(
    restored.current.saved?.draft.description ?? trip.description ?? '',
  );
  const [publicDescription, setPublicDescription] = useState(
    restored.current.saved?.draft.publicDescription ?? trip.publicDescription ?? '',
  );
  const [editing, setEditing] = useState({
    name: !!restored.current.saved,
    description: !!restored.current.saved,
    publicDescription: !!restored.current.saved,
  });
  const [result, setResult] = useState<Exclude<UpdateTripResult, { status: 'updated' }> | null>(
    null,
  );
  const [refreshingConflict, setRefreshingConflict] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [unresolvedIntent, setUnresolvedIntent] = useState(restored.current.blocked);
  const [invalidJournal, setInvalidJournal] = useState(restored.current.invalid);
  const [storageIssue, setStorageIssue] = useState(restored.current.storageIssue);
  const [unknownRefreshFailed, setUnknownRefreshFailed] = useState(false);
  const [reviewedCurrent, setReviewedCurrent] = useState(false);
  const attempt = useRef<{ fingerprint: string; intent: UpdateTripIntent } | null>(
    restored.current.saved ? { fingerprint: '', intent: restored.current.saved.intent } : null,
  );
  const controller = useRef<AbortController | null>(null);
  const trimmedName = name.trim();
  const nameDirty = trimmedName !== trip.name;
  const descriptionValue = description.trim() === '' ? null : description;
  const descriptionDirty = descriptionValue !== trip.description;
  const publicDescriptionValue = publicDescription.trim() === '' ? null : publicDescription;
  const publicDescriptionDirty = publicDescriptionValue !== trip.publicDescription;
  const dirty = nameDirty || descriptionDirty || publicDescriptionDirty;
  const saveAttempt = (intent: UpdateTripIntent) => {
    const record: SavedSettingsAttempt = {
      intent,
      draft: { name, description, publicDescription },
    };
    const saved =
      journal.current.write(
        browserStorage('sessionStorage'),
        journalKey,
        JSON.stringify(record),
      ) === 'saved';
    setStorageIssue(!saved);
    return saved;
  };
  const clearAttempt = () => {
    journal.current.write(browserStorage('sessionStorage'), journalKey, null);
    attempt.current = null;
  };
  const nameError =
    result?.status === 'validation-error' && result.fieldErrors.name
      ? result.fieldErrors.name
      : trimmedName.length === 0
        ? 'Tên chuyến đi không được để trống.'
        : trimmedName.length > 200
          ? 'Tên chuyến đi không được vượt quá 200 ký tự.'
          : undefined;

  useEffect(() => () => controller.current?.abort(), []);

  const mutation = useMutation({
    retry: false,
    mutationFn: async (intent: UpdateTripIntent) => {
      controller.current = new AbortController();
      return repository.updateTrip({ tripId: trip.id, intent, signal: controller.current.signal });
    },
  });

  useEffect(() => {
    onLockChange(mutation.isPending || refreshingConflict || unresolvedIntent);
  }, [mutation.isPending, refreshingConflict, unresolvedIntent, onLockChange]);
  useEffect(() => () => onLockChange(false), [onLockChange]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      mutation.isPending ||
      nameError ||
      refreshingConflict ||
      (!unresolvedIntent && (!dirty || refreshFailed || !canSave))
    )
      return;
    let intent: UpdateTripIntent;
    if (unresolvedIntent) {
      // An ambiguous response can only repeat the immutable original transaction.
      if (!attempt.current) return;
      intent = attempt.current.intent;
      if (!saveAttempt(intent)) return;
    } else {
      setResult(null);
      setReviewedCurrent(false);
      const changes: Pick<UpdateTripIntent, 'name' | 'description' | 'publicDescription'> = {
        ...(nameDirty ? { name: trimmedName } : {}),
        ...(descriptionDirty ? { description: descriptionValue } : {}),
        ...(publicDescriptionDirty ? { publicDescription: publicDescriptionValue } : {}),
      };
      const fingerprint = JSON.stringify(changes);
      if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
        attempt.current = {
          fingerprint,
          intent: {
            ...changes,
            expectedPlanVersion: trip.planVersion,
            expectedExportRevision: trip.exportRevision,
            idempotencyKey: requestKey(),
          },
        };
      }
      intent = attempt.current.intent;
      if (!saveAttempt(intent)) return;
    }
    let response: UpdateTripResult;
    try {
      response = await mutation.mutateAsync(intent);
    } catch {
      // Transport failure does not prove that the server rejected the write.
      setUnresolvedIntent(true);
      setResult({ status: 'unknown', correlationId: null, retryable: true });
      return;
    }
    if (response.status === 'updated') {
      queryClient.setQueryData(tripQueryKeys.detail(trip.id, 'success'), {
        status: 'ready',
        data: response.trip,
      });
      queryClient.setQueriesData<InfiniteData<TripListViewModel>>(
        { queryKey: ['trips', 'list'] },
        (current) => updateTripInListPages(current, response.trip),
      );
      // Other projections must be fetched from their repositories, not stamped
      // with a revision from a different response.
      clearAttempt();
      setUnresolvedIntent(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['plan', trip.id] }),
      ]);
      onSaved(response.trip);
      return;
    }
    setResult(response);
    if (response.status === 'unknown') {
      setUnresolvedIntent(true);
      setUnknownRefreshFailed(false);
      return;
    }
    if (unresolvedIntent && response.status === 'unavailable') return;
    setUnresolvedIntent(false);
    if (response.status !== 'unavailable') clearAttempt();
    if (response.status === 'conflict') {
      setRefreshingConflict(true);
      try {
        setRefreshFailed(!(await onRefresh()));
      } catch {
        setRefreshFailed(true);
      } finally {
        setRefreshingConflict(false);
      }
    }
  }

  async function refreshUnknown() {
    if (mutation.isPending) return;
    setRefreshingConflict(true);
    setUnknownRefreshFailed(false);
    try {
      if (await onRefresh()) {
        if (journal.current.write(browserStorage('sessionStorage'), journalKey, null) === 'saved') {
          attempt.current = null;
          setUnresolvedIntent(false);
          setInvalidJournal(false);
          setStorageIssue(false);
          setResult(null);
          setReviewedCurrent(true);
        } else {
          setStorageIssue(true);
          setUnknownRefreshFailed(true);
        }
      } else {
        setUnknownRefreshFailed(true);
      }
    } catch {
      setUnknownRefreshFailed(true);
    } finally {
      setRefreshingConflict(false);
    }
  }

  async function retryRefresh() {
    setRefreshingConflict(true);
    try {
      setRefreshFailed(!(await onRefresh()));
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshingConflict(false);
    }
  }

  return (
    <section className={`${styles.card} ${styles.editCard}`} aria-labelledby="edit-trip-heading">
      <h2 id="edit-trip-heading">Chỉnh sửa thông tin chuyến đi</h2>
      <form className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
        {result && result.status !== 'validation-error' && !unresolvedIntent && (
          <Alert tone={result.status === 'conflict' ? 'warning' : 'error'}>
            {mutationMessage(result)}
          </Alert>
        )}
        {unresolvedIntent && (
          <Alert tone="warning">
            {attempt.current ? (
              <span>
                Chưa xác định được kết quả lưu. Bản nháp bị khóa; chỉ thử lại đúng yêu cầu cũ hoặc
                tải trạng thái hiện tại trước khi sửa tiếp.
              </span>
            ) : (
              <span>
                Không thể xác minh yêu cầu lưu trước đó. Biểu mẫu bị khóa cho đến khi tải được trạng
                thái hiện tại.
              </span>
            )}
            {invalidJournal && (
              <span>
                Yêu cầu lưu đã giữ không hợp lệ; hãy tải trạng thái hiện tại trước khi sửa.
              </span>
            )}
            {storageIssue && (
              <span>Không truy cập được bộ nhớ phiên để xác minh mã yêu cầu đã giữ.</span>
            )}
            {unknownRefreshFailed && (
              <span>
                Chưa tải được trạng thái hiện tại.
                {attempt.current ? ' Yêu cầu cũ vẫn được giữ để thử lại.' : ' Hãy thử tải lại.'}
              </span>
            )}
            <Button
              variant="outline"
              className={styles.refreshButton}
              onClick={() => void refreshUnknown()}
              loading={refreshingConflict}
              disabled={mutation.isPending}
            >
              Tải trạng thái hiện tại
            </Button>
          </Alert>
        )}
        {reviewedCurrent && (
          <Alert tone="warning">
            Đã tải trạng thái hiện tại. Hãy kiểm tra bản nháp trước khi lưu yêu cầu mới.
          </Alert>
        )}
        {storageIssue && !unresolvedIntent && (
          <Alert tone="warning">
            Không thể lưu mã yêu cầu an toàn trong phiên này, nên chưa gửi thay đổi. Hãy bật bộ nhớ
            phiên rồi thử lại.
          </Alert>
        )}
        {(refreshFailed || !canSave) && (
          <Alert tone="error">
            <span>
              Chưa tải được thông tin chuyến đi mới. Bản nháp vẫn được giữ; hãy tải lại trước khi
              lưu.
            </span>
            <Button
              variant="outline"
              className={styles.refreshButton}
              onClick={() => void retryRefresh()}
              loading={refreshingConflict}
            >
              Tải lại thông tin chuyến đi
            </Button>
          </Alert>
        )}
        <EditableTripField
          label="Tên chuyến đi"
          value={name}
          editing={editing.name}
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          error={nameError}
          onEdit={() => setEditing((current) => ({ ...current, name: true }))}
          onChange={(value) => {
            setName(value);
            setResult(null);
          }}
        />
        <ReadOnlyTripSummary trip={trip} memberCount={memberCount} />
        <EditableTripField
          label="Mô tả chuyến đi"
          value={description}
          editing={editing.description}
          multiline
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          error={result?.status === 'validation-error' ? result.fieldErrors.description : undefined}
          onEdit={() => setEditing((current) => ({ ...current, description: true }))}
          onChange={(value) => {
            setDescription(value);
            setResult(null);
          }}
        />
        <EditableTripField
          label="Mô tả công khai"
          value={publicDescription}
          editing={editing.publicDescription}
          multiline
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          error={
            result?.status === 'validation-error' ? result.fieldErrors.publicDescription : undefined
          }
          onEdit={() => setEditing((current) => ({ ...current, publicDescription: true }))}
          onChange={(value) => {
            setPublicDescription(value);
            setResult(null);
          }}
        />
        <div className={styles.formActions}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending || refreshingConflict || unresolvedIntent}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={
              !!nameError ||
              refreshingConflict ||
              (unresolvedIntent ? !attempt.current : !dirty || refreshFailed || !canSave)
            }
          >
            {unresolvedIntent ? 'Thử lại đúng yêu cầu cũ' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function TripSettingsPage() {
  const { tripId = '' } = useParams();
  const repository = useTripRepository();
  const membersRepositories = useMembersRepositoriesOptional();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);
  const focusEditOnView = useRef(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const [informationLocked, setInformationLocked] = useState(false);
  const [operationsBusy, setOperationsBusy] = useState(false);
  const editRequested = searchParams.get('mode') === 'edit';
  const settingsRequested = editRequested || searchParams.get('mode') === 'settings';
  const sectionParam = searchParams.get('section');
  const activeSection: TripSettingsSection =
    sectionParam === 'export' || sectionParam === 'notifications' || sectionParam === 'archive'
      ? sectionParam
      : 'information';
  const query = useQuery({
    queryKey: tripQueryKeys.detail(tripId, 'success'),
    queryFn: ({ signal }) => repository.getTrip({ tripId, scenario: 'success', signal }),
    enabled: tripId !== '',
  });
  const latestReadyTrip = query.data?.status === 'ready' ? query.data.data : null;
  const lastReadyTrip = useRef<{ tripId: string; trip: TripDetailViewModel } | null>(null);
  if (latestReadyTrip && !query.isError) lastReadyTrip.current = { tripId, trip: latestReadyTrip };
  const recoverableReadFailure =
    query.isError ||
    (query.data?.status === 'error' &&
      query.data.error.retryable &&
      (query.data.error.code === 'SERVICE_UNAVAILABLE' ||
        query.data.error.code === 'RESOURCE_EXHAUSTED'));
  // A retryable post-conflict read keeps the draft mounted. Definitive access errors take priority.
  const trip =
    latestReadyTrip ??
    (settingsRequested && recoverableReadFailure && lastReadyTrip.current?.tripId === tripId
      ? lastReadyTrip.current.trip
      : null);
  const memberQuery = useQuery({
    queryKey: [
      'members',
      tripId,
      'settings-count',
      trip?.currentMembership.userId,
      trip?.membershipRevision,
    ],
    enabled:
      !!membersRepositories &&
      !!trip?.permissions.canRead &&
      trip.currentMembership.leftAt === null,
    queryFn: async ({ signal }) => {
      if (!membersRepositories) return null;
      const activeIds = new Set<string>();
      const seenCursors = new Set<string>();
      let cursor: string | undefined;
      do {
        const result = await membersRepositories.membership.listMembers({
          tripId,
          signal,
          scenario: 'success',
          includeLeft: false,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        if (result.status !== 'ready') return null;
        for (const member of result.data.items) {
          if (member.leftAt === null) activeIds.add(member.id);
        }
        const nextCursor = result.data.nextCursor;
        if (!nextCursor) return activeIds.size;
        if (seenCursors.has(nextCursor)) return null;
        seenCursors.add(nextCursor);
        cursor = nextCursor;
      } while (!signal.aborted);
      return null;
    },
  });
  const memberCount = membersRepositories
    ? (memberQuery.data ?? null)
    : (trip?.presentation.memberCount ?? null);
  const canSave = latestReadyTrip !== null && !query.isError;
  const canEdit =
    trip?.currentMembership.role === 'OWNER' &&
    trip.permissions.canUpdate &&
    trip.lifecycle !== 'ARCHIVED';
  const deniedEdit = editRequested && !!trip && !canEdit;
  const settingsLocked = informationLocked || operationsBusy;

  useEffect(() => {
    if (settingsRequested || !focusEditOnView.current) return;
    focusEditOnView.current = false;
    requestAnimationFrame(() => document.getElementById('edit-trip-information')?.focus());
  }, [settingsRequested]);

  useEffect(() => {
    if (!settingsRequested) {
      setInformationLocked(false);
      setOperationsBusy(false);
    }
  }, [settingsRequested]);

  const error = useMemo(() => {
    if (tripId === '')
      return { code: 'RESOURCE_NOT_FOUND' as const, correlationId: null, retryable: false };
    if (query.isError)
      return { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true };
    return query.data?.status === 'error' ? query.data.error : null;
  }, [query.data, query.isError, tripId]);

  function returnToView() {
    focusEditOnView.current = true;
    setSearchParams({}, { replace: true });
  }

  return (
    <section className={styles.page} data-flow="trip-settings" data-node-id="25:676">
      <PageBreadcrumb
        className={styles.breadcrumb}
        items={[
          { label: 'Chuyến đi của tôi', to: paths.trips },
          { label: trip?.name ?? 'Chuyến đi', to: paths.trip(tripId) },
        ]}
        current="Cài đặt"
        mobile={
          <div className={styles.breadcrumb}>
            <Link to={paths.trips}>Chuyến đi của tôi</Link>
            <span aria-hidden="true">›</span>
            {trip && <Link to={paths.trip(trip.id)}>{trip.name}</Link>}
            <span aria-hidden="true">›</span>
            <h1>Cài đặt</h1>
          </div>
        }
      />
      {query.isPending ? (
        <ContentState state="loading" headingLevel={2} />
      ) : error && !trip ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={() => void query.refetch()}
        />
      ) : trip ? (
        <>
          <TripHero
            trip={{ ...trip, presentation: { ...trip.presentation, memberCount } }}
            compact
            variant="landscape"
            showCover={false}
          />
          {notice && <Alert tone="success">{notice}</Alert>}
          {deniedEdit && (
            <Alert tone="warning">
              Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.
            </Alert>
          )}
          <div className={styles.columns}>
            <TripInformationView
              trip={trip}
              memberCount={memberCount}
              settingsRef={settingsRef}
              onSettings={() => {
                setNotice(null);
                setSearchParams({ mode: canEdit ? 'edit' : 'settings' });
              }}
            />
          </div>
          <TripSettingsOverlay
            open={settingsRequested}
            tripName={trip.name}
            section={activeSection}
            busy={settingsLocked}
            owner={trip.currentMembership.role === 'OWNER'}
            returnFocusRef={settingsRef}
            onSectionChange={(section) => {
              if (settingsLocked) return;
              setSearchParams(
                section === 'information'
                  ? { mode: canEdit ? 'edit' : 'settings' }
                  : { mode: 'settings', section },
                { replace: true },
              );
            }}
            onDismiss={() => {
              if (!settingsLocked) returnToView();
            }}
          >
            <div hidden={activeSection !== 'information'}>
              {canEdit ? (
                <TripInformationForm
                  key={`${trip.id}:${trip.currentMembership.userId}`}
                  trip={trip}
                  memberCount={memberCount}
                  onCancel={returnToView}
                  onRefresh={async () => {
                    const refreshed = await query.refetch();
                    return refreshed.isSuccess && refreshed.data?.status === 'ready';
                  }}
                  canSave={canSave}
                  onLockChange={setInformationLocked}
                  onSaved={() => {
                    setNotice('Đã lưu thông tin chuyến đi.');
                    returnToView();
                  }}
                />
              ) : (
                <section
                  className={`${styles.card} ${styles.editCard}`}
                  aria-label="Thông tin chuyến đi chỉ xem"
                >
                  <h2>Thông tin chuyến đi</h2>
                  <div className={styles.form}>
                    <ReadOnlyTripField label="Tên chuyến đi" value={trip.name} />
                    <ReadOnlyTripSummary trip={trip} memberCount={memberCount} />
                    <ReadOnlyTripField
                      label="Mô tả chuyến đi"
                      value={trip.description || 'Chưa có mô tả'}
                    />
                    <ReadOnlyTripField
                      label="Mô tả công khai"
                      value={trip.publicDescription || 'Chưa có mô tả'}
                    />
                  </div>
                </section>
              )}
            </div>
            <div hidden={activeSection === 'information'}>
              <TripSettingsOperations
                key={`${trip.id}:${trip.currentMembership.userId}`}
                trip={trip}
                section={activeSection === 'information' ? 'export' : activeSection}
                onBusyChange={setOperationsBusy}
                {...(searchParams.get('transferTo')
                  ? { initialTransferMemberId: searchParams.get('transferTo')! }
                  : {})}
              />
            </div>
          </TripSettingsOverlay>
        </>
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
    </section>
  );
}
