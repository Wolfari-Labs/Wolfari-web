import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { CommandDefinition, CommandSession } from '../../../shared/types/operations';
import { unresolved } from '../../../shared/types/operations';
import { Button } from '../../../shared/components/Button';
import { Drawer } from '../../../shared/components/Drawer';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Alert } from '../../../shared/components/Alert';
import { ConfirmDialog } from '../../../shared/components/Ui';
import { OperationStatus } from '../../../shared/components/OperationStatus';
import styles from './FinanceRecords.module.css';

export interface FinanceField {
  options?: readonly { value: string; label: string }[];
  key: string;
  label: string;
  initial?: string;
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  type?: 'text' | 'datetime-local' | 'file';
  /** Leave the key out of the body when empty (e.g. keep an existing attachment on edit). */
  omitWhenEmpty?: boolean;
  /** For type "file": uploads the chosen file and returns the value sent in the body. */
  upload?: (file: File) => Promise<string>;
  accept?: string;
  hint?: string;
}
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
function FileField({
  field,
  disabled,
  onValue,
  onBusy,
}: {
  field: FinanceField;
  disabled: boolean;
  onValue: (value: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [state, setState] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const id = 'finance-file-' + field.key;
  return (
    <div>
      <label htmlFor={id}>{field.label}</label>
      <input
        id={id}
        type="file"
        accept={field.accept}
        disabled={disabled}
        aria-describedby={id + '-hint'}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          onValue('');
          if (!file) return setState(null);
          if (file.size > MAX_UPLOAD_BYTES)
            return setState({ tone: 'error', text: 'Tệp vượt quá 10 MB.' });
          if (!field.upload) return;
          onBusy(true);
          setState({ tone: 'info', text: 'Đang tải tệp lên…' });
          try {
            onValue(await field.upload(file));
            setState({ tone: 'info', text: `Đã đính kèm ${file.name}.` });
          } catch {
            setState({
              tone: 'error',
              text: 'Không tải được tệp. Chỉ nhận JPEG, PNG hoặc PDF tối đa 10 MB; thử lại.',
            });
          } finally {
            onBusy(false);
          }
        }}
      />
      <p id={id + '-hint'}>{field.hint ?? 'JPEG, PNG hoặc PDF, tối đa 10 MB.'}</p>
      {state && <p role={state.tone === 'error' ? 'alert' : 'status'}>{state.text}</p>}
    </div>
  );
}
export function FinanceAction({
  label,
  session,
  definition,
  fields = [],
  disabled = false,
  description,
  children,
}: {
  label: string;
  session: CommandSession;
  definition: CommandDefinition;
  fields?: FinanceField[];
  disabled?: boolean;
  description?: string;
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState<{
    definition: CommandDefinition;
    values: Record<string, string>;
  } | null>(null);
  const [discard, setDiscard] = useState(false),
    [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);
  const op = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const blocked = op.busy || unresolved(op);
  const close = () => {
    if (!op.busy) setDiscard(true);
  };
  return (
    <>
      <Button
        variant="outline"
        disabled={disabled || blocked}
        onClick={() => {
          setError('');
          setSubmitted(false);
          setDraft({
            definition: structuredClone(definition),
            values: Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ''])),
          });
        }}
      >
        {label}
      </Button>
      <Drawer open={draft !== null} label={label} onDismiss={close} side="center">
        {draft && (
          <form
            className={styles.form}
            aria-label={label}
            onSubmit={async (e) => {
              e.preventDefault();
              if (blocked || disabled || submitted) return;
              setError('');
              try {
                const body = { ...draft.definition.body };
                for (const field of fields) {
                  const value = field.readOnly
                    ? (draft.values[field.key] ?? '')
                    : (draft.values[field.key]?.trim() ?? '');
                  if (field.omitWhenEmpty && !value) continue;
                  body[field.key] =
                    field.type === 'datetime-local' && value
                      ? new Date(value).toISOString()
                      : value || null;
                }
                setSubmitted(true);
                await session.submit({ ...draft.definition, body });
                if (session.getSnapshot().state === 'SUCCEEDED') setDraft(null);
              } catch (cause) {
                setSubmitted(false);
                setError(cause instanceof Error ? cause.message : 'Không thể gửi yêu cầu.');
              }
            }}
          >
            <p>Ứng dụng chỉ ghi nhận, không tự chuyển tiền. {description}</p>
            <OperationStatus session={session} />
            {error && (
              <Alert tone="error" live>
                {error}
              </Alert>
            )}
            {fields.map((field) =>
              field.type === 'file' ? (
                <FileField
                  key={field.key}
                  field={field}
                  disabled={blocked || submitted || uploading}
                  onBusy={setUploading}
                  onValue={(value) =>
                    setDraft((current) =>
                      current
                        ? { ...current, values: { ...current.values, [field.key]: value } }
                        : current,
                    )
                  }
                />
              ) : field.options ? (
                <Select
                  key={field.key}
                  label={field.label}
                  required={field.required ?? false}
                  value={draft.values[field.key] ?? ''}
                  disabled={blocked || submitted}
                  onChange={(e) =>
                    setDraft({ ...draft, values: { ...draft.values, [field.key]: e.target.value } })
                  }
                >
                  <option value="">Chưa chọn</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type ?? 'text'}
                  required={field.required ?? false}
                  maxLength={field.maxLength}
                  readOnly={field.readOnly ?? false}
                  value={draft.values[field.key] ?? ''}
                  disabled={blocked}
                  onChange={(e) =>
                    setDraft({ ...draft, values: { ...draft.values, [field.key]: e.target.value } })
                  }
                />
              ),
            )}
            {children}
            <div className={styles.actions}>
              <Button type="submit" disabled={disabled || blocked || submitted || uploading}>
                Xác nhận · {label}
              </Button>
              <Button variant="plain" disabled={op.busy} onClick={close}>
                Đóng biểu mẫu
              </Button>
            </div>
            {op.state === 'FAILED' && (
              <p>
                Dữ liệu hoặc quyền có thể đã thay đổi. Đóng biểu mẫu, tải lại rồi mở lại để dùng
                phiên bản mới.
              </p>
            )}
          </form>
        )}
      </Drawer>
      <ConfirmDialog
        open={discard}
        title="Đóng biểu mẫu?"
        description="Bỏ bản nháp đang nhập. Yêu cầu đã gửi vẫn được giữ để đối soát, không bị hủy."
        cancelLabel="Tiếp tục nhập"
        confirmLabel="Đóng biểu mẫu"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          setDiscard(false);
          setDraft(null);
        }}
      />
    </>
  );
}
