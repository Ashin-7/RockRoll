import { getMissingSupabaseEnvMessage, isDemoModeEnabled } from '../../config/env';
import { getSupabase } from '../../lib/supabase';

export interface AuthSession {
  isDemo?: boolean;
  user: {
    id?: string;
    email?: string | null;
  };
}

export interface SupabaseCrudSmokeResult {
  deleted: boolean;
  insertedId: string;
  selectedUserId: string;
  updatedFocusArea: string;
  userId: string;
}

export type AuthStateChangeCallback = (session: AuthSession | null, event?: string) => void;

const demoSessionStorageKey = 'rockroll.demoSession';
const demoSession: AuthSession = {
  isDemo: true,
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

function handleMissingSupabaseEnvForDemo(error: unknown): boolean {
  return isMissingSupabaseEnvError(error) && isDemoModeEnabled();
}

function createMissingSupabaseEnvError(error: unknown): Error {
  return new Error(getMissingSupabaseEnvMessage(error));
}

async function ensureUserProfile(
  supabase: ReturnType<typeof getSupabase>,
  session: AuthSession | null,
): Promise<void> {
  const userId = session?.user.id;

  if (!userId || userId === demoSession.user.id) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, role: 'user' }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    throw new Error('Unable to initialize the user profile.');
  }
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

export async function signUpWithPassword(email: string, password: string): Promise<AuthSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  await ensureUserProfile(supabase, data.session);

  return data.session;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  await ensureUserProfile(supabase, data.session);
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#auth`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(password: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signInAnonymously(): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (handleMissingSupabaseEnvForDemo(caughtError)) {
      writeDemoSession(demoSession);
      return;
    }
    throw isMissingSupabaseEnvError(caughtError) ? createMissingSupabaseEnvError(caughtError) : caughtError;
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
    if (handleMissingSupabaseEnvForDemo(caughtError)) {
      return readDemoSession();
    }
    throw isMissingSupabaseEnvError(caughtError) ? createMissingSupabaseEnvError(caughtError) : caughtError;
  }
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  await ensureUserProfile(supabase, data.session);

  return data.session;
}

export async function signOut(): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (handleMissingSupabaseEnvForDemo(caughtError)) {
      clearDemoSession();
      return;
    }
    throw isMissingSupabaseEnvError(caughtError) ? createMissingSupabaseEnvError(caughtError) : caughtError;
  }
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(callback: AuthStateChangeCallback): () => void {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (handleMissingSupabaseEnvForDemo(caughtError)) {
      callback(readDemoSession());
      return () => undefined;
    }
    throw isMissingSupabaseEnvError(caughtError) ? createMissingSupabaseEnvError(caughtError) : caughtError;
  }
  const { data } = supabase.auth.onAuthStateChange((event: string, session: AuthSession | null) => {
    callback(session, event);
  });

  return () => data.subscription.unsubscribe();
}

export async function runSupabaseCrudSmokeTest(): Promise<SupabaseCrudSmokeResult> {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const userId = sessionData.session?.user?.id;

  if (!userId || userId === 'local-demo-user') {
    throw new Error('A real Supabase session is required before running the CRUD smoke test.');
  }

  const baseRow = {
    user_id: userId,
    song_id: null,
    duration_minutes: 1,
    goal_duration_minutes: null,
    completion_percent: null,
    bpm: null,
    tags: ['smoke-test'],
    focus_area: 'supabase-smoke-insert',
    reflection: 'Temporary CRUD smoke test row.',
  };

  const { data: insertedRow, error: insertError } = await supabase
    .from('practice_sessions')
    .insert(baseRow)
    .select('id,user_id,focus_area')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const insertedId = insertedRow.id as string;

  try {
    const { data: selectedRow, error: selectError } = await supabase
      .from('practice_sessions')
      .select('id,user_id,focus_area')
      .eq('id', insertedId)
      .single();

    if (selectError) {
      throw new Error(selectError.message);
    }

    const updatedFocusArea = 'supabase-smoke-update';
    const { data: updatedRow, error: updateError } = await supabase
      .from('practice_sessions')
      .update({ focus_area: updatedFocusArea })
      .eq('id', insertedId)
      .select('id,user_id,focus_area')
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: deleteError } = await supabase.from('practice_sessions').delete().eq('id', insertedId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { data: deletedRow, error: deletedSelectError } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('id', insertedId)
      .maybeSingle();

    if (deletedSelectError) {
      throw new Error(deletedSelectError.message);
    }

    return {
      deleted: deletedRow === null,
      insertedId,
      selectedUserId: selectedRow.user_id as string,
      updatedFocusArea: updatedRow.focus_area as string,
      userId,
    };
  } catch (caughtError) {
    await supabase.from('practice_sessions').delete().eq('id', insertedId);
    throw caughtError;
  }
}
