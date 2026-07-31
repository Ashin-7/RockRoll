import { FormEvent, useEffect, useState } from 'react';
import { SectionHeading } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import {
  AuthStateChangeCallback,
  AuthSession,
  SupabaseCrudSmokeResult,
  getCurrentSession,
  onAuthStateChange,
  runSupabaseCrudSmokeTest,
  sendPasswordResetEmail,
  signInWithEmail,
  signInWithPassword,
  resendSignupConfirmation,
  signUpWithPassword,
  signOut,
  updatePassword,
} from './auth.service';

interface AuthPageProps {
  onAuthStateChange?: (callback: AuthStateChangeCallback) => () => void;
  onGetCurrentSession?: () => Promise<AuthSession | null>;
  onSignIn?: (email: string) => Promise<void>;
  onSignInWithPassword?: (email: string, password: string) => Promise<void>;
  onSignUpWithPassword?: (email: string, password: string) => Promise<AuthSession | null>;
  onResendSignupConfirmation?: (email: string) => Promise<void>;
  onSendPasswordResetEmail?: (email: string) => Promise<void>;
  onUpdatePassword?: (password: string) => Promise<void>;
  onRunSupabaseCrudSmokeTest?: () => Promise<unknown>;
  onSignOut?: () => Promise<void>;
  testLoginEmail?: string;
}

export function AuthPage({
  onAuthStateChange: subscribeToAuthState = onAuthStateChange,
  onGetCurrentSession = getCurrentSession,
  onSignIn = signInWithEmail,
  onSignInWithPassword = signInWithPassword,
  onSignUpWithPassword = signUpWithPassword,
  onResendSignupConfirmation = resendSignupConfirmation,
  onSendPasswordResetEmail = sendPasswordResetEmail,
  onUpdatePassword = updatePassword,
  onRunSupabaseCrudSmokeTest = runSupabaseCrudSmokeTest,
  onSignOut = signOut,
  testLoginEmail = import.meta.env.VITE_TEST_LOGIN_EMAIL,
}: AuthPageProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [isRunningSmokeTest, setIsRunningSmokeTest] = useState(false);
  const [smokeTestResult, setSmokeTestResult] = useState<SupabaseCrudSmokeResult | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const currentSession = await onGetCurrentSession();
        if (isMounted) {
          setSession(currentSession);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    let unsubscribe: () => void = () => undefined;

    try {
      unsubscribe = subscribeToAuthState((nextSession, event) => {
        if (isMounted) {
          setSession(nextSession);
          setIsLoadingSession(false);
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
            setError('');
            setMessage('');
          }
        }
      });
    } catch (caughtError) {
      if (isMounted) {
        setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
        setIsLoadingSession(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [onGetCurrentSession, subscribeToAuthState, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (authMode === 'forgotPassword') {
      try {
        setIsSendingPasswordReset(true);
        await onSendPasswordResetEmail(email);
        setPendingConfirmationEmail('');
        setMessage('If an account exists for this email, a password reset link has been sent.');
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
      } finally {
        setIsSendingPasswordReset(false);
      }
      return;
    }

    if (!showMagicLink) {
      try {
        setIsSubmittingPassword(true);
        if (authMode === 'signIn') {
          await onSignInWithPassword(email, password);
          const currentSession = await onGetCurrentSession();
          setSession(currentSession);
          setPendingConfirmationEmail('');
          setMessage('Signed in.');
        } else {
          const nextSession = await onSignUpWithPassword(email, password);
          if (nextSession) {
            setSession(nextSession);
            setPendingConfirmationEmail('');
            setMessage('Signed in.');
          } else {
            setPendingConfirmationEmail(email);
            setMessage('Email confirmation required. Check your inbox before signing in.');
          }
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
      } finally {
        setIsSubmittingPassword(false);
      }
      return;
    }

    try {
      setIsSendingMagicLink(true);
      await onSignIn(email);
      setPendingConfirmationEmail('');
      setMessage(t('auth.checkEmail'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
    } finally {
      setIsSendingMagicLink(false);
    }
  }

  async function handleResendConfirmation() {
    const confirmationEmail = pendingConfirmationEmail || email;
    setError('');
    setMessage('');
    setIsResendingConfirmation(true);

    try {
      await onResendSignupConfirmation(confirmationEmail);
      setPendingConfirmationEmail(confirmationEmail);
      setMessage('Confirmation email resent.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
    } finally {
      setIsResendingConfirmation(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await onUpdatePassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setIsPasswordRecovery(false);
      setMessage('Password updated.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleSignOut() {
    setError('');
    setMessage('');

    try {
      await onSignOut();
      setSession(null);
      setIsPasswordRecovery(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setPendingConfirmationEmail('');
      setMessage(t('auth.signedOut'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
    }
  }

  async function handleRunSmokeTest() {
    setError('');
    setMessage('');
    setSmokeTestResult(null);
    setIsRunningSmokeTest(true);

    try {
      const result = await onRunSupabaseCrudSmokeTest();
      setSmokeTestResult(result as SupabaseCrudSmokeResult);
      setMessage('Supabase CRUD smoke test passed.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Supabase CRUD smoke test failed.');
    } finally {
      setIsRunningSmokeTest(false);
    }
  }

  return (
    <section className="auth-page">
      <section>
        <SectionHeading
          as="h1"
          eyebrow={t('auth.eyebrow')}
          title={t('auth.title')}
        />

        {isLoadingSession ? <p role="status">{t('auth.loading')}</p> : null}
        {!isLoadingSession && isSendingMagicLink ? <p role="status">Sending magic link...</p> : null}
        {!isLoadingSession && message ? <p role="status">{message}</p> : null}
        {!isLoadingSession && error ? <p role="alert">{error}</p> : null}

        {!isLoadingSession && session && isPasswordRecovery ? (
          <form onSubmit={handleUpdatePassword}>
            <h2>Set a new password</h2>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isUpdatingPassword}
              minLength={6}
              required
            />
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              disabled={isUpdatingPassword}
              minLength={6}
              required
            />
            <button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        ) : null}

        {!isLoadingSession && session && !isPasswordRecovery ? (
          <div>
            <p>{t('auth.signedIn')}</p>
            {session.isDemo ? <p role="status">Demo Mode：当前不是 Supabase 真实登录</p> : null}
            <p>
              {t('auth.signedInAs')}: {session.user.email ?? ''}
            </p>
            {!session.isDemo ? (
              <button type="button" onClick={handleRunSmokeTest} disabled={isRunningSmokeTest}>
                {isRunningSmokeTest ? 'Running Supabase CRUD smoke test...' : 'Run Supabase CRUD smoke test'}
              </button>
            ) : null}
            {smokeTestResult ? (
              <div role="status">
                <p>Smoke test user: {smokeTestResult.userId}</p>
                <p>Inserted row: {smokeTestResult.insertedId}</p>
                <p>Updated focus: {smokeTestResult.updatedFocusArea}</p>
                <p>Deleted: {smokeTestResult.deleted ? 'yes' : 'no'}</p>
              </div>
            ) : null}
            <button type="button" onClick={handleSignOut}>
              {t('auth.signOut')}
            </button>
          </div>
        ) : null}

        {!isLoadingSession && !session ? (
          <form onSubmit={handleSubmit}>
            {authMode !== 'forgotPassword' ? (
              <div aria-label="Authentication mode">
                <button
                  type="button"
                  aria-pressed={authMode === 'signIn'}
                  onClick={() => {
                    setAuthMode('signIn');
                    setShowMagicLink(false);
                    setError('');
                    setMessage('');
                    setPendingConfirmationEmail('');
                  }}
                >
                  Use existing account
                </button>
                <button
                  type="button"
                  aria-pressed={authMode === 'signUp'}
                  onClick={() => {
                    setAuthMode('signUp');
                    setShowMagicLink(false);
                    setError('');
                    setMessage('');
                    setPendingConfirmationEmail('');
                  }}
                >
                  Register new account
                </button>
              </div>
            ) : (
              <h2>Reset password</h2>
            )}
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSendingMagicLink || isSendingPasswordReset || isSubmittingPassword}
              required
            />
            {authMode === 'forgotPassword' ? (
              <>
                <button type="submit" disabled={isSendingPasswordReset}>
                  {isSendingPasswordReset ? 'Sending password reset link...' : 'Send password reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signIn');
                    setError('');
                    setMessage('');
                  }}
                >
                  Back to sign in
                </button>
              </>
            ) : !showMagicLink ? (
              <>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmittingPassword}
                  minLength={6}
                  required
                />
                <button type="submit" disabled={isSubmittingPassword}>
                  {isSubmittingPassword
                    ? authMode === 'signIn'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : authMode === 'signIn'
                      ? 'Sign in'
                      : 'Create account'}
                </button>
                {pendingConfirmationEmail ? (
                  <button type="button" onClick={handleResendConfirmation} disabled={isResendingConfirmation}>
                    {isResendingConfirmation ? 'Resending confirmation email...' : 'Resend confirmation email'}
                  </button>
                ) : null}
                <button type="button" onClick={() => setShowMagicLink(true)}>
                  Send a magic link instead
                </button>
                {authMode === 'signIn' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgotPassword');
                      setShowMagicLink(false);
                      setError('');
                      setMessage('');
                      setPendingConfirmationEmail('');
                    }}
                  >
                    Forgot password?
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button type="submit" disabled={isSendingMagicLink}>
                  {isSendingMagicLink ? 'Sending magic link...' : t('auth.sendMagicLink')}
                </button>
                <button type="button" onClick={() => setShowMagicLink(false)}>
                  Use password instead
                </button>
              </>
            )}
            {testLoginEmail ? (
              <button type="button" onClick={() => setEmail(testLoginEmail)}>
                {t('auth.useTestEmail')}
              </button>
            ) : null}
          </form>
        ) : null}
      </section>
    </section>
  );
}
