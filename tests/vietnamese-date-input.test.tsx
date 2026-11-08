import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { VietnameseDateInput } from '../src/shared/components/VietnameseDateInput';
import { validCalendarDate } from '../src/shared/lib/calendar';

function Example({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <VietnameseDateInput
        id="date"
        label="Ngày đi"
        pickerLabel="Lịch khởi hành"
        value={value}
        onValueChange={setValue}
        min="2026-01-01"
      />
      <output data-testid="value">{value}</output>
      <output data-testid="valid">{String(validCalendarDate(value))}</output>
    </>
  );
}

it('renders ISO draft dates in Vietnamese order and lets users edit and clear them', async () => {
  render(<Example initial="2026-12-05" />);
  const field = screen.getByLabelText('Ngày đi');
  expect(field).toHaveValue('05/12/2026');
  await userEvent.clear(field);
  await userEvent.type(field, '13/11/2026');
  expect(field).toHaveValue('13/11/2026');
  expect(screen.getByTestId('value')).toHaveTextContent('2026-11-13');
  await userEvent.clear(field);
  expect(screen.getByTestId('value')).toBeEmptyDOMElement();
});

it('preserves invalid and partial input for validation rather than rolling dates over', async () => {
  render(<Example />);
  const field = screen.getByLabelText('Ngày đi');
  await userEvent.type(field, '31/02/2026');
  expect(field).toHaveValue('31/02/2026');
  expect(screen.getByTestId('valid')).toHaveTextContent('false');
  await userEvent.clear(field);
  await userEvent.type(field, '29/02/2028');
  expect(screen.getByTestId('valid')).toHaveTextContent('true');
  await userEvent.clear(field);
  await userEvent.type(field, '29/02/');
  expect(field).toHaveValue('29/02/');
  expect(screen.getByTestId('valid')).toHaveTextContent('false');
});

it('keeps the native calendar and its ISO minimum while displaying its selection as dd/mm/yyyy', () => {
  render(<Example />);
  const picker = screen.getByLabelText('Lịch khởi hành');
  expect(picker).toHaveAttribute('min', '2026-01-01');
  fireEvent.change(picker, { target: { value: '2026-12-31' } });
  expect(screen.getByLabelText('Ngày đi')).toHaveValue('31/12/2026');
  expect(screen.getByTestId('value')).toHaveTextContent('2026-12-31');
});
