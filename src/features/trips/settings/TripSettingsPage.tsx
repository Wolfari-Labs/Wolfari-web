import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router';
import type { RouteContext } from '../../../app/route-context';
import { paths } from '../../../app/route-paths';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { ButtonLink } from '../../../shared/components/ButtonLink';
import { ContentState } from '../../../shared/components/ContentState';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { TripHero } from '../components/TripHero';
import type { TripDetailViewModel } from '../model/trip-detail';
import type { TripListViewModel } from '../model/trip-list';
import { updateTripInListPages } from '../model/trip-list-cache';
import { tripQueryKeys } from '../model/trip-query-keys';
import { useTripRepository } from '../repositories/repository-context';
import type { UpdateTripIntent, UpdateTripResult } from '../repositories/trip.repository';
import coverFallback from '../../../shared/assets/figma/bd989.svg';
import styles from './TripSettingsPage.module.css';
import { calendarDate } from '../../../shared/lib/calendar';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';

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

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <Input
      label={label}
      value={value}
      disabled
      readOnly
      hint="Chưa hỗ trợ chỉnh sửa trong phiên bản này."
    />
  );
}

function CoverPreview({
  trip,
  editable = false,
}: {
  trip: TripDetailViewModel;
  editable?: boolean;
}) {
  const cover = trip.presentation.cover;
  return (
    <div className={styles.coverField}>
      <span className={styles.fieldLabel}>Ảnh bìa chuyến đi</span>
      <div className={styles.coverRow}>
        <picture>
          {cover?.mobileSrc && <source media="(max-width: 768px)" srcSet={cover.mobileSrc} />}
          <img src={cover?.src ?? coverFallback} alt="" />
        </picture>
        <div>
          {editable && (
            <Button variant="outline" disabled title="Thay ảnh chưa được hỗ trợ">
              Thay ảnh
            </Button>
          )}
          <p>
            {editable
              ? 'Chưa hỗ trợ thay ảnh bìa.'
              : 'Ảnh hiện đang được sử dụng làm bìa chuyến đi.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TripInformationView({ trip, onEdit }: { trip: TripDetailViewModel; onEdit: () => void }) {
  return (
    <section className={styles.card} aria-labelledby="trip-information-heading">
      <div className={styles.cardHeading}>
        <div>
          <h2 id="trip-information-heading">Thông tin chuyến đi</h2>
          <p>Xem thông tin hiện tại trước khi thực hiện chỉnh sửa.</p>
        </div>
        {trip.currentMembership.role === 'OWNER' &&
          trip.permissions.canUpdate &&
          trip.lifecycle !== 'ARCHIVED' && (
            <Button id="edit-trip-information" variant="outline" onClick={onEdit}>
              Chỉnh sửa thông tin
            </Button>
          )}
      </div>
      <dl className={styles.informationGrid}>
        <div className={styles.fullRow}>
          <dt>Tên chuyến đi</dt>
          <dd>{trip.name}</dd>
        </div>
        <div>
          <dt>Điểm đến chính</dt>
          <dd>Chưa có dữ liệu</dd>
        </div>
        <div>
          <dt>Thời gian</dt>
          <dd>
            {displayDate(trip.startAt, trip.timezone)} →{' '}
            {displayDate(trip.endAt, trip.timezone, true)}
          </dd>
        </div>
        <div>
          <dt>Ngân sách dự kiến</dt>
          <dd>Chưa có dữ liệu</dd>
        </div>
        <div>
          <dt>Thành viên</dt>
          <dd>
            {trip.presentation.memberCount === null
              ? 'Chưa có dữ liệu'
              : `${trip.presentation.memberCount} người`}
          </dd>
        </div>
        <div className={`${styles.fullRow} ${styles.descriptionBox}`}>
          <dt>Mô tả chuyến đi</dt>
          <dd>{trip.description || 'Chưa có mô tả.'}</dd>
        </div>
        <div className={`${styles.fullRow} ${styles.descriptionBox}`}>
          <dt>Mô tả công khai</dt>
          <dd>{trip.publicDescription || 'Chưa có mô tả công khai.'}</dd>
        </div>
      </dl>
      <CoverPreview trip={trip} />
    </section>
  );
}

function TripInformationForm({
  trip,
  onCancel,
  onSaved,
  onRefresh,
  canSave,
}: {
  trip: TripDetailViewModel;
  onCancel: () => void;
  onSaved: (trip: TripDetailViewModel) => void;
  onRefresh: () => Promise<boolean>;
  canSave: boolean;
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
  const [focused, setFocused] = useState<'name' | 'description' | 'publicDescription' | null>(null);
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
    <section className={styles.card} aria-labelledby="edit-trip-heading">
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
        <Input
          label="Tên chuyến đi"
          value={name}
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          maxLength={201}
          error={nameError}
          className={!nameDirty && focused !== 'name' ? styles.currentValue : ''}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          onChange={(event) => {
            setName(event.target.value);
            setResult(null);
          }}
        />
        <LockedField label="Điểm đến" value="Chưa có dữ liệu" />
        <div className={styles.formColumns}>
          <LockedField label="Ngày bắt đầu" value={displayDate(trip.startAt, trip.timezone)} />
          <LockedField label="Ngày kết thúc" value={displayDate(trip.endAt, trip.timezone, true)} />
        </div>
        <LockedField label="Ngân sách dự kiến" value="Chưa có dữ liệu" />
        <Textarea
          label="Mô tả chuyến đi"
          value={description}
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          error={result?.status === 'validation-error' ? result.fieldErrors.description : undefined}
          className={!descriptionDirty && focused !== 'description' ? styles.currentValue : ''}
          onFocus={() => setFocused('description')}
          onBlur={() => setFocused(null)}
          onChange={(event) => {
            setDescription(event.target.value);
            setResult(null);
          }}
        />
        <Textarea
          label="Mô tả công khai"
          value={publicDescription}
          disabled={unresolvedIntent || mutation.isPending || refreshingConflict}
          error={
            result?.status === 'validation-error' ? result.fieldErrors.publicDescription : undefined
          }
          className={
            !publicDescriptionDirty && focused !== 'publicDescription' ? styles.currentValue : ''
          }
          onFocus={() => setFocused('publicDescription')}
          onBlur={() => setFocused(null)}
          onChange={(event) => {
            setPublicDescription(event.target.value);
            setResult(null);
          }}
        />
        <CoverPreview trip={trip} editable />
        <div className={styles.formActions}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending || refreshingConflict || unresolvedIntent}
          >
            ← Hủy
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

function ManagementCard({
  trip,
  ownerName,
}: {
  trip: TripDetailViewModel;
  ownerName: string | null;
}) {
  const owner = trip.currentMembership.role === 'OWNER' ? ownerName : null;
  return (
    <section className={`${styles.card} ${styles.management}`} aria-labelledby="management-heading">
      <div className={styles.memberHeading}>
        <div>
          <h2 id="management-heading">Thành viên &amp; nhắc nhở</h2>
          <p>Chủ chuyến: {owner ?? 'Xem trong danh sách thành viên'}</p>
        </div>
        <ButtonLink variant="outline" to={paths.members(trip.id)}>
          Quản lý thành viên
        </ButtonLink>
      </div>
      <div className={styles.separator} />
      <section className={styles.settingSection} aria-labelledby="reminders-heading">
        <h3 id="reminders-heading">Tùy chọn thông báo</h3>
        <p className={styles.capabilityNote}>
          Chọn kênh nhận và loại thông báo trong hồ sơ của bạn.
        </p>
        <ButtonLink variant="outline" to={`${paths.profile}#notifications`}>
          Mở tùy chọn thông báo
        </ButtonLink>
      </section>
      <div className={styles.separator} />
      <section className={styles.settingSection} aria-labelledby="trip-management-heading">
        <h3 id="trip-management-heading">Quản lý chuyến đi</h3>
        <details>
          <summary>Tác vụ chưa khả dụng</summary>
          <p className={styles.capabilityNote}>
            Lưu trữ, chuyển chủ chuyến và xóa chuyến đi chưa được hỗ trợ.
          </p>
        </details>
        <div className={styles.fundNote}>
          <strong>Quỹ nhóm được quản lý riêng</strong>
          <span>Kiểm tra trạng thái quỹ trước khi thay đổi vòng đời chuyến đi.</span>
          <Link to={paths.fund(trip.id)}>Mở Quỹ nhóm</Link>
        </div>
      </section>
    </section>
  );
}

export function TripSettingsPage() {
  const { tripId = '' } = useParams();
  const { viewer } = useOutletContext<RouteContext>();
  const repository = useTripRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);
  const focusEditOnView = useRef(false);
  const editRequested = searchParams.get('mode') === 'edit';
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
    (editRequested && recoverableReadFailure && lastReadyTrip.current?.tripId === tripId
      ? lastReadyTrip.current.trip
      : null);
  const canSave = latestReadyTrip !== null && !query.isError;
  const canEdit =
    trip?.currentMembership.role === 'OWNER' &&
    trip.permissions.canUpdate &&
    trip.lifecycle !== 'ARCHIVED';
  const editMode = editRequested && canEdit;
  const deniedEdit = editRequested && !!trip && !canEdit;

  useEffect(() => {
    if (editMode || !focusEditOnView.current) return;
    focusEditOnView.current = false;
    requestAnimationFrame(() => document.getElementById('edit-trip-information')?.focus());
  }, [editMode]);

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
      <div className={styles.breadcrumb}>
        <Link to={paths.trips}>Chuyến đi của tôi</Link>
        <span aria-hidden="true">›</span>
        {trip && <Link to={paths.trip(trip.id)}>{trip.name}</Link>}
        <span aria-hidden="true">›</span>
        {editMode && trip && (
          <>
            <Link to={paths.settings(trip.id)}>Cài đặt</Link>
            <span aria-hidden="true">›</span>
          </>
        )}
        <h1>{editMode ? 'Chỉnh sửa' : 'Cài đặt'}</h1>
      </div>
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
          <TripHero trip={trip} compact variant="landscape" />
          <div className={styles.mobileTitle}>
            <h2>
              Một chuyến đi,
              <br />
              cùng một nhịp
            </h2>
          </div>
          {notice && <Alert tone="success">{notice}</Alert>}
          {deniedEdit && (
            <Alert tone="warning">
              Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.
            </Alert>
          )}
          <div className={styles.columns}>
            {editMode ? (
              <TripInformationForm
                key={`${trip.id}:${trip.currentMembership.userId}`}
                trip={trip}
                onCancel={returnToView}
                onRefresh={async () => {
                  const refreshed = await query.refetch();
                  return refreshed.isSuccess && refreshed.data?.status === 'ready';
                }}
                canSave={canSave}
                onSaved={() => {
                  setNotice('Đã lưu thông tin chuyến đi.');
                  returnToView();
                }}
              />
            ) : (
              <TripInformationView
                trip={trip}
                onEdit={() => {
                  setNotice(null);
                  setSearchParams({ mode: 'edit' });
                }}
              />
            )}
            <ManagementCard trip={trip} ownerName={viewer?.fullName ?? null} />
          </div>
        </>
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
    </section>
  );
}
