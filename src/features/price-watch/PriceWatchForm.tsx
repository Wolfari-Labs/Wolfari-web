import { useId, useRef, useState, type FormEvent } from 'react';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { localTimeToIso } from '../plan/model/plan-draft';
import { localDate } from '../plan/model/plan-presentation';
import { isValidDate } from './model/price-watch';
import {
  capabilitiesLine,
  capabilityErrors,
  cabinClasses,
  journeyTypes,
  flightProviderLabels,
  type PriceWatchCapabilities,
  isFlightProvider,
  type RuntimeWatch,
  type WatchFields,
} from './model/runtime-price-watch';
import { Icon } from '../../shared/components/Icon';
import formStyles from './PriceWatchForm.module.css';

const cabinLabels = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
  FIRST: 'Hạng nhất',
} as const;
const passengerLabels = { adults: 'Người lớn', children: 'Trẻ em', infants: 'Em bé' } as const;

export function PriceWatchForm({
  initial,
  disabled,
  busy,
  preview = false,
  capabilities = null,
  onSave,
}: {
  initial: RuntimeWatch | null;
  timezone: string;
  disabled: boolean;
  busy: boolean;
  preview?: boolean;
  capabilities?: PriceWatchCapabilities | null;
  onSave: (fields: WatchFields) => void;
}) {
  const form = useRef<HTMLFormElement>(null),
    prefix = useId();
  const caps =
    !preview &&
    capabilities &&
    (!initial || (capabilities.available && initial.fields.provider === capabilities.provider))
      ? capabilities
      : null;
  const provider: unknown = preview
    ? 'MOCK_FLIGHT'
    : (caps?.provider ?? import.meta.env.VITE_PRICE_WATCH_PROVIDER);
  const [fields, setFields] = useState<WatchFields>(
    initial?.fields ?? {
      ...(isFlightProvider(provider) ? { provider } : {}),
      origin: '',
      destination: '',
      departure_date: '',
      departure_at: '',
      return_date: null,
      journey_type:
        caps && !caps.journeyTypes.includes('ONE_WAY')
          ? (caps.journeyTypes[0] ?? 'ONE_WAY')
          : 'ONE_WAY',

      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class:
        caps && !caps.cabinClasses.includes('ECONOMY') ? (caps.cabinClasses[0] ?? null) : 'ECONOMY',

      currency: 'VND',
      threshold_price: '',
    },
  );
  const [clock, setClock] = useState(
    initial
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date(initial.fields.departure_at))
      : '09:00',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const restricted = !caps && fields.provider !== undefined && fields.provider !== 'MOCK_FLIGHT';
  const journeyChoices = caps?.journeyTypes ?? journeyTypes;
  const cabinChoices = caps?.cabinClasses ?? cabinClasses;
  const passengerMax = {
    adults: caps ? Math.min(9, caps.maxAdults, caps.maxPassengers) : 9,
    children: caps ? Math.min(9, caps.maxChildren, Math.max(0, caps.maxPassengers - 1)) : 9,
    infants: caps ? Math.min(9, caps.maxInfants, Math.max(0, caps.maxPassengers - 1)) : 9,
  };
  const passengerFields = (['adults', 'children', 'infants'] as const).filter(
    (key) => !caps || passengerMax[key] > (key === 'adults' ? 1 : 0),
  );
  const createBlocked = !!caps && !caps.available && !initial;

  const usesDeadline = fields.provider !== 'MOCK_FLIGHT';
  const fieldProps = (name: string) => ({ id: `${prefix}-${name}`, name, error: errors[name] });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || busy || createBlocked) return;
    const next: Record<string, string> = {};
    if (!/^[A-Z]{3}$/.test(fields.origin)) next.origin = 'Nhập mã sân bay gồm 3 chữ cái.';
    if (!/^[A-Z]{3}$/.test(fields.destination)) next.destination = 'Nhập mã sân bay gồm 3 chữ cái.';
    else if (fields.destination === fields.origin)
      next.destination = 'Sân bay đến phải khác sân bay đi.';
    let departure_at = '';
    try {
      if (!isValidDate(fields.departure_date)) throw Error();
      departure_at = localTimeToIso(fields.departure_date, clock, 'UTC');
      if (
        Date.parse(departure_at) <= Date.now() ||
        localDate(departure_at, 'UTC') !== fields.departure_date
      )
        throw Error();
    } catch {
      next.departure_date = 'Chọn ngày, giờ khởi hành hợp lệ trong tương lai.';
    }
    if (
      fields.journey_type === 'ROUND_TRIP' &&
      (!fields.return_date ||
        !isValidDate(fields.return_date) ||
        fields.return_date < fields.departure_date)
    )
      next.return_date = 'Ngày về phải từ ngày khởi hành trở đi.';
    for (const key of ['adults', 'children', 'infants'] as const) {
      const value = fields.passengers[key];
      if (!Number.isInteger(value) || value < (key === 'adults' ? 1 : 0) || value > 9)
        next[key] = key === 'adults' ? 'Cần từ 1 đến 9 người lớn.' : 'Nhập số nguyên từ 0 đến 9.';
    }
    if (fields.passengers.infants > fields.passengers.adults)
      next.infants = 'Số em bé không được vượt quá số người lớn.';
    if (Object.values(fields.passengers).reduce((a, b) => a + b, 0) > 9)
      next.adults = 'Mỗi theo dõi hỗ trợ tối đa 9 hành khách.';
    if (
      !/^[1-9]\d{0,18}$/.test(fields.threshold_price) ||
      BigInt(fields.threshold_price) > 9223372036854775807n
    )
      next.threshold_price =
        'Nhập số tiền VND nguyên, lớn hơn 0 và không quá 9.223.372.036.854.775.807.';
    if (caps)
      for (const [key, message] of Object.entries(capabilityErrors(fields, caps)))
        next[key] ??= message;
    setErrors(next);
    if (Object.keys(next).length) {
      form.current?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    onSave({
      ...fields,
      departure_at,
      return_date: fields.journey_type === 'ROUND_TRIP' ? fields.return_date : null,
    });
  };
  return (
    <form ref={form} onSubmit={submit} noValidate className={formStyles.form}>
      <p className={formStyles.source}>
        <Icon name="info" size={16} />
        <span>
          {caps?.available
            ? capabilitiesLine(caps)
            : fields.provider === undefined
              ? 'Nguồn giá theo cấu hình hệ thống.'
              : restricted
                ? `Nguồn: ${flightProviderLabels[fields.provider]} · giá tham khảo cho 1 người lớn, một chiều, hạng phổ thông.`
                : 'Nguồn: giá mô phỏng, không phải giá thị trường.'}
        </span>
      </p>
      {createBlocked && (
        <Alert tone="warning">
          Nguồn giá chưa sẵn sàng nên tạm thời chưa tạo được theo dõi mới. Thử lại sau.
        </Alert>
      )}
      <fieldset disabled={disabled || busy} className={formStyles.fields}>
        <legend className={formStyles.hiddenLegend}>Thông tin chuyến bay</legend>
        <fieldset className={formStyles.group}>
          <legend>Chặng bay</legend>
          <div className={formStyles.grid}>
            <Input
              {...fieldProps('origin')}
              label="Sân bay đi (IATA)"
              required
              maxLength={3}
              value={fields.origin}
              onChange={(e) =>
                setFields({ ...fields, origin: e.target.value.toUpperCase().trim() })
              }
              placeholder="DAD"
              autoComplete="off"
            />
            <Input
              {...fieldProps('destination')}
              label="Sân bay đến (IATA)"
              required
              maxLength={3}
              value={fields.destination}
              onChange={(e) =>
                setFields({ ...fields, destination: e.target.value.toUpperCase().trim() })
              }
              placeholder="SGN"
              autoComplete="off"
            />
            {journeyChoices.length > 1 && (
              <Select
                {...fieldProps('journey_type')}
                label="Hành trình"
                disabled={restricted}
                value={fields.journey_type}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    journey_type: e.target.value as WatchFields['journey_type'],
                  })
                }
              >
                {journeyChoices.includes('ONE_WAY') && <option value="ONE_WAY">Một chiều</option>}
                {journeyChoices.includes('ROUND_TRIP') && (
                  <option value="ROUND_TRIP">Khứ hồi</option>
                )}
              </Select>
            )}
            <Input
              {...fieldProps('departure_date')}
              label="Ngày khởi hành"
              type="date"
              required
              value={fields.departure_date}
              onChange={(e) => setFields({ ...fields, departure_date: e.target.value })}
            />
            <Input
              label={usesDeadline ? 'Hạn dừng theo dõi trong ngày (UTC)' : 'Giờ khởi hành (UTC)'}
              hint={
                usesDeadline
                  ? 'Chỉ dùng làm hạn dừng theo dõi, không phải giờ bay được xác nhận.'
                  : 'Theo giờ UTC, không phải giờ địa phương tại sân bay.'
              }
              type="time"
              required
              value={clock}
              onChange={(e) => setClock(e.target.value)}
            />
            {fields.journey_type === 'ROUND_TRIP' && (
              <Input
                {...fieldProps('return_date')}
                label="Ngày về"
                type="date"
                required
                min={fields.departure_date}
                value={fields.return_date ?? ''}
                onChange={(e) => setFields({ ...fields, return_date: e.target.value })}
              />
            )}
          </div>
        </fieldset>
        {(passengerFields.length > 0 || cabinChoices.length > 1) && (
          <fieldset className={formStyles.group}>
            <legend>Hành khách và hạng ghế</legend>
            <div className={formStyles.passengers}>
              {passengerFields.map((key) => (
                <Input
                  key={key}
                  disabled={restricted}
                  {...fieldProps(key)}
                  label={passengerLabels[key]}
                  type="number"
                  min={key === 'adults' ? 1 : 0}
                  max={passengerMax[key]}
                  required
                  value={fields.passengers[key]}
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      passengers: { ...fields.passengers, [key]: Number(e.target.value) },
                    })
                  }
                />
              ))}
            </div>
            {cabinChoices.length > 1 && (
              <Select
                {...fieldProps('cabin_class')}
                label="Hạng ghế"
                disabled={restricted}
                value={fields.cabin_class ?? ''}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    cabin_class: (e.target.value as WatchFields['cabin_class']) || null,
                  })
                }
              >
                <option value="">Không chỉ định</option>
                {cabinChoices.map((cabin) => (
                  <option key={cabin} value={cabin}>
                    {cabinLabels[cabin]}
                  </option>
                ))}
              </Select>
            )}
          </fieldset>
        )}
        <fieldset className={formStyles.group}>
          <legend>Mức giá mong muốn</legend>
          <Input
            {...fieldProps('threshold_price')}
            label="Ngưỡng cảnh báo (VND)"
            hint="Chỉ nhập chữ số, ví dụ 1500000 cho 1.500.000đ."
            inputMode="numeric"
            required
            value={fields.threshold_price}
            onChange={(e) => setFields({ ...fields, threshold_price: e.target.value })}
            placeholder="1500000"
          />
        </fieldset>
      </fieldset>
      <div className={formStyles.footer}>
        {preview && <p>Bản xem trước · Không tạo theo dõi hoặc gửi dữ liệu.</p>}
        <Button type="submit" loading={busy} disabled={disabled || createBlocked}>
          {preview ? 'Kiểm tra bản nháp' : 'Lưu theo dõi'}
        </Button>
      </div>
    </form>
  );
}
