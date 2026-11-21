import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackingItemDrawer } from '../src/features/packing/components/PackingItemDrawer';
import {
  createPackingSuggestionCatalog,
  emptyPackingForm,
  packingItemsFromForm,
  packingFormFromItem,
  validatePackingForm,
} from '../src/features/packing/packing';

describe('Packing drawer suggestions', () => {
  it('Gateway hides unsupported reminders and confirms dirty dismiss without losing draft', async () => {
    const user = userEvent.setup(),
      close = vi.fn();
    render(
      <PackingItemDrawer
        open
        mode="add"
        initial={emptyPackingForm}
        catalog={createPackingSuggestionCatalog()}
        members={[]}
        onDismiss={close}
        onSubmit={vi.fn()}
        showReminder={false}
      />,
    );
    expect(screen.queryByLabelText('Nhắc nhở')).not.toBeInTheDocument();
    await user.type(screen.getByRole('combobox', { name: 'Tên vật dụng' }), 'Bản nháp');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    const confirm = screen.getByRole('alertdialog');
    expect(close).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('combobox', { name: 'Tên vật dụng' })).toHaveValue('Bản nháp');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    await user.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(close).toHaveBeenCalledOnce();
  });
  it('matches Unicode validation and preserves completion when editing Preview fields', () => {
    expect(
      validatePackingForm({ ...emptyPackingForm, name: '🎒'.repeat(200), note: 'a'.repeat(5000) }),
    ).toEqual({});
    expect(
      validatePackingForm({ ...emptyPackingForm, name: 'A', note: 'a'.repeat(5001) }).note,
    ).toBeTruthy();
    expect(validatePackingForm({ ...emptyPackingForm, name: 'A', unit: '\0' }).unit).toBeTruthy();
    const base = packingItemsFromForm(
      { ...emptyPackingForm, name: 'A' },
      null,
      'trip',
      1,
      'Asia/Ho_Chi_Minh',
    );
    const before = {
      ...base,
      status: 'COMPLETED' as const,
      completedByUserId: 'actor',
      completedAt: '2026-11-21T03:00:00Z',
    };
    const edited = packingItemsFromForm(
      {
        ...packingFormFromItem(before, 'Asia/Ho_Chi_Minh'),
        name: 'B',
        quantity: '2',
        assignedMemberId: 'member',
      },
      before,
      'trip',
      2,
      'Asia/Ho_Chi_Minh',
    );
    expect(edited).toMatchObject({
      status: 'COMPLETED',
      completedByUserId: 'actor',
      completedAt: before.completedAt,
    });
  });
  it('opens item suggestions, selects a default and fills its category', async () => {
    const user = userEvent.setup();
    render(
      <PackingItemDrawer
        open
        mode="add"
        initial={emptyPackingForm}
        catalog={createPackingSuggestionCatalog()}
        members={[]}
        onDismiss={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Thêm vật dụng' });
    const name = within(dialog).getByRole('combobox', { name: 'Tên vật dụng' });
    await user.click(name);
    expect(within(dialog).getByRole('listbox')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('option', { name: /Áo mưa/ }));
    expect(name).toHaveValue('Áo mưa');
    expect(within(dialog).getByRole('combobox', { name: 'Danh mục' })).toHaveValue('Quần áo');
  });

  it('keeps a custom value and exposes the category create action', async () => {
    const user = userEvent.setup();
    render(
      <PackingItemDrawer
        open
        mode="add"
        initial={emptyPackingForm}
        catalog={createPackingSuggestionCatalog()}
        members={[]}
        onDismiss={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Thêm vật dụng' });
    const category = within(dialog).getByRole('combobox', { name: 'Danh mục' });
    await user.type(category, 'Đồ đi biển');
    expect(
      within(dialog).getByRole('option', { name: '+ Tạo danh mục “Đồ đi biển”' }),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('option', { name: '+ Tạo danh mục “Đồ đi biển”' }));
    expect(category).toHaveValue('Đồ đi biển');
  });
});
