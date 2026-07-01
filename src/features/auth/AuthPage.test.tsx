import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AuthPage } from './AuthPage';

const signedInSession = { user: { email: 'player@example.com' } };

describe('AuthPage', () => {
  it('submits email magic link request', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={() => vi.fn()}
        onSignIn={signIn}
      />,
    );

    await user.type(await screen.findByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send magic link' }));

    expect(signIn).toHaveBeenCalledWith('player@example.com');
    expect(await screen.findByText('Check your email for the login link.')).toBeInTheDocument();
  });

  it('prefills the configured test login email', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={() => vi.fn()}
        testLoginEmail="tester@example.com"
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Use test email' }));

    expect(screen.getByLabelText('Email')).toHaveValue('tester@example.com');
  });

  it('signs in anonymously for quick testing', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    let authCallback: (session: typeof signedInSession | null) => void = () => undefined;

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={(callback) => {
          authCallback = callback;
          return vi.fn();
        }}
        onSignInAnonymously={signInAnonymously}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Anonymous test login' }));

    expect(signInAnonymously).toHaveBeenCalledWith();

    act(() => {
      authCallback(signedInSession);
    });

    await waitFor(() => expect(screen.getByText(/player@example.com/)).toBeInTheDocument());
  });

  it('shows the signed-in email when a session exists', async () => {
    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
      />,
    );

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText(/player@example.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('signs out and returns to the email form', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
        onSignOut={signOut}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledWith();
    expect(await screen.findByText('Signed out.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('updates when auth state changes', async () => {
    let authCallback: (session: typeof signedInSession | null) => void = () => undefined;

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={(callback) => {
          authCallback = callback;
          return vi.fn();
        }}
      />,
    );

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();

    act(() => {
      authCallback(signedInSession);
    });

    await waitFor(() => expect(screen.getByText(/player@example.com/)).toBeInTheDocument());
  });

  it('shows an error instead of crashing when auth subscription fails', async () => {
    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={() => {
          throw new Error('Missing Supabase env');
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Missing Supabase env');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders Chinese signed-in copy', async () => {
    window.localStorage.setItem('rcokroll.locale', 'zh-CN');

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
      />,
    );

    expect(await screen.findByText('已登录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument();
  });
});
