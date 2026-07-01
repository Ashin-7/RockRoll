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

export async function signInAnonymously(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInAnonymously();

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
