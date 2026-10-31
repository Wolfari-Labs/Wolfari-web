import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTripRepository } from '../repositories/repository-context';
import type { CreateTripIntent } from '../repositories/trip.repository';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { Alert } from '../../../shared/components/Alert';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';
import { validCalendarDate, nextCalendarDate } from '../../../shared/lib/calendar';
import { localTimeToIso } from '../../plan/model/plan-draft';
import { CreateTripSuccess } from './CreateTripSuccess';
import banner from '../../../shared/assets/figma/32882.svg';
import mapArtwork from '../../../shared/assets/figma/8222b.svg';
import styles from './CreateTripPage.module.css';

interface Draft {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
}
type DraftErrors = Partial<Record<keyof Draft, string>>;

function validateDraft(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Vui lòng nhập tên chuyến đi.';
  else if (name.length > 200) errors.name = 'Tên chuyến đi không được vượt quá 200 ký tự.';
  if (draft.description.length > 500)
    errors.description = 'Mô tả ngắn không được vượt quá 500 ký tự.';
  if (!validCalendarDate(draft.startDate)) errors.startDate = 'Vui lòng chọn ngày đi hợp lệ.';
  if (!validCalendarDate(draft.endDate)) errors.endDate = 'Vui lòng chọn ngày về hợp lệ.';
  else if (validCalendarDate(draft.startDate) && draft.endDate < draft.startDate)
    errors.endDate = 'Ngày về không thể trước ngày đi.';
  try {
    new Intl.DateTimeFormat('en', { timeZone: draft.timezone });
  } catch {
    errors.timezone = 'Vui lòng nhập múi giờ IANA hợp lệ.';
  }
  return errors;
}

function focusFirstError(errors: DraftErrors) {
  const first = (['name', 'startDate', 'endDate', 'timezone', 'description'] as const).find(
    (field) => errors[field],
  );
  if (first) document.getElementById(`gateway-create-trip-${first}`)?.focus();
}

const empty = (): Draft => ({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  timezone: 'Asia/Ho_Chi_Minh',
});
function restore(raw: string | null): { draft: Draft; intent: CreateTripIntent | null } {
  if (!raw) return { draft: empty(), intent: null };
  const data = JSON.parse(raw) as { draft: Draft; intent: CreateTripIntent | null };
  if (
    !data ||
    !data.draft ||
    !Object.keys(empty()).every((key) => typeof data.draft[key as keyof Draft] === 'string')
  )
    throw Error('Bản nháp không hợp lệ.');
  const i = data.intent;
  if (
    i !== null &&
    (!i ||
      typeof i.name !== 'string' ||
      !i.name.trim() ||
      typeof i.timezone !== 'string' ||
      !Number.isFinite(Date.parse(i.startAt)) ||
      !(Date.parse(i.endAt) > Date.parse(i.startAt)) ||
      !/^[0-9a-f-]{36}$/i.test(i.clientRequestId) ||
      (i.description !== undefined && typeof i.description !== 'string'))
  )
    throw Error('Yêu cầu phục hồi không hợp lệ.');
  return data;
}
export function GatewayCreateTripPage({ actorId }: { actorId: string }) {
  const repository = useTripRepository();
  const key = `wolfari:create-trip:v3:${actorId}`;
  const cache = useRef(createStorageFallback());
  const initial = useRef<{
    draft: Draft;
    intent: CreateTripIntent | null;
    invalid: boolean;
  } | null>(null);
  if (!initial.current) {
    try {
      initial.current = {
        ...restore(cache.current.read(browserStorage('sessionStorage'), key).raw),
        invalid: false,
      };
    } catch {
      initial.current = { draft: empty(), intent: null, invalid: true };
    }
  }
  const [draft, setDraft] = useState(initial.current.draft);
  const [intent, setIntent] = useState(initial.current.intent);
  const [message, setMessage] = useState(
    initial.current.invalid
      ? 'Dữ liệu phục hồi không hợp lệ. Không gửi yêu cầu mới; hãy kiểm tra danh sách chuyến đi.'
      : '',
  );
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [memoryOnly, setMemoryOnly] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [focusError, setFocusError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const createActionRef = useRef<HTMLButtonElement>(null);
  const sending = useRef(false);
  const persist = (nextDraft: Draft, nextIntent: CreateTripIntent | null) => {
    const status = cache.current.write(
      browserStorage('sessionStorage'),
      key,
      JSON.stringify({ draft: nextDraft, intent: nextIntent }),
    );
    setMemoryOnly(status !== 'saved');
    return status === 'saved';
  };
  const dismissSuccess = () => {
    setCreated(null);
    setDraft(empty());
    setIntent(null);
    setErrors({});
    setMessage('');
    setMemoryOnly(false);
    cache.current.write(browserStorage('sessionStorage'), key, null);
  };
  useEffect(() => {
    const oldKeys = ['wolfari:create-trip:v1', 'wolfari:create-trip:v2'];
    for (const oldKey of oldKeys) {
      try {
        browserStorage('sessionStorage')?.removeItem(oldKey);
      } catch {
        /* Do not import ownerless drafts. */
      }
    }
    return () => {
      request.current?.abort();
      cache.current.clear();
    };
  }, []);
  useEffect(() => {
    if (!focusError || busy) return;
    focusFirstError(errors);
    setFocusError(false);
  }, [busy, errors, focusError]);
  const edit = (field: keyof Draft, value: string) => {
    if (busy || intent) return;
    const next = { ...draft, [field]: value };
    setDraft(next);
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setMessage('');
    persist(next, null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current || initial.current?.invalid || !actorId) return;
    let snapshot = intent;
    try {
      if (!snapshot) {
        const nextErrors = validateDraft(draft);
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
          setMessage('Vui lòng kiểm tra các trường được đánh dấu.');
          setFocusError(true);
          return;
        }
        snapshot = {
          name: draft.name.trim(),
          ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
          startAt: localTimeToIso(draft.startDate, '00:00', draft.timezone),
          endAt: localTimeToIso(nextCalendarDate(draft.endDate), '00:00', draft.timezone),
          timezone: draft.timezone,
          clientRequestId: crypto.randomUUID(),
        };
        if (!persist(draft, snapshot))
          throw Error('Cần bật bộ nhớ phiên để lưu yêu cầu an toàn trước khi tạo Trip.');
        setIntent(snapshot);
      }
      sending.current = true;
      setBusy(true);
      setMessage('');
      const controller = new AbortController();
      request.current = controller;
      const result = await repository.createTrip({ intent: snapshot, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.status === 'created') {
        cache.current.write(browserStorage('sessionStorage'), key, null);
        setCreated(result.tripId);
        setIntent(null);
      } else if (result.status === 'validation-error' || result.status === 'forbidden') {
        setIntent(null);
        persist(draft, null);
        if (result.status === 'validation-error') {
          const nextErrors: DraftErrors = {};
          if (result.fieldErrors.name) nextErrors.name = result.fieldErrors.name;
          if (result.fieldErrors.description)
            nextErrors.description = result.fieldErrors.description;
          if (result.fieldErrors.startAt) nextErrors.startDate = result.fieldErrors.startAt;
          if (result.fieldErrors.endAt) nextErrors.endDate = result.fieldErrors.endAt;
          if (result.fieldErrors.timezone) nextErrors.timezone = result.fieldErrors.timezone;
          setErrors(nextErrors);
          setFocusError(true);
        }
        setMessage(
          result.status === 'forbidden'
            ? 'Bạn không có quyền tạo chuyến đi.'
            : 'Thông tin chưa hợp lệ. Kiểm tra tên, ngày và múi giờ.',
        );
      } else {
        setMessage(
          'Chưa xác nhận được kết quả. Yêu cầu đã được giữ nguyên; kiểm tra danh sách hoặc thử lại đúng yêu cầu cũ. Không tạo bản sao.',
        );
      }
    } catch (error) {
      if (!request.current?.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Kết nối gián đoạn. Giữ nguyên yêu cầu để thử lại.',
        );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <section className={`${styles.page} ${styles.gatewayPage}`} data-flow="create-trip">
      <img className={styles.banner} src={banner} alt="" />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>CHUYẾN ĐI MỚI</p>
          <h1>Tạo chuyến đi mới</h1>
          <p>Lên kế hoạch cho hành trình tiếp theo và khám phá thế giới cùng Wolfari!</p>
        </div>
        <Link to="/trips">Chuyến đi của tôi</Link>
      </header>
      <div className={styles.layout}>
        <form
          onSubmit={(event) => void submit(event)}
          className={`${styles.formCard} ${styles.gatewayForm}`}
          aria-labelledby="gateway-create-trip-title"
          noValidate
        >
          <div className={styles.gatewayIntro}>
            <h2 id="gateway-create-trip-title">Thông tin cơ bản</h2>
            <p>Bắt đầu với những thông tin chính về chuyến đi của bạn</p>
          </div>
          {message && <Alert live>{message}</Alert>}
          {memoryOnly && (
            <Alert tone="warning">
              Bản nháp chỉ còn trong tab; chưa thể gửi yêu cầu mới an toàn.
            </Alert>
          )}
          {intent && (
            <Alert tone="warning">
              Đang giữ yêu cầu đã gửi. Nội dung bị khóa đến khi xác định được kết quả.
            </Alert>
          )}
          <fieldset disabled={busy || !!intent || !!created || initial.current.invalid}>
            <Input
              id="gateway-create-trip-name"
              label="Tên chuyến đi"
              value={draft.name}
              maxLength={200}
              required
              error={errors.name}
              onChange={(e) => edit('name', e.target.value)}
            />
            <div className={styles.dates}>
              <Input
                id="gateway-create-trip-startDate"
                label="Ngày đi"
                type="date"
                value={draft.startDate}
                required
                error={errors.startDate}
                onChange={(e) => edit('startDate', e.target.value)}
              />
              <Input
                id="gateway-create-trip-endDate"
                label="Ngày về"
                type="date"
                value={draft.endDate}
                min={draft.startDate}
                required
                error={errors.endDate}
                onChange={(e) => edit('endDate', e.target.value)}
              />
            </div>
            <Input
              id="gateway-create-trip-timezone"
              label="Múi giờ"
              hint="Ví dụ: Asia/Ho_Chi_Minh"
              value={draft.timezone}
              required
              error={errors.timezone}
              onChange={(e) => edit('timezone', e.target.value)}
            />
            <Textarea
              id="gateway-create-trip-description"
              label="Mô tả ngắn"
              value={draft.description}
              maxLength={500}
              error={errors.description}
              onChange={(e) => edit('description', e.target.value)}
            />
          </fieldset>
          <p>Bạn có thể thiết lập ngân sách trong Quỹ nhóm sau khi tạo chuyến đi.</p>
          <div className={styles.actions}>
            <Link to="/trips">Xem danh sách chuyến đi</Link>
            <Button
              ref={createActionRef}
              type="submit"
              loading={busy}
              disabled={initial.current.invalid || !!created}
            >
              {intent ? 'Thử lại đúng yêu cầu cũ' : 'Tạo chuyến đi'}
            </Button>
          </div>
        </form>
        <aside
          className={`${styles.destinationPanel} ${styles.gatewayCapability}`}
          aria-labelledby="gateway-destination-title"
        >
          <div className={styles.gatewayCapabilityHeading}>
            <h2 id="gateway-destination-title">Bản đồ điểm đến</h2>
            <p>Không cần chọn điểm đến để bắt đầu chuyến đi.</p>
          </div>
          <div className={styles.gatewayMapIllustration}>
            <img src={mapArtwork} alt="" />
            <span>Hình minh họa · Chưa có dữ liệu điểm đến</span>
          </div>
          <div className={styles.gatewayCapabilityBody}>
            <h3>Chưa hỗ trợ chọn điểm đến khi tạo chuyến đi</h3>
            <p>
              Biểu mẫu hiện tại chỉ lưu tên, thời gian, múi giờ và mô tả. Bạn có thể tạo chuyến đi
              với những thông tin này; bản đồ ở đây chỉ là hình minh họa.
            </p>
          </div>
        </aside>
      </div>
      {created && (
        <CreateTripSuccess
          tripId={created}
          onDismiss={dismissSuccess}
          returnFocusRef={createActionRef}
        />
      )}
    </section>
  );
}
