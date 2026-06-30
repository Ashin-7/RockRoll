import { FormEvent, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { signInWithEmail } from './auth.service';

interface AuthPageProps {
  onSignIn?: (email: string) => Promise<void>;
}

export function AuthPage({ onSignIn = signInWithEmail }: AuthPageProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  return (
    <main className="auth-page">
      <section>
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h1>{t('auth.title')}</h1>
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
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
