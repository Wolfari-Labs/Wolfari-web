import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BankPicker } from '../src/features/fund/components/BankPicker';
afterEach(cleanup);
const banks = [
  { code: 'VCB', bin: '970436', short_name: 'Vietcombank', name: 'Ngoại thương' },
  { code: 'MB', bin: '970422', short_name: 'MB', name: 'Quân đội' },
];
it('searches name/code/BIN without losing the saved bank', () => {
  render(
    <BankPicker
      banks={banks}
      loading={false}
      failed={false}
      retry={vi.fn()}
      value="VCB"
      onChange={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Tìm ngân hàng'), { target: { value: '970422' } });
  expect(screen.getAllByRole('option')).toHaveLength(3);
  fireEvent.change(screen.getByLabelText('Tìm ngân hàng'), { target: { value: 'unknown' } });
  expect(screen.getAllByRole('option')).toHaveLength(2);
  fireEvent.click(screen.getByText('Nhập mã thủ công'));
  expect((screen.getByLabelText('Mã ngân hàng VietQR') as HTMLInputElement).value).toBe('VCB');
});
it('offers retry and preserves manual input after a failed directory request', () => {
  const retry = vi.fn(),
    change = vi.fn();
  render(
    <BankPicker
      banks={null}
      loading={false}
      failed
      retry={retry}
      value="970436"
      onChange={change}
    />,
  );
  fireEvent.click(screen.getByText('Tải lại ngân hàng'));
  expect(retry).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText('Mã ngân hàng VietQR'), { target: { value: 'MB' } });
  expect(change).toHaveBeenCalledWith('MB');
});
