import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router';
import type { RouteContext } from '../../../app/route-context';
import { GatewayCreateTripPage } from './GatewayCreateTripPage';
import { paths } from '../../../app/route-paths';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { browserStorage, type StorageStatus } from '../../../shared/lib/browser-storage';
import { Textarea } from '../../../shared/components/Textarea';
import banner from '../../../shared/assets/figma/32882.svg';
import mapArtwork from '../../../shared/assets/figma/8222b.svg';
import destinationPhoto from '../../../shared/assets/figma/06bd1.png';
import destinationThumb1 from '../../../shared/assets/figma/ead32.svg';
import destinationThumb2 from '../../../shared/assets/figma/5b6b8.svg';
import destinationThumb3 from '../../../shared/assets/figma/274c0.svg';
import styleExplore from '../../../shared/assets/figma/70141.svg';
import styleRelax from '../../../shared/assets/figma/d97e6.svg';
import styleFood from '../../../shared/assets/figma/e1a1d.svg';
import styleCulture from '../../../shared/assets/figma/70fc5.svg';
import cover1 from '../../../shared/assets/figma/57139.svg';
import cover2 from '../../../shared/assets/figma/b13e3.svg';
import cover3 from '../../../shared/assets/figma/0ca42.svg';
import { useTripRepository } from '../repositories/repository-context';
import type { CreateTripResult } from '../repositories/trip.repository';
import {
  clearCreateTripDraft,
  createTripIntentFromDraft,
  emptyCreateTripDraft,
  readCreateTripDraft,
  validateCreateTripDraft,
  writeCreateTripDraft,
  type CreateTripDraftField,
  type CreateTripDraftV2,
  type CreateTripErrors,
  type TripCover,
  type TripStyle,
  type TripTemplate,
} from './create-trip';
import { CreateTripSuccess } from './CreateTripSuccess';
import styles from './CreateTripPage.module.css';

const storage = () => browserStorage('sessionStorage');

const destinations = [
  { name: 'Đà Nẵng', caption: 'Thành phố biển', image: destinationPhoto },
  { name: 'Phú Quốc', caption: 'Đảo ngọc', image: destinationThumb1 },
  { name: 'Sa Pa', caption: 'Phố núi trong mây', image: destinationThumb2 },
  { name: 'Hà Nội', caption: 'Thủ đô ngàn năm', image: destinationThumb3 },
  { name: 'Ninh Bình', caption: 'Non nước hữu tình', image: destinationThumb1 },
  { name: 'Huế', caption: 'Cố đô thơ mộng', image: destinationThumb2 },
] as const;

const styleOptions: ReadonlyArray<{ value: TripStyle; label: string; icon: string }> = [
  { value: 'explore', label: 'Khám phá', icon: styleExplore },
  { value: 'relax', label: 'Nghỉ dưỡng', icon: styleRelax },
  { value: 'food', label: 'Ẩm thực', icon: styleFood },
  { value: 'culture', label: 'Văn hóa', icon: styleCulture },
];

const coverOptions: ReadonlyArray<{
  value: Exclude<TripCover, 'custom'>;
  image: string;
  label: string;
}> = [
  { value: 'cover-1', image: cover1, label: 'Bầu trời xanh' },
  { value: 'cover-2', image: cover2, label: 'Hoàng hôn' },
  { value: 'cover-3', image: cover3, label: 'Thiên nhiên' },
];

const resultMessages: Partial<Record<CreateTripResult['status'], string>> = {
  unavailable:
    'Dịch vụ tạo chuyến đi hiện chưa khả dụng. Bản nháp vẫn được giữ để bạn thử lại sau.',
  forbidden: 'Bạn không có quyền tạo chuyến đi. Bản nháp vẫn được giữ nguyên.',
  conflict: 'Yêu cầu này đang bị trùng hoặc xung đột. Hãy kiểm tra lại trước khi thử lại.',
  error: 'Không thể tạo chuyến đi lúc này. Bản nháp vẫn được giữ để bạn thử lại.',
  unknown: 'Máy chủ trả về kết quả chưa xác định. Chưa có dữ liệu bản nháp nào bị xóa.',
};

export function CreateTripPage() {
  const context = useOutletContext<RouteContext | undefined>();
  if (context && !context.previewEnabled)
    return context.viewer?.id ? (
      <GatewayCreateTripPage key={context.viewer.id} actorId={context.viewer.id} />
    ) : (
      <Alert>Đang xác định tài khoản. Vui lòng tải lại nếu phiên đã hết hạn.</Alert>
    );
  return <PreviewCreateTripPage />;
}
function PreviewCreateTripPage() {
  const repository = useTripRepository();
  const restored = useRef(readCreateTripDraft(storage()));
  const [draft, setDraft] = useState<CreateTripDraftV2>(restored.current ?? emptyCreateTripDraft());
  const [errors, setErrors] = useState<CreateTripErrors>({});
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [showRestored, setShowRestored] = useState(restored.current !== null);
  const [requestMessage, setRequestMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const [customCover, setCustomCover] = useState<string | null>(null);
  const [coverError, setCoverError] = useState('');
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('saved');
  const activeRequest = useRef<AbortController | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    setStorageStatus(writeCreateTripDraft(storage(), draft));
  }, [draft]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      if (customCover) URL.revokeObjectURL(customCover);
    },
    [customCover],
  );

  const selectedDestination = destinations.find((item) => item.name === draft.destination);
  const selectedPhoto = selectedDestination?.image ?? destinationPhoto;
  const perPerson = useMemo(() => {
    const value = Number(draft.budget.replace(/[^\d]/g, ''));
    if (!Number.isFinite(value) || value <= 0) return '';
    return Math.round(value / draft.expectedMembers).toLocaleString('vi-VN');
  }, [draft.budget, draft.expectedMembers]);

  const update = <K extends keyof CreateTripDraftV2>(field: K, value: CreateTripDraftV2[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field as CreateTripDraftField];
        return next;
      });
    }
    setRequestMessage('');
    setShowRestored(false);
  };

  const focusFirstError = (nextErrors: CreateTripErrors) => {
    const first = (['name', 'destination', 'startDate', 'endDate'] as const).find(
      (field) => nextErrors[field],
    );
    if (first) document.getElementById(`create-trip-${first}`)?.focus();
  };

  const continueToDetails = () => {
    const nextErrors = validateCreateTripDraft(draft);
    const stepErrors: CreateTripErrors = { ...nextErrors };
    setErrors(stepErrors);
    if (Object.values(stepErrors).some(Boolean)) {
      focusFirstError(stepErrors);
      return;
    }
    setMobileStep(2);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const discard = () => {
    clearCreateTripDraft(storage());
    setDraft(emptyCreateTripDraft());
    setErrors({});
    setShowRestored(false);
    setRequestMessage('');
    setMobileStep(1);
  };

  const selectDestination = (name: string) => {
    update('destination', name);
    setErrors((current) => {
      const next = { ...current };
      delete next.destination;
      return next;
    });
  };

  const uploadCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCoverError('Vui lòng chọn tệp ảnh.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError('Ảnh bìa không được lớn hơn 5 MB.');
      return;
    }
    if (customCover) URL.revokeObjectURL(customCover);
    setCustomCover(URL.createObjectURL(file));
    setCoverError('');
    update('cover', 'custom');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const nextErrors = validateCreateTripDraft(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setMobileStep(1);
      focusFirstError(nextErrors);
      return;
    }

    submitting.current = true;
    setPending(true);
    setRequestMessage('');
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const result = await repository.createTrip({
        intent: createTripIntentFromDraft(draft),
        signal: controller.signal,
      });
      if (result.status === 'created') {
        clearCreateTripDraft(storage());
        setCreatedTripId(result.tripId);
      } else if (result.status === 'validation-error') {
        setErrors((current) => ({
          ...current,
          ...(result.fieldErrors.name ? { name: result.fieldErrors.name } : {}),
          ...(result.fieldErrors.startAt ? { startDate: result.fieldErrors.startAt } : {}),
          ...(result.fieldErrors.endAt ? { endDate: result.fieldErrors.endAt } : {}),
        }));
        setMobileStep(1);
        setRequestMessage(
          'Máy chủ chưa chấp nhận một số thông tin. Vui lòng kiểm tra lại các trường được đánh dấu.',
        );
      } else {
        setRequestMessage(resultMessages[result.status] ?? resultMessages.unknown!);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setRequestMessage('Kết nối bị gián đoạn. Bản nháp vẫn được giữ để bạn thử lại.');
      }
    } finally {
      submitting.current = false;
      setPending(false);
      activeRequest.current = null;
    }
  };

  const errorEntries = Object.entries(errors).filter(
    (entry): entry is [CreateTripDraftField, string] => Boolean(entry[1]),
  );

  return (
    <main className={styles.page} data-flow="create-trip" data-mobile-step={mobileStep}>
      <img className={styles.banner} src={banner} alt="" aria-hidden="true" />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>CHUYẾN ĐI MỚI</p>
          <h1>Tạo chuyến đi mới</h1>
          <p>Lên kế hoạch cho hành trình tiếp theo và khám phá thế giới cùng Wolfari!</p>
        </div>
        <Link className={styles.backLink} to={paths.trips}>
          ← Chuyến đi của tôi
        </Link>
      </header>

      <nav className={styles.stepper} aria-label="Các bước tạo chuyến đi">
        <button
          type="button"
          className={mobileStep === 1 ? styles.activeStep : ''}
          onClick={() => setMobileStep(1)}
        >
          <span>1</span> Thông tin cơ bản
        </button>
        <i aria-hidden="true" />
        <button
          type="button"
          className={mobileStep === 2 ? styles.activeStep : ''}
          onClick={continueToDetails}
        >
          <span>2</span> Cá nhân hóa
        </button>
      </nav>

      {showRestored && (
        <div className={styles.topAlert}>
          <Alert live>Bản nháp trong tab này đã được khôi phục.</Alert>
        </div>
      )}
      {storageStatus === 'memory' && (
        <div className={styles.topAlert}>
          <Alert tone="warning" live>
            Không thể lưu vào trình duyệt. Bản nháp chỉ được giữ trong bộ nhớ của tab này và sẽ mất
            khi tải lại hoặc đóng tab.
          </Alert>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <div className={styles.layout}>
          <section className={styles.formCard} aria-label="Thông tin chuyến đi">
            {errorEntries.length > 0 && (
              <div className={styles.errorSummary} role="alert" tabIndex={-1}>
                <strong>Vui lòng kiểm tra lại thông tin:</strong>
                <ul>
                  {errorEntries.map(([field, message]) => (
                    <li key={field}>
                      <a href={`#create-trip-${field}`}>{message}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={`${styles.formStep} ${styles.stepOne}`}>
              <div className={styles.mobileIntro}>
                <span>BƯỚC 1/2</span>
                <h2>Hành trình bắt đầu từ một ý tưởng</h2>
                <p>Cho chúng mình biết những thông tin đầu tiên nhé!</p>
              </div>

              <Input
                id="create-trip-name"
                label="Tên chuyến đi"
                placeholder="Ví dụ: Đà Nẵng cùng hội bạn thân"
                value={draft.name}
                maxLength={200}
                autoComplete="off"
                required
                error={errors.name}
                onChange={(event) => update('name', event.target.value)}
              />

              <div className={styles.destinationField}>
                <label htmlFor="create-trip-destination">Điểm đến chính</label>
                <div
                  className={`${styles.destinationInput} ${errors.destination ? styles.invalid : ''}`}
                >
                  <span aria-hidden="true">⌖</span>
                  <input
                    id="create-trip-destination"
                    value={draft.destination}
                    placeholder="Bạn muốn đi đâu?"
                    aria-invalid={Boolean(errors.destination)}
                    aria-describedby={
                      errors.destination ? 'create-trip-destination-error' : undefined
                    }
                    onChange={(event) => update('destination', event.target.value)}
                  />
                </div>
                {errors.destination && (
                  <span id="create-trip-destination-error" className={styles.fieldError}>
                    {errors.destination}
                  </span>
                )}
              </div>

              <div className={styles.dates}>
                <Input
                  id="create-trip-startDate"
                  label="Ngày đi"
                  type="date"
                  value={draft.startDate}
                  required
                  error={errors.startDate}
                  onChange={(event) => update('startDate', event.target.value)}
                />
                <Input
                  id="create-trip-endDate"
                  label="Ngày về"
                  type="date"
                  min={draft.startDate || undefined}
                  value={draft.endDate}
                  required
                  error={errors.endDate}
                  onChange={(event) => update('endDate', event.target.value)}
                />
              </div>

              <fieldset className={styles.memberField}>
                <legend>Số thành viên dự kiến</legend>
                <div>
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-label={`${count} thành viên`}
                      aria-pressed={draft.expectedMembers === count}
                      onClick={() => update('expectedMembers', count)}
                    >
                      {count === 6 ? '6+' : count}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className={styles.mobileDestinationPreview}>
                <img
                  src={selectedPhoto}
                  alt={
                    draft.destination ? `Điểm đến ${draft.destination}` : 'Gợi ý điểm đến Đà Nẵng'
                  }
                />
                <div>
                  <strong>{draft.destination || 'Đà Nẵng'}</strong>
                  <span>{selectedDestination?.caption ?? 'Thành phố đáng sống'}</span>
                </div>
              </div>

              <div className={styles.mobileActions}>
                <Button type="button" onClick={continueToDetails}>
                  Tiếp tục <span aria-hidden="true">→</span>
                </Button>
              </div>
            </div>

            <div className={`${styles.formStep} ${styles.stepTwo}`}>
              <div className={styles.mobileIntro}>
                <span>BƯỚC 2/2</span>
                <h2>Theo cách của bạn</h2>
                <p>Thêm một chút cá tính cho hành trình sắp tới.</p>
              </div>

              <fieldset className={styles.choiceField}>
                <legend>Phong cách chuyến đi</legend>
                <div className={styles.styleChoices}>
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={draft.style === option.value}
                      onClick={() => update('style', option.value)}
                    >
                      <img src={option.icon} alt="" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className={styles.budgetField}>
                <Input
                  id="create-trip-budget"
                  label="Ngân sách dự kiến"
                  inputMode="numeric"
                  placeholder="0"
                  value={draft.budget}
                  onChange={(event) => update('budget', event.target.value.replace(/[^\d]/g, ''))}
                />
                <span className={styles.currency}>VNĐ</span>
                {perPerson && <small>Khoảng {perPerson} VNĐ / người</small>}
              </div>

              <fieldset className={styles.templateField}>
                <legend>Mẫu chuyến đi</legend>
                <div>
                  {(
                    [
                      ['blank', 'Trang trắng', 'Tự do lên kế hoạch'],
                      ['balanced', 'Cân bằng', 'Khám phá và nghỉ ngơi'],
                      ['discovery', 'Khám phá', 'Tận dụng từng khoảnh khắc'],
                    ] as const
                  ).map(([value, title, note]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={draft.template === value}
                      onClick={() => update('template', value as TripTemplate)}
                    >
                      <span aria-hidden="true">
                        {value === 'blank' ? '○' : value === 'balanced' ? '◒' : '✦'}
                      </span>
                      <strong>{title}</strong>
                      <small>{note}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <Textarea
                id="create-trip-description"
                label="Mô tả ngắn"
                hint="Không bắt buộc"
                placeholder="Bạn mong chờ điều gì ở chuyến đi này?"
                value={draft.description}
                rows={4}
                maxLength={500}
                onChange={(event) => update('description', event.target.value)}
              />

              <fieldset className={styles.coverField}>
                <legend>Ảnh bìa chuyến đi</legend>
                <div className={styles.coverChoices}>
                  <label
                    className={`${styles.uploadCover} ${draft.cover === 'custom' ? styles.selectedCover : ''}`}
                  >
                    <input type="file" accept="image/*" onChange={uploadCover} />
                    {customCover ? (
                      <img src={customCover} alt="Ảnh bìa đã tải lên" />
                    ) : (
                      <>
                        <span aria-hidden="true">＋</span>
                        <strong>Tải ảnh lên</strong>
                        <small>PNG, JPG · Tối đa 5 MB</small>
                      </>
                    )}
                  </label>
                  {coverOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={draft.cover === option.value ? styles.selectedCover : ''}
                      aria-label={`Chọn ảnh bìa ${option.label}`}
                      aria-pressed={draft.cover === option.value}
                      onClick={() => update('cover', option.value)}
                    >
                      <img src={option.image} alt="" />
                    </button>
                  ))}
                </div>
                {coverError && <span className={styles.fieldError}>{coverError}</span>}
              </fieldset>

              <p className={styles.draftNote}>
                Điểm đến, thành viên, phong cách, ngân sách, mẫu và ảnh bìa đang được giữ trong bản
                nháp trên thiết bị này; máy chủ hiện chỉ lưu thông tin chuyến đi cơ bản.
              </p>
              {requestMessage && <Alert live>{requestMessage}</Alert>}

              <div className={styles.actions}>
                <Button type="button" variant="plain" onClick={discard}>
                  Bỏ bản nháp
                </Button>
                <Link to={paths.trips}>Hủy</Link>
                <Button type="submit" loading={pending}>
                  Tạo chuyến đi
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.destinationPanel} aria-label="Gợi ý điểm đến">
            <div className={styles.mapArea}>
              <img src={mapArtwork} alt="" aria-hidden="true" />
              <span>Chọn một nơi để bắt đầu hành trình</span>
            </div>
            <div className={styles.selectedDestination}>
              <img src={selectedPhoto} alt="" />
              <div>
                <small>ĐIỂM ĐẾN ĐÃ CHỌN</small>
                <strong>{draft.destination || 'Chưa chọn điểm đến'}</strong>
                <span>{selectedDestination?.caption ?? 'Chọn từ danh sách gợi ý bên dưới'}</span>
              </div>
            </div>
            <div className={styles.suggestions}>
              <h2>Điểm đến phổ biến</h2>
              <div>
                {destinations.map((destination) => (
                  <button
                    key={destination.name}
                    type="button"
                    aria-pressed={draft.destination === destination.name}
                    onClick={() => selectDestination(destination.name)}
                  >
                    <img src={destination.image} alt="" />
                    <span>
                      <strong>{destination.name}</strong>
                      <small>{destination.caption}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </form>

      {createdTripId && (
        <CreateTripSuccess tripId={createdTripId} onContinue={() => setCreatedTripId(null)} />
      )}
    </main>
  );
}
