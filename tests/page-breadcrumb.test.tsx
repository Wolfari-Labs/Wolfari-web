import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { PageBreadcrumb } from '../src/shared/components/PageBreadcrumb';

function mockViewport(desktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: desktop,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

function mount(props: Partial<Parameters<typeof PageBreadcrumb>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PageBreadcrumb
        items={[{ label: 'Tổng quan chuyến đi', to: '/trips/t1' }]}
        current="Lịch trình"
        {...props}
      />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('PageBreadcrumb', () => {
  it('renders parent links and the current page as the only visible h1', () => {
    mount();
    const nav = screen.getByRole('navigation', { name: 'Đường dẫn' });
    expect(screen.getByRole('link', { name: 'Tổng quan chuyến đi' })).toHaveAttribute(
      'href',
      '/trips/t1',
    );
    const heading = screen.getByRole('heading', { level: 1, name: 'Lịch trình' });
    expect(heading).toHaveAttribute('aria-current', 'page');
    expect(nav).toContainElement(heading);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('keeps the parent link reachable by keyboard', async () => {
    mount();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Tổng quan chuyến đi' })).toHaveFocus();
  });

  it('shows the optional trailing item', () => {
    mount({ trailing: <span>MOCK_FLIGHT</span> });
    expect(screen.getByText('MOCK_FLIGHT')).toBeInTheDocument();
  });

  it('keeps the previous mobile header below the desktop breakpoint, with a single h1', () => {
    mockViewport(false);
    mount({ mobile: <h1>Tiêu đề cũ</h1> });
    expect(screen.queryByRole('navigation', { name: 'Đường dẫn' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Tiêu đề cũ' })).toBeInTheDocument();
  });

  it('uses the shared header on desktop even when a mobile header is supplied', () => {
    mockViewport(true);
    mount({ mobile: <h1>Tiêu đề cũ</h1> });
    expect(screen.getByRole('heading', { level: 1, name: 'Lịch trình' })).toBeInTheDocument();
    expect(screen.queryByText('Tiêu đề cũ')).not.toBeInTheDocument();
  });
});
