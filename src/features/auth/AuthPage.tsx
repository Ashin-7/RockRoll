import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import {
  AuthSession,
  SupabaseCrudSmokeResult,
  getCurrentSession,
  onAuthStateChange,
  runSupabaseCrudSmokeTest,
  signInAnonymously,
  signInWithEmail,
  signInWithPassword,
  resendSignupConfirmation,
  signUpWithPassword,
  signOut,
} from './auth.service';

interface AuthPageProps {
  onAuthStateChange?: (callback: (session: AuthSession | null) => void) => () => void;
  onGetCurrentSession?: () => Promise<AuthSession | null>;
  onSignInAnonymously?: () => Promise<void>;
  onSignIn?: (email: string) => Promise<void>;
  onSignInWithPassword?: (email: string, password: string) => Promise<void>;
  onSignUpWithPassword?: (email: string, password: string) => Promise<AuthSession | null>;
  onResendSignupConfirmation?: (email: string) => Promise<void>;
  onRunSupabaseCrudSmokeTest?: () => Promise<unknown>;
  onSignOut?: () => Promise<void>;
  testLoginEmail?: string;
}

export function AuthPage({
  onAuthStateChange: subscribeToAuthState = onAuthStateChange,
  onGetCurrentSession = getCurrentSession,
  onSignInAnonymously = signInAnonymously,
  onSignIn = signInWithEmail,
  onSignInWithPassword = signInWithPassword,
  onSignUpWithPassword = signUpWithPassword,
  onResendSignupConfirmation = resendSignupConfirmation,
  onRunSupabaseCrudSmokeTest = runSupabaseCrudSmokeTest,
  onSignOut = signOut,
  testLoginEmail = import.meta.env.VITE_TEST_LOGIN_EMAIL,
}: AuthPageProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [isSigningInAnonymously, setIsSigningInAnonymously] = useState(false);
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
      unsubscribe = subscribeToAuthState((nextSession) => {
        if (isMounted) {
          setSession(nextSession);
          setIsLoadingSession(false);
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

  async function handleAnonymousSignIn() {
    setError('');
    setMessage('');
    setIsSigningInAnonymously(true);

    try {
      await onSignInAnonymously();
      const currentSession = await onGetCurrentSession();
      setSession(currentSession);
      setPendingConfirmationEmail('');
      setMessage(t('auth.anonymousSignedIn'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.anonymousErrorFallback'));
    } finally {
      setIsSigningInAnonymously(false);
    }
  }

  async function handleSignOut() {
    setError('');
    setMessage('');

    try {
      await onSignOut();
      setSession(null);
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
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h1>{t('auth.title')}</h1>

        {isLoadingSession ? <p role="status">{t('auth.loading')}</p> : null}
        {!isLoadingSession && isSendingMagicLink ? <p role="status">Sending magic link...</p> : null}
        {!isLoadingSession && message ? <p role="status">{message}</p> : null}
        {!isLoadingSession && error ? <p role="alert">{error}</p> : null}

        {!isLoadingSession && session ? (
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
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSendingMagicLink || isSubmittingPassword}
              required
            />
            {!showMagicLink ? (
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
            <button type="button" onClick={handleAnonymousSignIn} disabled={isSigningInAnonymously}>
              {isSigningInAnonymously ? t('auth.anonymousSigningIn') : t('auth.anonymousTestLogin')}
            </button>
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
