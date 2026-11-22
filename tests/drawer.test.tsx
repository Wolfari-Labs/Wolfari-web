import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from '../src/shared/components/Drawer';

describe('Drawer keyboard access', () => {
  it('makes read-only content a named keyboard-focusable region', async () => {
    render(
      <Drawer open label="History" onDismiss={vi.fn()}>
        <p>Read-only observations</p>
      </Drawer>,
    );
    const content = screen.getByRole('region', { name: 'History' });
    expect(content).toHaveAttribute('tabindex', '0');
    expect(content).toHaveTextContent('Read-only observations');
    expect(screen.getByRole('button', { name: 'Đóng history' })).toHaveFocus();
    await userEvent.tab();
    expect(content).toHaveFocus();
  });

  it('preserves explicit initial focus for drawers without a visible header', () => {
    const initialFocusRef = createRef<HTMLButtonElement>();
    render(
      <Drawer
        open
        label="Confirmation"
        showHeader={false}
        initialFocusRef={initialFocusRef}
        onDismiss={vi.fn()}
      >
        <button ref={initialFocusRef}>Continue</button>
      </Drawer>,
    );
    expect(screen.getByRole('region', { name: 'Confirmation' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });
});
