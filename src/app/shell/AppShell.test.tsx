import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders primary navigation and content', () => {
    renderWithI18n(
      <AppShell>
        <h2>Today in the room</h2>
      </AppShell>,
    );

    expect(screen.getByText('RcokRoll')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByText('Backstage')).toBeInTheDocument();
    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Auth' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Auth' })).toHaveAttribute('href', '#auth');
    expect(screen.getByText('Today in the room')).toBeInTheDocument();
  });

  it('marks the current hash route as active', () => {
    window.location.hash = '#practice';

    renderWithI18n(
      <AppShell>
        <h2>Practice history</h2>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Songs' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Auth' })).not.toHaveAttribute('aria-current');
  });

  it('marks the auth account link as active outside primary navigation', () => {
    window.location.hash = '#auth';

    renderWithI18n(
      <AppShell currentHash="#auth">
        <h2>Auth page</h2>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: 'Auth' })).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Auth' })).toBeNull();
  });
});
