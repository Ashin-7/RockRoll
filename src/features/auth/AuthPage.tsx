import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import {
  AuthSession,
  getCurrentSession,
  onAuthStateChange,
  signInWithEmail,
  signOut,
} from './auth.service';

interface AuthPageProps {
  onAuthStateChange?: (callback: (session: AuthSession | null) => void) => () => void;
  onGetCurrentSession?: () => Promise<AuthSession | null>;
  onSignIn?: (email: string) => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export function AuthPage({
  onAuthStateChange: subscribeToAuthState = onAuthStateChange,
  onGetCurrentSession = getCurrentSession,
  onSignIn = signInWithEmail,
  onSignOut = signOut,
}: AuthPageProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
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

    const unsubscribe = subscribeToAuthState((nextSession) => {
      setSession(nextSession);
      setIsLoadingSession(false);
    });

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

    try {
      await onSignIn(email);
      setMessage(t('auth.checkEmail'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
    }
  }

  async function handleSignOut() {
    setError('');
    setMessage('');

    try {
      await onSignOut();
      setSession(null);
      setMessage(t('auth.signedOut'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
    }
  }

  return (
    <section className="auth-page">
      <section>
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h1>{t('auth.title')}</h1>

        {isLoadingSession ? <p role="status">{t('auth.loading')}</p> : null}

        {!isLoadingSession && session ? (
          <div>
            <p>{t('auth.signedIn')}</p>
            <p>
              {t('auth.signedInAs')}: {session.user.email ?? ''}
            </p>
            <button type="button" onClick={handleSignOut}>
              {t('auth.signOut')}
            </button>
          </div>
        ) : null}

        {!isLoadingSession && !session ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit">{t('auth.sendMagicLink')}</button>
          </form>
        ) : null}

        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </section>
  );
}
