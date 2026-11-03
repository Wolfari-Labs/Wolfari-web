import { AlertDialog, DropdownMenu, Tooltip, Tabs, Accordion } from 'radix-ui';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './Ui.module.css';
export function Card({ children, className = '', ...props }: ComponentProps<'section'>) {
  return (
    <section {...props} className={`${styles.card} ${className}`}>
      {children}
    </section>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}
export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={350}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={styles.tip} sideOffset={8}>
            {label}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
export function ActionMenu({
  label = 'Thao tác',
  items,
}: {
  label?: string;
  items: { label: string; action: () => void; disabled?: boolean; danger?: boolean }[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <Icon name="more" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} sideOffset={6} align="end">
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              className={styles.menuItem}
              disabled={item.disabled}
              onSelect={item.action}
              data-danger={item.danger || undefined}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  busy = false,
  disabled = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content
          className={styles.dialog}
          onOpenAutoFocus={() => {
            const active = document.activeElement as HTMLElement | null;
            const menu = active?.closest('[role="menu"]');
            returnFocus.current = menu?.id
              ? (document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menu.id)}"]`) ??
                active)
              : active;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <div className={styles.actions}>
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                Hủy
              </Button>
            </AlertDialog.Cancel>
            <Button variant="destructive" loading={busy} disabled={disabled} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
export function SegmentedTabs({
  value,
  onChange,
  label,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  items: { value: string; label: string; content: ReactNode }[];
}) {
  return (
    <Tabs.Root value={value} onValueChange={onChange}>
      <Tabs.List className={styles.tabs} aria-label={label}>
        {items.map((item) => (
          <Tabs.Trigger key={item.value} value={item.value}>
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Content key={item.value} value={item.value}>
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Accordion.Root type="single" collapsible>
      <Accordion.Item value="details">
        <Accordion.Header className={styles.disclosure}>
          <Accordion.Trigger>
            {title}
            <Icon name="chevron" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={styles.disclosureBody}>{children}</Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
