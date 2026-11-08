import { CalendarDays } from 'lucide-react';
import { Field, useField, type FieldProps } from './Field';
import { validCalendarDate } from '../lib/calendar';
import fieldStyles from './Field.module.css';
import styles from './VietnameseDateInput.module.css';

/** Display calendar dates independently of the browser locale; keep ISO model values. */
export function VietnameseDateInput({
  id,
  label,
  pickerLabel,
  value,
  onValueChange,
  min,
  required,
  disabled,
  error,
}: FieldProps & {
  id: string;
  pickerLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string | undefined;
  required?: boolean;
  disabled?: boolean;
}) {
  const hint = 'Định dạng: dd/mm/yyyy';
  const field = useField({ id, hint, error });
  const display = value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
  return (
    <Field {...field} label={label} hint={hint} error={error}>
      <div className={`${fieldStyles.inputRow} ${error ? fieldStyles.invalid : ''}`}>
        <input
          id={id}
          className={fieldStyles.input}
          type="text"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          value={display}
          required={required}
          disabled={disabled}
          aria-describedby={field.describedBy}
          aria-invalid={Boolean(error)}
          onChange={(event) =>
            onValueChange(event.target.value.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1'))
          }
        />
        <span className={styles.picker}>
          <CalendarDays size={20} aria-hidden="true" />
          <input
            className={styles.nativePicker}
            type="date"
            aria-label={pickerLabel}
            value={validCalendarDate(value) ? value : ''}
            min={min && validCalendarDate(min) ? min : undefined}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </span>
      </div>
    </Field>
  );
}
