import { useId, useRef, useState, type FormEvent } from 'react';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Button } from '../../shared/components/Button';
import { localTimeToIso } from '../plan/model/plan-draft';
import { localDate } from '../plan/model/plan-presentation';
import { isValidDate } from './model/price-watch';
import type { RuntimeWatch, WatchFields } from './model/runtime-price-watch';
import styles from '../../shared/styles/DemoWorkspace.module.css';

export function PriceWatchForm({
  initial,
  disabled,
  busy,
  preview = false,
  onSave,
}: {
  initial: RuntimeWatch | null;
  timezone: string;
  disabled: boolean;
  busy: boolean;
  preview?: boolean;
  onSave: (fields: WatchFields) => void;
}) {
  const form = useRef<HTMLFormElement>(null),
    prefix = useId();
  const [fields, setFields] = useState<WatchFields>(
    initial?.fields ?? {
      provider: 'MOCK_FLIGHT',
      origin: '',
      destination: '',
      departure_date: '',
      departure_at: '',
      return_date: null,
      journey_type: 'ONE_WAY',
      passengers: { adults: 1, children: 0, infants: 0 },
      cabin_class: 'ECONOMY',
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
  const fieldProps = (name: string) => ({ id: `${prefix}-${name}`, name, error: errors[name] });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || busy) return;
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
    <form ref={form} onSubmit={submit} noValidate className={styles.form}>
      <p className={styles.metadata}>
        Ngày, giờ tra cứu theo UTC; không phải giờ địa phương tại sân bay. Nguồn MOCK_FLIGHT · Giá
        mô phỏng.
      </p>
      <fieldset disabled={disabled || busy} className={styles.form}>
        <legend>Thông tin chuyến bay</legend>
        <Input
          {...fieldProps('origin')}
          label="Sân bay đi (IATA)"
          required
          maxLength={3}
          value={fields.origin}
          onChange={(e) => setFields({ ...fields, origin: e.target.value.toUpperCase().trim() })}
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
        <Select
          label="Hành trình"
          value={fields.journey_type}
          onChange={(e) =>
            setFields({ ...fields, journey_type: e.target.value as WatchFields['journey_type'] })
          }
        >
          <option value="ONE_WAY">Một chiều</option>
          <option value="ROUND_TRIP">Khứ hồi</option>
        </Select>
        <Input
          {...fieldProps('departure_date')}
          label="Ngày khởi hành"
          type="date"
          required
          value={fields.departure_date}
          onChange={(e) => setFields({ ...fields, departure_date: e.target.value })}
        />
        <Input
          label="Giờ khởi hành (UTC)"
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
        {(['adults', 'children', 'infants'] as const).map((key) => (
          <Input
            key={key}
            {...fieldProps(key)}
            label={{ adults: 'Người lớn', children: 'Trẻ em', infants: 'Em bé' }[key]}
            type="number"
            min={key === 'adults' ? 1 : 0}
            max={9}
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
        <Select
          label="Hạng ghế"
          value={fields.cabin_class ?? ''}
          onChange={(e) =>
            setFields({
              ...fields,
              cabin_class: (e.target.value as WatchFields['cabin_class']) || null,
            })
          }
        >
          <option value="">Không chỉ định</option>
          <option value="ECONOMY">Phổ thông</option>
          <option value="PREMIUM_ECONOMY">Phổ thông đặc biệt</option>
          <option value="BUSINESS">Thương gia</option>
          <option value="FIRST">Hạng nhất</option>
        </Select>
        <Input
          {...fieldProps('threshold_price')}
          label="Ngưỡng cảnh báo (VND)"
          inputMode="numeric"
          required
          value={fields.threshold_price}
          onChange={(e) => setFields({ ...fields, threshold_price: e.target.value })}
          placeholder="1500000"
        />
      </fieldset>
      {preview && (
        <p className={styles.metadata}>Bản xem trước · Không tạo theo dõi hoặc gửi dữ liệu.</p>
      )}
      <Button type="submit" loading={busy} disabled={disabled}>
        {preview ? 'Kiểm tra bản nháp' : 'Lưu theo dõi'}
      </Button>
    </form>
  );
}
