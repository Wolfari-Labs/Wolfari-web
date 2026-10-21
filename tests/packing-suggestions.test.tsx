import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackingItemDrawer } from '../src/features/packing/components/PackingItemDrawer';
import { createPackingSuggestionCatalog, emptyPackingForm } from '../src/features/packing/packing';

describe('Packing drawer suggestions', () => {
  it('opens item suggestions, selects a default and fills its category', async () => {
    const user = userEvent.setup();
    render(<PackingItemDrawer open mode="add" initial={emptyPackingForm} catalog={createPackingSuggestionCatalog()} members={[]} onDismiss={vi.fn()} onSubmit={vi.fn()} />);
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
    render(<PackingItemDrawer open mode="add" initial={emptyPackingForm} catalog={createPackingSuggestionCatalog()} members={[]} onDismiss={vi.fn()} onSubmit={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Thêm vật dụng' });
    const category = within(dialog).getByRole('combobox', { name: 'Danh mục' });
    await user.type(category, 'Đồ đi biển');
    expect(within(dialog).getByRole('option', { name: '+ Tạo danh mục “Đồ đi biển”' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('option', { name: '+ Tạo danh mục “Đồ đi biển”' }));
    expect(category).toHaveValue('Đồ đi biển');
  });
});
