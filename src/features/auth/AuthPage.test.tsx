import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AuthPage } from './AuthPage';

const signedInSession = { user: { email: 'player@example.com' } };
const demoSession = { isDemo: true, user: { email: 'demo@rockroll.local', id: 'local-demo-user' } };

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
    await user.click(screen.getByRole('button', { name: 'Send a magic link instead' }));
    await user.click(screen.getByRole('button', { name: 'Send magic link' }));

    expect(signIn).toHaveBeenCalledWith('player@example.com');
    expect(await screen.findByText('Check your email for the login link.')).toBeInTheDocument();
  });

  it('shows pending feedback while sending an email magic link', async () => {
    let resolveSignIn: () => void = () => undefined;
    const signIn = vi.fn(() => new Promise<void>((resolve) => {
      resolveSignIn = resolve;
    }));
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={() => vi.fn()}
        onSignIn={signIn}
      />,
    );

    await user.type(await screen.findByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send a magic link instead' }));
    await user.click(screen.getByRole('button', { name: 'Send magic link' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Sending magic link...');
    expect(screen.getByRole('button', { name: 'Sending magic link...' })).toBeDisabled();

    resolveSignIn();
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

  it('signs in with email and password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue(undefined);
    const getCurrentSession = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(signedInSession);
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={getCurrentSession}
        onAuthStateChange={() => vi.fn()}
        onSignInWithPassword={signInWithPassword}
      />,
    );

    await user.type(await screen.findByLabelText('Email'), 'player@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signInWithPassword).toHaveBeenCalledWith('player@example.com', 'secret123');
    expect(await screen.findByText(/player@example.com/)).toBeInTheDocument();
  });

  it('signs up with email and password', async () => {
    const signUpWithPassword = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(null)}
        onAuthStateChange={() => vi.fn()}
        onSignUpWithPassword={signUpWithPassword}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Register new account' }));
    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(signUpWithPassword).toHaveBeenCalledWith('player@example.com', 'secret123');
    expect(await screen.findByText('Account created. Check your email if confirmation is required.')).toBeInTheDocument();
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

  it('refreshes the current session after anonymous sign-in', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue(undefined);
    const getCurrentSession = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(signedInSession);
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={getCurrentSession}
        onAuthStateChange={() => vi.fn()}
        onSignInAnonymously={signInAnonymously}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Anonymous test login' }));

    expect(signInAnonymously).toHaveBeenCalledWith();
    expect(getCurrentSession).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/player@example.com/)).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Run Supabase CRUD smoke test' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('marks demo mode as not being a real Supabase login', async () => {
    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(demoSession)}
        onAuthStateChange={() => vi.fn()}
      />,
    );

    expect(await screen.findByText('Demo Mode：当前不是 Supabase 真实登录')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run Supabase CRUD smoke test' })).not.toBeInTheDocument();
  });

  it('runs the Supabase CRUD smoke test for a real session', async () => {
    const runSmokeTest = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
        onRunSupabaseCrudSmokeTest={runSmokeTest}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Run Supabase CRUD smoke test' }));

    expect(runSmokeTest).toHaveBeenCalledWith();
    expect(await screen.findByText('Supabase CRUD smoke test passed.')).toBeInTheDocument();
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
    window.localStorage.setItem('rockroll.locale', 'zh-CN');

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
