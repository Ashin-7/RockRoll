import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from './test/render';
import App from './App';
import { getCurrentSession } from './features/auth/auth.service';

const authMockState = vi.hoisted(() => ({
  listener: null as ((session: unknown) => void) | null,
}));

vi.mock('./features/auth/auth.service', () => ({
  getCurrentSession: vi.fn().mockResolvedValue(null),
  onAuthStateChange: vi.fn((listener: (session: unknown) => void) => {
    authMockState.listener = listener;
    return vi.fn();
  }),
  runSupabaseCrudSmokeTest: vi.fn().mockResolvedValue(undefined),
  signInAnonymously: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signInWithEmail: vi.fn().mockResolvedValue(undefined),
  signUpWithPassword: vi.fn().mockResolvedValue(undefined),
  resendSignupConfirmation: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  updatePassword: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./features/archive/ArchivePage', async () => {
  const React = await import('react');

  return {
    ArchivePage() {
      const [draft, setDraft] = React.useState('');

      return (
        <label>
          Archive draft
          <input value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
      );
    },
  };
});

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

    const heading = screen.getByRole('heading', { name: 'Import inbox paused' });
    const hero = heading.closest('.inbox-hero');

    expect(heading).toBeInTheDocument();
    expect(heading.closest('.ui-section-heading')).not.toBeNull();
    expect(hero).toHaveClass('ui-panel', 'ui-panel--hero');
    expect(
      screen.getByText('The inbox import entry is temporarily disabled. Use Archive -> Add collection for URL imports.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Archive' })).toHaveAttribute('href', '#archive');
    expect(screen.queryByRole('button', { name: 'Preview Anontraveler' })).not.toBeInTheDocument();
  });

  it('opens the local PDF toolbox from the primary navigation', async () => {
    window.location.hash = '#library';
    const user = userEvent.setup();

    renderWithI18n(<App />);

    await user.click(screen.getByRole('link', { name: 'Toolbox' }));

    expect(screen.getByRole('heading', { name: 'PDF Tab Workbench' })).toBeInTheDocument();
    expect(screen.getByText('Your score stays in this browser. Nothing is uploaded.')).toBeInTheDocument();
  });

  it('clears the current page state when the authenticated user signs out', async () => {
    window.location.hash = '#archive';
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.mocked(getCurrentSession).mockResolvedValueOnce({
      user: { id: 'admin-user', email: 'admin@example.com' },
    });
    const user = userEvent.setup();

    renderWithI18n(<App />);

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument();
    const draftInput = screen.getByRole('textbox', { name: 'Archive draft' });
    await user.type(draftInput, 'admin-only draft');

    await act(async () => {
      authMockState.listener?.(null);
    });

    expect(screen.getByRole('textbox', { name: 'Archive draft' })).toHaveValue('');
  });
});
