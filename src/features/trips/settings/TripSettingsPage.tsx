import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { ContentState } from '../../../shared/components/ContentState';
import { Icon } from '../../../shared/components/Icon';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { VietnameseDateInput } from '../../../shared/components/VietnameseDateInput';
import { TripHero } from '../components/TripHero';
import type { TripDetailViewModel } from '../model/trip-detail';
import type { TripListViewModel } from '../model/trip-list';
import { updateTripInListPages } from '../model/trip-list-cache';
import { tripQueryKeys } from '../model/trip-query-keys';
import { useTripRepository } from '../repositories/repository-context';
import type { UpdateTripIntent, UpdateTripResult } from '../repositories/trip.repository';
import styles from './TripSettingsPage.module.css';
import {
  calendarDate,
  lastTripDate,
  nextCalendarDate,
  validCalendarDate,
} from '../../../shared/lib/calendar';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';
import { useMembersRepositoriesOptional } from '../../members/repositories/members-context';
import { TripSettingsOperations } from './TripSettingsOperations';
import { TripSettingsOverlay, type TripSettingsSection } from './TripSettingsOverlay';
import { TripCoverEditor } from './TripCoverEditor';
import { TripSettingsHub } from './TripSettingsHub';
import { localTimeToIso } from '../../plan/model/plan-draft';
import { validTripBudget, validTripTimezone } from '../model/trip-metadata';

interface SavedSettingsAttempt {
  intent: UpdateTripIntent;
  draft: {
    name: string;
    description: string;
    publicDescription: string;
    startDate?: string;
    endDate?: string;
    timezone?: string;
    budgetAmount?: string;
  };
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
    (parsedIntent.startAt !== undefined &&
      (typeof parsedIntent.startAt !== 'string' ||
        !Number.isFinite(Date.parse(parsedIntent.startAt)))) ||
    (parsedIntent.endAt !== undefined &&
      (typeof parsedIntent.endAt !== 'string' ||
        !Number.isFinite(Date.parse(parsedIntent.endAt)))) ||
    (parsedIntent.timezone !== undefined && !validTripTimezone(parsedIntent.timezone)) ||
    (parsedIntent.budgetAmount !== undefined &&
      parsedIntent.budgetAmount !== null &&
      (typeof parsedIntent.budgetAmount !== 'string' ||
        !validTripBudget(parsedIntent.budgetAmount))) ||
    ['startDate', 'endDate', 'timezone', 'budgetAmount'].some(
      (field) => field in draft && typeof draft[field as keyof typeof draft] !== 'string',
    ) ||
    (parsedIntent.name === undefined &&
      parsedIntent.description === undefined &&
      parsedIntent.publicDescription === undefined &&
      parsedIntent.startAt === undefined &&
      parsedIntent.endAt === undefined &&
      parsedIntent.timezone === undefined &&
      parsedIntent.budgetAmount === undefined)
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
      return result.reason === 'TRIP_RANGE_CONFLICT'
        ? 'Khoảng ngày hoặc múi giờ mới khiến hoạt động hoặc trang phục đã lên lịch nằm ngoài chuyến đi. Bản nháp được giữ lại. Hãy điều chỉnh các mục đó trong lịch trình hoặc chọn lại thời gian chuyến đi.'
        : 'Thông tin chuyến đi đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra bản nháp rồi xác nhận lưu lần nữa.';
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

function budgetLabel(value: string | null | undefined) {
  return value ? `${new Intl.NumberFormat('vi-VN').format(BigInt(value))} ₫` : 'Chưa đặt ngân sách';
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
  includeSchedule = true,
}: {
  trip: TripDetailViewModel;
  memberCount: number | null;
  includeSchedule?: boolean;
}) {
  return (
    <>
      <ReadOnlyTripField label="Địa điểm" value="Chưa cập nhật" />
      <ReadOnlyTripField
        label="Thành viên (hiện tại / tối đa)"
        value={memberCountLabel(memberCount)}
      />
      {includeSchedule && (
        <>
          <ReadOnlyTripField label="Ngày đi" value={displayDate(trip.startAt, trip.timezone)} />
          <ReadOnlyTripField label="Ngày về" value={displayDate(trip.endAt, trip.timezone, true)} />
          <ReadOnlyTripField label="Múi giờ" value={trip.timezone} />
          <ReadOnlyTripField label="Ngân sách chuyến đi" value={budgetLabel(trip.budgetAmount)} />
        </>
      )}
    </>
  );
}

function EditableTripField({
  label,
  value,
  editing,
  disabled,
  multiline = false,
  date = false,
  displayValue,
  maxLength = 201,
  numeric = false,
  error,
  onEdit,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  disabled: boolean;
  multiline?: boolean;
  date?: boolean;
  displayValue?: string;
  maxLength?: number;
  numeric?: boolean;
  error?: string | undefined;
  onEdit: () => void;
  onChange: (value: string) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing && date) fieldRef.current?.querySelector('input')?.focus();
  }, [date, editing]);
  return (
    <div ref={fieldRef} className={styles.fieldBox} data-editing={editing}>
      {editing ? (
        date ? (
          <VietnameseDateInput
            id={`trip-settings-${label === 'Ngày đi' ? 'startDate' : 'endDate'}`}
            label={label}
            pickerLabel={`Lịch ${label.toLocaleLowerCase('vi-VN')}`}
            value={value}
            disabled={disabled}
            error={error}
            onValueChange={onChange}
          />
        ) : multiline ? (
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
            maxLength={maxLength}
            inputMode={numeric ? 'numeric' : undefined}
            error={error}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
          />
        )
      ) : (
        <div className={styles.displayField}>
          <span className={styles.fieldName}>{label}</span>
          <p className={styles.fieldValue}>{displayValue ?? (value || 'Chưa có mô tả')}</p>
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
      {!editing && error && <Alert tone="error">{error}</Alert>}
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
  const [startDate, setStartDate] = useState(
    restored.current.saved?.draft.startDate ?? calendarDate(trip.startAt, trip.timezone),
  );
  const [endDate, setEndDate] = useState(
    restored.current.saved?.draft.endDate ?? lastTripDate(trip.endAt, trip.timezone),
  );
  const [timezone, setTimezone] = useState(restored.current.saved?.draft.timezone ?? trip.timezone);
  const [budgetAmount, setBudgetAmount] = useState(
    restored.current.saved?.draft.budgetAmount ?? trip.budgetAmount ?? '',
  );
  const [coverBusy, setCoverBusy] = useState(false);
  const [editing, setEditing] = useState({
    name: !!restored.current.saved,
    description: !!restored.current.saved,
    publicDescription: !!restored.current.saved,
    startDate: restored.current.saved?.draft.startDate !== undefined,
    endDate: restored.current.saved?.draft.endDate !== undefined,
    timezone: restored.current.saved?.draft.timezone !== undefined,
    budgetAmount: restored.current.saved?.draft.budgetAmount !== undefined,
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
  const timezoneDirty = timezone !== trip.timezone;
  const startDateDirty = startDate !== calendarDate(trip.startAt, trip.timezone);
  const endDateDirty = endDate !== lastTripDate(trip.endAt, trip.timezone);
  const budgetValue = budgetAmount.trim() || null;
  const budgetDirty = budgetValue !== (trip.budgetAmount ?? null);
  const dirty =
    nameDirty ||
    descriptionDirty ||
    publicDescriptionDirty ||
    timezoneDirty ||
    startDateDirty ||
    endDateDirty ||
    budgetDirty;
  const saveAttempt = (intent: UpdateTripIntent) => {
    const record: SavedSettingsAttempt = {
      intent,
      draft: { name, description, publicDescription, startDate, endDate, timezone, budgetAmount },
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
  const serverErrors = result?.status === 'validation-error' ? result.fieldErrors : {};
  const startDateError =
    serverErrors.startAt ||
    (!validCalendarDate(startDate) ? 'Vui lòng chọn ngày đi hợp lệ.' : undefined);
  const endDateError =
    serverErrors.endAt ||
    (!validCalendarDate(endDate)
      ? 'Vui lòng chọn ngày về hợp lệ.'
      : validCalendarDate(startDate) && endDate < startDate
        ? 'Ngày về không thể trước ngày đi.'
        : undefined);
  const timezoneError =
    serverErrors.timezone ||
    (!validTripTimezone(timezone) ? 'Vui lòng nhập múi giờ IANA hợp lệ.' : undefined);
  const budgetError =
    serverErrors.budgetAmount ||
    (budgetValue !== null && !validTripBudget(budgetValue)
      ? 'Ngân sách phải là số nguyên từ 1 đến 999.999.999.999 ₫.'
      : undefined);
  const metadataInvalid = !!(
    nameError ||
    startDateError ||
    endDateError ||
    timezoneError ||
    budgetError
  );

  useEffect(() => () => controller.current?.abort(), []);

  const mutation = useMutation({
    retry: false,
    mutationFn: async (intent: UpdateTripIntent) => {
      controller.current = new AbortController();
      return repository.updateTrip({ tripId: trip.id, intent, signal: controller.current.signal });
    },
  });
  const fieldsDisabled = unresolvedIntent || mutation.isPending || refreshingConflict || coverBusy;

  useEffect(() => {
    onLockChange(mutation.isPending || refreshingConflict || unresolvedIntent || coverBusy);
  }, [mutation.isPending, refreshingConflict, unresolvedIntent, coverBusy, onLockChange]);
  useEffect(() => () => onLockChange(false), [onLockChange]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      mutation.isPending ||
      (!unresolvedIntent && metadataInvalid) ||
      coverBusy ||
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
      let changes: Omit<
        UpdateTripIntent,
        'expectedPlanVersion' | 'expectedExportRevision' | 'idempotencyKey'
      > = {
        ...(nameDirty ? { name: trimmedName } : {}),
        ...(descriptionDirty ? { description: descriptionValue } : {}),
        ...(publicDescriptionDirty ? { publicDescription: publicDescriptionValue } : {}),
        ...(timezoneDirty ? { timezone } : {}),
        ...(budgetDirty ? { budgetAmount: budgetValue } : {}),
      };
      try {
        changes = {
          ...changes,
          ...(startDateDirty || timezoneDirty
            ? { startAt: localTimeToIso(startDate, '00:00', timezone) }
            : {}),
          ...(endDateDirty || timezoneDirty
            ? { endAt: localTimeToIso(nextCalendarDate(endDate), '00:00', timezone) }
            : {}),
        };
      } catch {
        setResult({
          status: 'validation-error',
          fieldErrors: {
            startAt:
              'Không thể xác định khoảng ngày trong múi giờ đã chọn. Hãy kiểm tra lại ngày và múi giờ.',
          },
          correlationId: null,
        });
        return;
      }
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
      {repository.uploadCover && (
        <TripCoverEditor
          trip={trip}
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          onBusyChange={setCoverBusy}
        />
      )}
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
          disabled={fieldsDisabled}
          error={nameError}
          onEdit={() => setEditing((current) => ({ ...current, name: true }))}
          onChange={(value) => {
            setName(value);
            setResult(null);
          }}
        />
        <ReadOnlyTripSummary trip={trip} memberCount={memberCount} includeSchedule={false} />
        <EditableTripField
          label="Ngày đi"
          value={startDate}
          displayValue={startDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')}
          editing={editing.startDate}
          date
          disabled={fieldsDisabled}
          error={startDateError}
          onEdit={() => setEditing((current) => ({ ...current, startDate: true }))}
          onChange={(value) => {
            setStartDate(value);
            setResult(null);
          }}
        />
        <EditableTripField
          label="Ngày về"
          value={endDate}
          displayValue={endDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')}
          editing={editing.endDate}
          date
          disabled={fieldsDisabled}
          error={endDateError}
          onEdit={() => setEditing((current) => ({ ...current, endDate: true }))}
          onChange={(value) => {
            setEndDate(value);
            setResult(null);
          }}
        />
        <EditableTripField
          label="Múi giờ"
          value={timezone}
          editing={editing.timezone}
          maxLength={64}
          disabled={fieldsDisabled}
          error={timezoneError}
          onEdit={() => setEditing((current) => ({ ...current, timezone: true }))}
          onChange={(value) => {
            setTimezone(value);
            setResult(null);
          }}
        />
        <EditableTripField
          label="Ngân sách chuyến đi"
          value={budgetAmount}
          displayValue={budgetLabel(validTripBudget(budgetAmount) ? budgetAmount : null)}
          editing={editing.budgetAmount}
          numeric
          maxLength={12}
          disabled={fieldsDisabled}
          error={budgetError}
          onEdit={() => setEditing((current) => ({ ...current, budgetAmount: true }))}
          onChange={(value) => {
            setBudgetAmount(value);
            setResult(null);
          }}
        />
        <EditableTripField
          label="Mô tả chuyến đi"
          value={description}
          editing={editing.description}
          multiline
          disabled={fieldsDisabled}
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
          disabled={fieldsDisabled}
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
          <Button variant="outline" onClick={onCancel} disabled={fieldsDisabled}>
            Hủy
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={
              (!unresolvedIntent && metadataInvalid) ||
              coverBusy ||
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
    sectionParam === 'transfer' || (sectionParam === 'archive' && searchParams.has('transferTo'))
      ? 'transfer'
      : sectionParam === 'export' ||
          sectionParam === 'notifications' ||
          sectionParam === 'archive' ||
          sectionParam === 'delete'
        ? sectionParam
        : 'information';
  const originSection = useRef<TripSettingsSection>(activeSection);
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
      settingsRequested &&
      activeSection === 'information' &&
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
    trip.currentMembership.leftAt === null &&
    trip.lifecycle !== 'ARCHIVED';
  const deniedEdit = editRequested && !!trip && !canEdit;
  const settingsLocked = informationLocked || operationsBusy;

  useEffect(() => {
    if (settingsRequested) {
      originSection.current = activeSection;
      return;
    }
    if (!focusEditOnView.current) return;
    focusEditOnView.current = false;
    requestAnimationFrame(() => {
      const trigger =
        settingsRef.current ??
        document.getElementById(`trip-settings-${originSection.current}`) ??
        document.getElementById('trip-settings-information');
      trigger?.focus();
    });
  }, [activeSection, settingsRequested]);

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
            trip={{
              ...trip,
              presentation: {
                ...trip.presentation,
                memberCount: memberCount ?? trip.presentation.memberCount,
              },
            }}
            compact
            variant="landscape"
          />
          {notice && <Alert tone="success">{notice}</Alert>}
          {deniedEdit && (
            <Alert tone="warning">
              Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.
            </Alert>
          )}
          <TripSettingsHub
            owner={
              trip.currentMembership.role === 'OWNER' && trip.currentMembership.leftAt === null
            }
            archived={trip.lifecycle === 'ARCHIVED'}
            onOpen={(section, trigger) => {
              settingsRef.current = trigger;
              setNotice(null);
              setSearchParams(
                section === 'information'
                  ? { mode: canEdit ? 'edit' : 'settings' }
                  : { mode: 'settings', section },
              );
            }}
          />
          <TripSettingsOverlay
            open={settingsRequested}
            tripName={trip.name}
            section={activeSection}
            busy={settingsLocked}
            archived={trip.lifecycle === 'ARCHIVED'}
            returnFocusRef={settingsRef}
            onDismiss={() => {
              if (!settingsLocked) returnToView();
            }}
          >
            {settingsRequested &&
              activeSection === 'information' &&
              (canEdit ? (
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
              ))}
            {settingsRequested && activeSection !== 'information' && (
              <TripSettingsOperations
                key={`${trip.id}:${trip.currentMembership.userId}:${activeSection}`}
                trip={trip}
                section={activeSection}
                onBusyChange={setOperationsBusy}
                {...(searchParams.get('transferTo')
                  ? { initialTransferMemberId: searchParams.get('transferTo')! }
                  : {})}
              />
            )}
          </TripSettingsOverlay>
        </>
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
    </section>
  );
}
