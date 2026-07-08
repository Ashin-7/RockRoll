import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from './test/render';
import App from './App';

vi.mock('./features/auth/auth.service', () => ({
  getCurrentSession: vi.fn().mockResolvedValue(null),
  onAuthStateChange: vi.fn(() => vi.fn()),
  runSupabaseCrudSmokeTest: vi.fn().mockResolvedValue(undefined),
  signInAnonymously: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signInWithEmail: vi.fn().mockResolvedValue(undefined),
  signUpWithPassword: vi.fn().mockResolvedValue(undefined),
  resendSignupConfirmation: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe('App', () => {
  it('scrolls to the top after hash navigation', async () => {
    window.location.hash = '#library';
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderWithI18n(<App />);

    await user.click(screen.getByRole('link', { name: 'Auth' }));

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it('updates the rendered page when hash navigation changes', async () => {
    window.location.hash = '#library';
    const user = userEvent.setup();

    renderWithI18n(<App />);

    expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Practice' }));

    expect(screen.getByRole('heading', { name: 'Practice History' })).toBeInTheDocument();
  });

  it('opens the auth page from the account menu', async () => {
    window.location.hash = '#backstage';
    const user = userEvent.setup();

    renderWithI18n(<App />);

    expect(screen.getByText('Guest')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Auth' }));

    expect(screen.getByText('RockRoll')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in to your archive.' })).toBeInTheDocument();
  });

  it('keeps the inbox hash route as a disabled entry notice', () => {
    window.location.hash = '#inbox';

    renderWithI18n(<App />);

    expect(screen.getByRole('heading', { name: 'Import inbox paused' })).toBeInTheDocument();
    expect(
      screen.getByText('The inbox import entry is temporarily disabled. Use Archive -> Add collection for URL imports.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Archive' })).toHaveAttribute('href', '#archive');
    expect(screen.queryByRole('button', { name: 'Preview Anontraveler' })).not.toBeInTheDocument();
  });
});
