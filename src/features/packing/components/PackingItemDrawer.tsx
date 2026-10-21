import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Drawer } from '../../../shared/components/Drawer';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import type { PackingFormErrors, PackingFormValues } from '../packing';
import styles from './PackingItemDrawer.module.css';

export function PackingItemDrawer({
  open, mode, initial, categories, members, onDismiss, onSubmit,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  initial: PackingFormValues;
  categories: readonly string[];
  members: readonly { id: string; label: string }[];
  onDismiss: () => void;
  onSubmit: (values: PackingFormValues) => void;
}) {
  const [values, setValues] = useState<PackingFormValues>(initial);
  const [errors, setErrors] = useState<PackingFormErrors>({});
  useEffect(() => { if (open) { setValues(initial); setErrors({}); } }, [open, initial]);
  const update = (key: keyof PackingFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return <Drawer open={open} side="right" label={mode === 'add' ? 'Thêm vật dụng' : 'Chỉnh sửa vật dụng'} onDismiss={onDismiss} {...(styles.drawer ? { className: styles.drawer } : {})}>
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); const next: PackingFormErrors = {}; if (!values.name.trim()) next.name = 'Vui lòng nhập tên vật dụng.'; if (!/^\d+(?:\.\d{1,2})?$/.test(values.quantity.trim()) || Number(values.quantity) <= 0) next.quantity = 'Số lượng phải là số dương.'; if (values.name.trim().length > 200) next.name = 'Tên vật dụng tối đa 200 ký tự.'; if (values.note.length > 500) next.note = 'Ghi chú tối đa 500 ký tự.'; if (values.dueDate && Number.isNaN(new Date(`${values.dueDate}T00:00:00`).getTime())) next.dueDate = 'Ngày hạn không hợp lệ.'; setErrors(next); if (!Object.keys(next).length) onSubmit(values); }}>
      <Input label="Tên vật dụng" value={values.name} onChange={(e) => update('name', e.target.value)} error={errors.name} autoComplete="off" required />
      <div className={styles.two}><Input label="Số lượng" inputMode="decimal" value={values.quantity} onChange={(e) => update('quantity', e.target.value)} error={errors.quantity} /><Input label="Đơn vị" value={values.unit} onChange={(e) => update('unit', e.target.value)} placeholder="cái, bộ..." /></div>
      <Select label="Danh mục" value={values.category} onChange={(e) => update('category', e.target.value)}><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</Select>
      <Select label="Người chuẩn bị" value={values.assignedMemberId} onChange={(e) => update('assignedMemberId', e.target.value)}><option value="">Chưa phân công</option>{members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}</Select>
      <Input label="Hạn chuẩn bị" type="date" value={values.dueDate} onChange={(e) => update('dueDate', e.target.value)} error={errors.dueDate} />
      <Input label="Nhắc nhở" value={values.reminder} onChange={(e) => update('reminder', e.target.value)} placeholder="Ví dụ: mua trước ngày khởi hành" />
      <Textarea label="Ghi chú" value={values.note} onChange={(e) => update('note', e.target.value)} error={errors.note} />
      <div className={styles.actions}><Button variant="outline" onClick={onDismiss}>Hủy</Button><Button type="submit">{mode === 'add' ? 'Thêm vật dụng' : 'Lưu thay đổi'}</Button></div>
    </form>
  </Drawer>;
}
