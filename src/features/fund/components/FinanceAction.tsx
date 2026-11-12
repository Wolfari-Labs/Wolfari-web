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
  maxLength?: number;
  type?: 'text' | 'datetime-local';
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
                  const value = draft.values[field.key]?.trim() ?? '';
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
            <p>TEST · Không chuyển tiền thật. {description}</p>
            <OperationStatus session={session} />
            {error && (
              <Alert tone="error" live>
                {error}
              </Alert>
            )}
            {fields.map((field) =>
              field.options ? (
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
              <Button type="submit" disabled={disabled || blocked || submitted}>
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
