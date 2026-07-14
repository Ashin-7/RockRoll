import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders primary navigation and content', () => {
    renderWithI18n(
      <AppShell>
        <h2>Today in the room</h2>
      </AppShell>,
    );

    expect(screen.getByText('RockRoll')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByText('Backstage')).toBeInTheDocument();
    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Inbox' })).toBeNull();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Toolbox' })).toHaveAttribute('href', '#toolbox');
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Auth' })).toBeNull();
    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Auth' })).toHaveAttribute('href', '#auth');
    expect(within(screen.getByTestId('account-menu')).getByRole('link', { name: 'Auth' })).toBeVisible();
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
    expect(screen.getByTestId('account-menu')).not.toHaveAttribute('aria-current');
  });

  it('renders the signed-in account name and sign-out action', () => {
    window.location.hash = '#auth';
    const onSignOut = vi.fn();

    renderWithI18n(
      <AppShell accountName="player@example.com" currentHash="#auth" isSignedIn onSignOut={onSignOut}>
        <h2>Auth page</h2>
      </AppShell>,
    );

    expect(screen.getByText('player@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).queryByRole('link', { name: 'Auth' })).toBeNull();
  });
});
