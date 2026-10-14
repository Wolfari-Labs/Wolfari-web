import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../src/shared/components/Button';
import { Input } from '../src/shared/components/Input';
import { Select } from '../src/shared/components/Select';
import { Alert } from '../src/shared/components/Alert';
import { NavigationButton } from '../src/shared/components/NavigationButton';
import { ContentState } from '../src/shared/components/ContentState';

describe('shared UI semantics and interactions', () => {
  it('uses a non-submitting button by default; Enter and Space invoke only the supplied callback', async () => {
    const clicked = vi.fn(),
      submitted = vi.fn();
    render(
      <form onSubmit={submitted}>
        <Button onClick={clicked}>Action</Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveAttribute('type', 'button');
    button.focus();
    await userEvent.keyboard('{Enter} ');
    expect(clicked).toHaveBeenCalledTimes(2);
    expect(submitted).not.toHaveBeenCalled();
  });
  it('retains its accessible label and suppresses duplicate activation while loading', async () => {
    const clicked = vi.fn();
    const { rerender } = render(
      <Button loading onClick={clicked}>
        Action
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(clicked).not.toHaveBeenCalled();
    rerender(<Button onClick={clicked}>Action</Button>);
    await userEvent.click(button);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute('aria-busy');
  });
  it('links a unique field label, existing descriptions, hint and validation error while preserving input', async () => {
    const ref = createRef<HTMLInputElement>();
    const { rerender } = render(
      <>
        <p id="external">External hint</p>
        <Input ref={ref} label="Name" hint="Local hint" aria-describedby="external" />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(ref.current).toBe(input);
    await userEvent.type(input, 'Draft');
    rerender(
      <>
        <p id="external">External hint</p>
        <Input
          ref={ref}
          label="Name"
          hint="Local hint"
          error="Check the name"
          aria-describedby="external"
        />
        <Input label="Other" />
      </>,
    );
    expect(input).toHaveValue('Draft');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('External hint Local hint Check the name');
    expect(input.id).not.toBe(screen.getByRole('textbox', { name: 'Other' }).id);
    expect(screen.getByRole('alert')).toHaveTextContent('Check the name');
  });
  it('preserves native Select value, label, validation and disabled behavior', async () => {
    const changed = vi.fn();
    const { rerender } = render(
      <Select label="Choice" defaultValue="one" hint="Choose" onChange={changed}>
        <option value="one">One</option>
        <option value="two">Two</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Choice' });
    await userEvent.selectOptions(select, 'two');
    expect(select).toHaveValue('two');
    expect(changed).toHaveBeenCalledTimes(1);
    rerender(
      <Select label="Choice" disabled error="Unavailable" defaultValue="one" onChange={changed}>
        <option value="one">One</option>
        <option value="two">Two</option>
      </Select>,
    );
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Unavailable');
    await userEvent.selectOptions(select, 'one');
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it('announces dynamic errors but leaves static showcase notices outside live regions', () => {
    const { rerender } = render(<Alert tone="error">Request failed</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed');
    rerender(
      <Alert tone="success" live={false}>
        Example only
      </Alert>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Example only')).toBeInTheDocument();
  });
  it('keeps navigation selection explicit and forbids disabled activation', async () => {
    const clicked = vi.fn();
    render(
      <NavigationButton selected disabled onClick={clicked}>
        Private
      </NavigationButton>,
    );
    const button = screen.getByRole('button', { name: 'Private' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(clicked).not.toHaveBeenCalled();
  });
  it('renders a real error message without error details and exposes only valid read retries', () => {
    const retry = vi.fn();
    const { rerender } = render(<ContentState state="error" onRetry={retry} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Chưa thể tải nội dung');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(
      <ContentState
        state="error"
        error={{ code: 'VERSION_CONFLICT', correlationId: 'request-id', retryable: false }}
        onRetry={retry}
      />,
    );
    expect(screen.getByText('Mã đối chiếu: request-id')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(
      <ContentState
        state="error"
        error={{ code: 'PERMISSION_DENIED', correlationId: null, retryable: false }}
        onRetry={retry}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('keeps decorative loading blocks hidden from accessibility while exposing busy state', () => {
    render(<ContentState state="loading" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading')).toHaveTextContent('Đang tải');
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
