# Auth Minimal Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Auth page minimal loop: read current session, show signed-in email, listen for auth changes, and sign out.

**Architecture:** Keep Auth state inside `AuthPage`. `auth.service.ts` wraps the small Supabase auth surface needed by the page, while tests inject mock functions into the component so UI behavior stays independent of real Supabase calls.

**Tech Stack:** React 18, TypeScript, Supabase JS, Vite, Vitest, Testing Library, current i18n system.

---

## File Structure

- Create: `src/features/auth/auth.service.test.ts`
  - Tests Supabase auth wrappers.
- Modify: `src/features/auth/auth.service.ts`
  - Adds `AuthSession`, `getCurrentSession`, `signOut`, and `onAuthStateChange`.
- Modify: `src/features/auth/AuthPage.test.tsx`
  - Covers unauthenticated magic link, existing session, sign out, and Chinese signed-in copy.
- Modify: `src/features/auth/AuthPage.tsx`
  - Loads session, subscribes to auth changes, renders signed-in and signed-out views.
- Modify: `src/i18n/messages.ts`
  - Adds Auth loading/signed-in/sign-out messages.
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`
  - Records Auth minimal loop completion and updates next recommended work.

## Commands

Use command-local Node 20 so the repository's global Node 8 default is not changed:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/auth/auth.service.test.ts src/features/auth/AuthPage.test.tsx
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

---

### Task 1: Add Auth Service Session Wrappers

**Files:**
- Create: `src/features/auth/auth.service.test.ts`
- Modify: `src/features/auth/auth.service.ts`

- [ ] **Step 1: Write failing service tests**

Create `src/features/auth/auth.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: authMock,
  }),
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current session', async () => {
    const session = { user: { email: 'player@example.com' } };
    authMock.getSession.mockResolvedValue({ data: { session }, error: null });
    const { getCurrentSession } = await import('./auth.service');

    await expect(getCurrentSession()).resolves.toEqual(session);
  });

  it('throws when reading the current session fails', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'session failed' } });
    const { getCurrentSession } = await import('./auth.service');

    await expect(getCurrentSession()).rejects.toThrow('session failed');
  });

  it('signs out through Supabase auth', async () => {
    authMock.signOut.mockResolvedValue({ error: null });
    const { signOut } = await import('./auth.service');

    await expect(signOut()).resolves.toBeUndefined();
    expect(authMock.signOut).toHaveBeenCalledWith();
  });

  it('throws when sign out fails', async () => {
    authMock.signOut.mockResolvedValue({ error: { message: 'sign out failed' } });
    const { signOut } = await import('./auth.service');

    await expect(signOut()).rejects.toThrow('sign out failed');
  });

  it('subscribes to auth state changes and returns an unsubscribe function', async () => {
    const unsubscribe = vi.fn();
    const callback = vi.fn();
    const session = { user: { email: 'player@example.com' } };
    authMock.onAuthStateChange.mockImplementation((handler) => {
      handler('SIGNED_IN', session);
      return { data: { subscription: { unsubscribe } } };
    });
    const { onAuthStateChange } = await import('./auth.service');

    const stopListening = onAuthStateChange(callback);

    expect(callback).toHaveBeenCalledWith(session);
    stopListening();
    expect(unsubscribe).toHaveBeenCalledWith();
  });
});
```

- [ ] **Step 2: Run service tests to verify red**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/auth/auth.service.test.ts
```

Expected: FAIL because `getCurrentSession`, `signOut`, and `onAuthStateChange` are not exported yet.

- [ ] **Step 3: Implement auth service wrappers**

Update `src/features/auth/auth.service.ts`:

```ts
import { getSupabase } from '../../lib/supabase';

export interface AuthSession {
  user: {
    email?: string | null;
  };
}

export async function signInWithEmail(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange((_event: string, session: AuthSession | null) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}
```

- [ ] **Step 4: Verify service tests pass**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/auth/auth.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit service changes**

Run:

```powershell
git add src/features/auth/auth.service.test.ts src/features/auth/auth.service.ts
git commit -m "feat: add auth session service helpers"
```

---

### Task 2: Render Auth Session State On Auth Page

**Files:**
- Modify: `src/features/auth/AuthPage.test.tsx`
- Modify: `src/features/auth/AuthPage.tsx`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: Write failing page tests**

Replace `src/features/auth/AuthPage.test.tsx` with:

```tsx
import { screen, waitFor } from '@testing-library/react';
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

  it('shows the signed-in email when a session exists', async () => {
    renderWithI18n(
      <AuthPage
        onGetCurrentSession={vi.fn().mockResolvedValue(signedInSession)}
        onAuthStateChange={() => vi.fn()}
      />,
    );

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('player@example.com')).toBeInTheDocument();
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

    authCallback(signedInSession);

    await waitFor(() => expect(screen.getByText('player@example.com')).toBeInTheDocument());
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
```

- [ ] **Step 2: Run page tests to verify red**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/auth/AuthPage.test.tsx
```

Expected: FAIL because `AuthPage` does not yet accept session props or render signed-in state.

- [ ] **Step 3: Add i18n messages**

Add these keys to the English Auth block in `src/i18n/messages.ts`:

```ts
'auth.loading': 'Checking session...',
'auth.signedIn': 'Signed in',
'auth.signedInAs': 'Signed in as',
'auth.signOut': 'Sign out',
'auth.signedOut': 'Signed out.',
```

Add these keys to the `zh-CN` Auth block:

```ts
'auth.loading': '正在检查登录状态...',
'auth.signedIn': '已登录',
'auth.signedInAs': '当前账号',
'auth.signOut': '退出登录',
'auth.signedOut': '已退出登录。',
```

- [ ] **Step 4: Implement AuthPage session UI**

Update `src/features/auth/AuthPage.tsx`:

```tsx
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
    <main className="auth-page">
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
    </main>
  );
}
```

- [ ] **Step 5: Verify page tests pass**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/auth/AuthPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit page changes**

Run:

```powershell
git add src/features/auth/AuthPage.test.tsx src/features/auth/AuthPage.tsx src/i18n/messages.ts
git commit -m "feat: show auth session state"
```

---

### Task 3: Update Status And Verify Full Project

**Files:**
- Modify: `docs/superpowers/docs/PROJECT_STATUS.md`

- [ ] **Step 1: Update project status**

Update `docs/superpowers/docs/PROJECT_STATUS.md`:

- Add Auth minimal loop to current status.
- Add Auth minimal loop to recently completed.
- Move next suggested work from `Auth 最小闭环` to `Song Library`.
- Keep the Node 20 command-local verification note unchanged.

- [ ] **Step 2: Run targeted Auth tests**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run src/features/auth/auth.service.test.ts src/features/auth/AuthPage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm test -- --run
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```powershell
$env:PATH="$env:NVM_HOME\v20.20.2;$env:PATH"; npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit status update**

Run:

```powershell
git add docs/superpowers/docs/PROJECT_STATUS.md
git commit -m "docs: update auth minimal loop status"
```

---

## Self-Review

- Spec coverage: the plan covers session loading, signed-in display, sign out, auth state listener, i18n, tests, and status updates.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `AuthSession`, `getCurrentSession`, `signOut`, and `onAuthStateChange` are consistently named across service, page, and tests.
- Scope check: the plan does not add route guards, global user menus, dependencies, or database changes.
