import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { paths } from '../../../app/route-paths';
import { useTripRepository } from '../repositories/repository-context';
import type { CreateTripIntent } from '../repositories/trip.repository';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { VietnameseDateInput } from '../../../shared/components/VietnameseDateInput';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { Alert } from '../../../shared/components/Alert';
import { Icon } from '../../../shared/components/Icon';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';
import { validCalendarDate, nextCalendarDate } from '../../../shared/lib/calendar';
import { localTimeToIso } from '../../plan/model/plan-draft';
import { validTripBudget, validTripTimezone } from '../model/trip-metadata';
import { CreateTripSuccess } from './CreateTripSuccess';
import {
  GatewayCreateTripCover,
  resolveGatewayCoverFile,
  type GatewayCoverChoice,
} from './GatewayCreateTripCover';
import { TripDestinationMobilePreview, TripDestinationPreview } from './TripDestinationPreview';
import banner from '../../../shared/assets/figma/32882.svg';
import styles from './CreateTripPage.module.css';

interface Draft {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  budgetAmount: string;
  destination: string;
  expectedMembers: number;
  coverPreset: Extract<GatewayCoverChoice, string> | null;
}
type DraftErrors = Partial<
  Record<'name' | 'startDate' | 'endDate' | 'timezone' | 'budgetAmount' | 'description', string>
>;
const BASIC_FIELDS = ['name', 'startDate', 'endDate', 'timezone'] as const;

const CUSTOM_TIMEZONE = '__custom__';
const TIMEZONE_PRESETS = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam — UTC+07:00' },
  { value: 'Asia/Bangkok', label: 'Thái Lan — UTC+07:00' },
  { value: 'Asia/Singapore', label: 'Singapore — UTC+08:00' },
  { value: 'Asia/Tokyo', label: 'Nhật Bản — UTC+09:00' },
  { value: 'Asia/Seoul', label: 'Hàn Quốc — UTC+09:00' },
  { value: 'UTC', label: 'UTC — UTC+00:00' },
] as const;

function timezonePreset(value: string) {
  return TIMEZONE_PRESETS.some((preset) => preset.value === value) ? value : CUSTOM_TIMEZONE;
}

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
  if (!validTripTimezone(draft.timezone)) {
    errors.timezone = 'Vui lòng nhập múi giờ IANA hợp lệ.';
  }
  if (draft.budgetAmount.trim() && !validTripBudget(draft.budgetAmount.trim()))
    errors.budgetAmount = 'Ngân sách phải là số nguyên từ 1 đến 999.999.999.999 ₫.';
  return errors;
}

function focusFirstError(errors: DraftErrors) {
  const first = ([...BASIC_FIELDS, 'budgetAmount', 'description'] as const).find(
    (field) => errors[field],
  );
  if (first) {
    const id =
      first === 'timezone' ? 'gateway-create-trip-timezone-custom' : `gateway-create-trip-${first}`;
    (
      document.getElementById(id) ?? document.getElementById('gateway-create-trip-timezone')
    )?.focus();
  }
}

const empty = (): Draft => ({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  timezone: 'Asia/Ho_Chi_Minh',
  budgetAmount: '',
  destination: '',
  expectedMembers: 1,
  coverPreset: null,
});
function restore(raw: string | null): { draft: Draft; intent: CreateTripIntent | null } {
  if (!raw) return { draft: empty(), intent: null };
  const data = JSON.parse(raw) as { draft: Draft; intent: CreateTripIntent | null };
  if (
    !data ||
    !data.draft ||
    !['name', 'description', 'startDate', 'endDate', 'timezone'].every(
      (key) => typeof data.draft[key as keyof Draft] === 'string',
    ) ||
    (data.draft.budgetAmount !== undefined && typeof data.draft.budgetAmount !== 'string')
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
      (i.description !== undefined && typeof i.description !== 'string') ||
      (i.budgetAmount !== undefined &&
        (typeof i.budgetAmount !== 'string' || !validTripBudget(i.budgetAmount))))
  )
    throw Error('Yêu cầu phục hồi không hợp lệ.');
  return { ...data, draft: { ...empty(), ...data.draft } };
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
  const [mobileStep, setMobileStep] = useState<1 | 2>(initial.current.intent ? 2 : 1);
  const [customCover, setCustomCover] = useState<File | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
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
  const resetDraft = () => {
    setCreated(null);
    setDraft(empty());
    setCustomCover(null);
    setCoverFailed(false);
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
  const edit = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    if (busy || intent || created || initial.current?.invalid) return;
    const next = { ...draft, [field]: value };
    setDraft(next);
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof DraftErrors];
      return next;
    });
    setMessage('');
    persist(next, null);
  };
  const selectedTimezonePreset = timezonePreset(draft.timezone);
  const customTimezone = selectedTimezonePreset === CUSTOM_TIMEZONE;
  const locked = busy || !!intent || !!created || initial.current.invalid;
  const coverChoice = customCover ?? draft.coverPreset;
  const perPerson =
    draft.expectedMembers > 1 && validTripBudget(draft.budgetAmount)
      ? Math.round(Number(draft.budgetAmount) / draft.expectedMembers).toLocaleString('vi-VN')
      : null;
  const continueToDetails = () => {
    if (!locked) {
      const nextErrors = validateDraft(draft);
      if (BASIC_FIELDS.some((field) => nextErrors[field])) {
        setErrors(nextErrors);
        setFocusError(true);
        return;
      }
    }
    setMobileStep(2);
  };
  const showErrors = (nextErrors: DraftErrors) => {
    setErrors(nextErrors);
    if (BASIC_FIELDS.some((field) => nextErrors[field])) setMobileStep(1);
    else if (Object.values(nextErrors).some(Boolean)) setMobileStep(2);
    setFocusError(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current || initial.current?.invalid || !actorId) return;
    if (mobileStep === 1 && window.matchMedia?.('(max-width: 768px)').matches) {
      continueToDetails();
      return;
    }
    let snapshot = intent;
    try {
      if (!snapshot) {
        const nextErrors = validateDraft(draft);
        if (Object.values(nextErrors).some(Boolean)) {
          setMessage('Vui lòng kiểm tra các trường được đánh dấu.');
          showErrors(nextErrors);
          return;
        }
        snapshot = {
          name: draft.name.trim(),
          ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
          startAt: localTimeToIso(draft.startDate, '00:00', draft.timezone),
          endAt: localTimeToIso(nextCalendarDate(draft.endDate), '00:00', draft.timezone),
          timezone: draft.timezone,
          ...(draft.budgetAmount.trim() ? { budgetAmount: draft.budgetAmount.trim() } : {}),
          clientRequestId: crypto.randomUUID(),
        };
        if (!persist(draft, snapshot))
          throw Error('Cần bật bộ nhớ phiên để lưu yêu cầu an toàn trước khi tạo chuyến đi.');
        setErrors({});
        setIntent(snapshot);
      }
      setMobileStep(2);
      sending.current = true;
      setBusy(true);
      setMessage('');
      const controller = new AbortController();
      request.current = controller;
      const result = await repository.createTrip({ intent: snapshot, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.status === 'created') {
        cache.current.write(browserStorage('sessionStorage'), key, null);
        if (coverChoice && repository.uploadCover) {
          try {
            const file = await resolveGatewayCoverFile(coverChoice);
            if (controller.signal.aborted) return;
            await repository.uploadCover({
              tripId: result.tripId,
              file,
              signal: controller.signal,
            });
          } catch {
            if (!controller.signal.aborted) setCoverFailed(true);
          }
          if (controller.signal.aborted) return;
        }
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
          if (result.fieldErrors.budgetAmount)
            nextErrors.budgetAmount = result.fieldErrors.budgetAmount;
          showErrors(nextErrors);
        }
        setMessage(
          result.status === 'forbidden'
            ? 'Bạn không có quyền tạo chuyến đi.'
            : 'Thông tin chưa hợp lệ. Kiểm tra tên, ngày, múi giờ và ngân sách.',
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
    <section className={styles.page} data-flow="create-trip" data-mobile-step={mobileStep}>
      <img className={styles.banner} src={banner} alt="" />
      <header className={styles.pageHeader}>
        <div>
          <nav className={styles.trail} aria-label="Đường dẫn">
            <Link to={paths.trips}>Chuyến đi của tôi</Link>
            <Icon name="chevronRight" size={12} />
            <span aria-current="page">Tạo chuyến đi</span>
          </nav>
          <h1>Tạo chuyến đi mới</h1>
          <p>Lên kế hoạch cho hành trình tiếp theo và khám phá thế giới cùng Wolfari!</p>
        </div>
      </header>
      <nav className={styles.stepper} aria-label="Các bước tạo chuyến đi">
        <button
          type="button"
          className={mobileStep === 1 ? styles.activeStep : ''}
          aria-current={mobileStep === 1 ? 'step' : undefined}
          onClick={() => setMobileStep(1)}
        >
          <span>1</span> Thông tin cơ bản
        </button>
        <i aria-hidden="true" />
        <button
          type="button"
          className={mobileStep === 2 ? styles.activeStep : ''}
          aria-current={mobileStep === 2 ? 'step' : undefined}
          onClick={continueToDetails}
        >
          <span>2</span> Cá nhân hóa
        </button>
      </nav>
      {(message || memoryOnly || intent) && (
        <div className={styles.topAlert}>
          {message && <Alert live>{message}</Alert>}
          {memoryOnly && (
            <Alert tone="warning">
              Bản nháp chỉ còn trong tab; chưa thể gửi yêu cầu mới an toàn.
            </Alert>
          )}
          {intent && !busy && (
            <Alert tone="warning">
              Đang giữ yêu cầu đã gửi. Nội dung bị khóa đến khi xác định được kết quả.
            </Alert>
          )}
        </div>
      )}
      <form
        onSubmit={(event) => void submit(event)}
        aria-labelledby="gateway-create-trip-title"
        noValidate
      >
        <div className={styles.layout}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <span className={styles.iconBadge} aria-hidden="true">
                <Icon name="compass" size={22} />
              </span>
              <div>
                <h2 id="gateway-create-trip-title">Thông tin cơ bản</h2>
                <p>Bắt đầu với những thông tin chính về chuyến đi của bạn</p>
              </div>
            </div>
            <fieldset
              className={`${styles.formStep} ${styles.stepOne} ${styles.gatewayFields}`}
              disabled={locked}
            >
              <div className={styles.mobileIntro}>
                <span>BƯỚC 1/2</span>
                <h2>Hành trình bắt đầu từ một ý tưởng</h2>
                <p>Cho chúng mình biết những thông tin đầu tiên nhé!</p>
              </div>
              <Input
                id="gateway-create-trip-name"
                label="Tên chuyến đi"
                placeholder="Ví dụ: Đà Nẵng cùng hội bạn thân"
                value={draft.name}
                maxLength={200}
                autoComplete="off"
                leadingIcon={
                  <span className={styles.fieldChip}>
                    <Icon name="edit" size={18} />
                  </span>
                }
                required
                error={errors.name}
                onChange={(e) => edit('name', e.target.value)}
              />
              <div className={styles.destinationField}>
                <label htmlFor="gateway-create-trip-destination">Điểm đến chính</label>
                <div className={styles.destinationInput}>
                  <span className={styles.fieldChip} aria-hidden="true">
                    <Icon name="search" size={18} />
                  </span>
                  <input
                    id="gateway-create-trip-destination"
                    value={draft.destination}
                    placeholder="Bạn muốn đi đâu?"
                    maxLength={200}
                    aria-describedby="gateway-create-trip-destination-hint"
                    onChange={(event) => edit('destination', event.target.value)}
                  />
                </div>
                <small
                  id="gateway-create-trip-destination-hint"
                  className={styles.gatewayDestinationHint}
                >
                  Điểm đến chỉ dùng để xem gợi ý.
                </small>
              </div>
              <div className={styles.dates}>
                <VietnameseDateInput
                  id="gateway-create-trip-startDate"
                  label="Ngày đi"
                  pickerLabel="Lịch khởi hành"
                  value={draft.startDate}
                  required
                  error={errors.startDate}
                  onValueChange={(value) => edit('startDate', value)}
                />
                <VietnameseDateInput
                  id="gateway-create-trip-endDate"
                  label="Ngày về"
                  pickerLabel="Lịch kết thúc"
                  value={draft.endDate}
                  min={draft.startDate}
                  required
                  error={errors.endDate}
                  onValueChange={(value) => edit('endDate', value)}
                />
              </div>
              <Select
                id="gateway-create-trip-timezone"
                label="Múi giờ"
                hint="Chọn múi giờ thường dùng hoặc chọn múi giờ khác để nhập mã IANA."
                value={selectedTimezonePreset}
                required
                error={!customTimezone ? errors.timezone : undefined}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === CUSTOM_TIMEZONE) {
                    edit('timezone', customTimezone ? draft.timezone : '');
                  } else {
                    edit('timezone', next);
                  }
                }}
              >
                {TIMEZONE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                <option value={CUSTOM_TIMEZONE}>Múi giờ khác — nhập mã IANA</option>
              </Select>
              {customTimezone && (
                <Input
                  id="gateway-create-trip-timezone-custom"
                  label="Múi giờ IANA"
                  hint="Ví dụ: America/New_York"
                  value={draft.timezone}
                  required
                  error={errors.timezone}
                  onChange={(e) => edit('timezone', e.target.value)}
                />
              )}
              <fieldset className={styles.memberField}>
                <legend>Số thành viên dự kiến</legend>
                <div>
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-label={count === 6 ? '6 thành viên trở lên' : `${count} thành viên`}
                      aria-pressed={draft.expectedMembers === count}
                      onClick={() => edit('expectedMembers', count)}
                    >
                      {count === 6 ? '6+' : count}
                    </button>
                  ))}
                </div>
              </fieldset>
              <TripDestinationMobilePreview destination={draft.destination} />
            </fieldset>
            <div className={`${styles.mobileActions} ${styles.stepOne}`}>
              <Button type="button" onClick={continueToDetails}>
                Tiếp tục <span aria-hidden="true">→</span>
              </Button>
            </div>
            <div className={`${styles.formStep} ${styles.stepTwo}`}>
              <fieldset className={styles.gatewayFields} disabled={locked}>
                <div className={styles.mobileIntro}>
                  <span>BƯỚC 2/2</span>
                  <h2>Theo cách của bạn</h2>
                  <p>Thêm một chút cá tính cho hành trình sắp tới!</p>
                </div>
                <div className={styles.budgetField}>
                  <Input
                    id="gateway-create-trip-budgetAmount"
                    label="Ngân sách dự kiến"
                    placeholder="0"
                    leadingIcon={
                      <span className={styles.fieldChip}>
                        <Icon name="fund" size={18} />
                      </span>
                    }
                    value={draft.budgetAmount}
                    inputMode="numeric"
                    maxLength={12}
                    error={errors.budgetAmount}
                    onChange={(event) =>
                      edit('budgetAmount', event.target.value.replace(/\D/g, ''))
                    }
                  />
                  <span className={styles.currency}>VNĐ</span>
                  {perPerson && <small>Khoảng {perPerson} VNĐ / người</small>}
                </div>
                <Textarea
                  id="gateway-create-trip-description"
                  label="Mô tả ngắn"
                  hint="Không bắt buộc"
                  placeholder="Bạn mong chờ điều gì ở chuyến đi này?"
                  value={draft.description}
                  rows={4}
                  maxLength={500}
                  error={errors.description}
                  onChange={(e) => edit('description', e.target.value)}
                />
                {repository.uploadCover && (
                  <GatewayCreateTripCover
                    choice={coverChoice}
                    onChoiceChange={(choice) => {
                      if (locked) return;
                      setCustomCover(typeof choice === 'string' ? null : choice);
                      edit('coverPreset', typeof choice === 'string' ? choice : null);
                    }}
                  />
                )}
              </fieldset>
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="plain"
                  disabled={locked}
                  onClick={() => {
                    resetDraft();
                    setMobileStep(1);
                  }}
                >
                  Bỏ bản nháp
                </Button>
                <Link to={paths.trips}>Hủy</Link>
                <Button
                  ref={createActionRef}
                  type="submit"
                  icon={<Icon name="sparkles" size={18} />}
                  loading={busy}
                  disabled={initial.current.invalid || !!created}
                >
                  {intent && !busy ? 'Thử lại đúng yêu cầu cũ' : 'Tạo chuyến đi'}
                </Button>
              </div>
            </div>
          </div>
          <TripDestinationPreview
            destination={draft.destination}
            onSelect={(name) => edit('destination', name)}
            label="Bản đồ điểm đến"
            disabled={locked}
          />
        </div>
      </form>
      {created && (
        <CreateTripSuccess
          tripId={created}
          onDismiss={resetDraft}
          coverFailed={coverFailed}
          returnFocusRef={createActionRef}
        />
      )}
    </section>
  );
}
