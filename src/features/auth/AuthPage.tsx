import { FormEvent, useState } from 'react';
import { signInWithEmail } from './auth.service';

interface AuthPageProps {
  onSignIn?: (email: string) => Promise<void>;
}

export function AuthPage({ onSignIn = signInWithEmail }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await onSignIn(email);
      setMessage('Check your email for the login link.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send login link.');
    }
  }

  return (
    <main className="auth-page">
      <section>
        <p className="eyebrow">Private backstage access</p>
        <h1>Sign in to your archive.</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit">Send magic link</button>
        </form>
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
