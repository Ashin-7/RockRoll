import { getSupabase } from '../../lib/supabase';

export interface AuthSession {
  user: {
    id?: string;
    email?: string | null;
  };
}

const demoSessionStorageKey = 'rockroll.demoSession';
const demoSession: AuthSession = {
  user: {
    id: 'local-demo-user',
    email: 'demo@rockroll.local',
  },
};

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function readDemoSession(): AuthSession | null {
  const storedSession = window.localStorage.getItem(demoSessionStorageKey);
  return storedSession ? (JSON.parse(storedSession) as AuthSession) : null;
}

function writeDemoSession(session: AuthSession) {
  window.localStorage.setItem(demoSessionStorageKey, JSON.stringify(session));
}

function clearDemoSession() {
  window.localStorage.removeItem(demoSessionStorageKey);
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

export async function signInAnonymously(): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      writeDemoSession(demoSession);
      return;
    }
    throw caughtError;
  }
  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoSession();
    }
    throw caughtError;
  }
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      clearDemoSession();
      return;
    }
    throw caughtError;
  }
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      callback(readDemoSession());
      return () => undefined;
    }
    throw caughtError;
  }
  const { data } = supabase.auth.onAuthStateChange((_event: string, session: AuthSession | null) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}
