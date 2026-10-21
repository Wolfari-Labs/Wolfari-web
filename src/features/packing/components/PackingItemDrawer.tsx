import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Drawer } from '../../../shared/components/Drawer';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { PackingCombobox } from './PackingCombobox';
import { getPackingCategorySuggestions, getPackingItemSuggestions, validatePackingForm, type PackingFormErrors, type PackingFormValues, type PackingSuggestion, type PackingSuggestionCatalog } from '../packing';
import styles from './PackingItemDrawer.module.css';

export function PackingItemDrawer({
  open, mode, initial, catalog, members, onDismiss, onSubmit,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  initial: PackingFormValues;
  catalog: PackingSuggestionCatalog;
  members: readonly { id: string; label: string }[];
  onDismiss: () => void;
  onSubmit: (values: PackingFormValues) => void;
}) {
  const [values, setValues] = useState<PackingFormValues>(initial);
  const [errors, setErrors] = useState<PackingFormErrors>({});
  useEffect(() => { if (open) { setValues(initial); setErrors({}); } }, [open, initial]);
  const update = (key: keyof PackingFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const selectSuggestion = (key: 'name' | 'category') => (suggestion: PackingSuggestion) => {
    update(key, suggestion.label);
    if (key === 'name' && suggestion.kind === 'item' && suggestion.secondary) update('category', suggestion.secondary);
  };
  return <Drawer open={open} side="right" label={mode === 'add' ? 'Thêm vật dụng' : 'Chỉnh sửa vật dụng'} onDismiss={onDismiss} {...(styles.drawer ? { className: styles.drawer } : {})}>
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); const next = validatePackingForm(values); setErrors(next); if (!Object.keys(next).length) onSubmit(values); }}>
      <PackingCombobox label="Tên vật dụng" value={values.name} suggestions={getPackingItemSuggestions(catalog, values.name)} onChange={(value) => update('name', value)} onSelect={selectSuggestion('name')} {...(errors.name ? { error: errors.name } : {})} placeholder="Ví dụ: Áo mưa" />
      <div className={styles.two}><Input label="Số lượng" inputMode="decimal" value={values.quantity} onChange={(e) => update('quantity', e.target.value)} error={errors.quantity} /><Input label="Đơn vị" value={values.unit} onChange={(e) => update('unit', e.target.value)} placeholder="cái, bộ..." /></div>
      <PackingCombobox label="Danh mục" value={values.category} suggestions={getPackingCategorySuggestions(catalog, values.category)} onChange={(value) => update('category', value)} onSelect={selectSuggestion('category')} {...(errors.category ? { error: errors.category } : {})} placeholder="Ví dụ: Quần áo" />
      <Select label="Người chuẩn bị" value={values.assignedMemberId} onChange={(e) => update('assignedMemberId', e.target.value)}><option value="">Chưa phân công</option>{members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}</Select>
      <Input label="Hạn chuẩn bị" type="date" value={values.dueDate} onChange={(e) => update('dueDate', e.target.value)} error={errors.dueDate} />
      <Input label="Nhắc nhở" value={values.reminder} onChange={(e) => update('reminder', e.target.value)} placeholder="Ví dụ: mua trước ngày khởi hành" error={errors.reminder} />
      <Textarea label="Ghi chú" value={values.note} onChange={(e) => update('note', e.target.value)} error={errors.note} />
      <div className={styles.actions}><Button variant="outline" onClick={onDismiss}>Hủy</Button><Button type="submit">{mode === 'add' ? 'Thêm vào danh sách' : 'Lưu thay đổi'}</Button></div>
    </form>
  </Drawer>;
}
