import { getSupabase } from '../../lib/supabase';
import { PracticeHistoryItem } from './practice.mock';
import { PracticeSessionInput } from './practice.types';

export interface PracticeAuthSession {
  user: {
    id?: string;
    email?: string | null;
  };
}

const demoSessionStorageKey = 'rockroll.demoSession';
const demoPracticeHistoryStorageKey = 'rockroll.demoPracticeHistory';

interface PracticeSessionRow {
  id: string;
  song_id: string | null;
  practiced_on: string;
  duration_minutes: number;
  goal_duration_minutes: number | null;
  completion_percent: number | null;
  bpm: number | null;
  tags: string[] | null;
  focus_area: string;
  reflection: string;
  songs: { title: string } | Array<{ title: string }> | null;
}

function getSongTitle(row: PracticeSessionRow): string {
  if (Array.isArray(row.songs)) {
    return row.songs[0]?.title ?? 'Unknown song';
  }

  return row.songs?.title ?? 'Unknown song';
}

function mapPracticeSessionRow(row: PracticeSessionRow): PracticeHistoryItem {
  return {
    id: row.id,
    songId: row.song_id,
    songTitle: getSongTitle(row),
    artistName: 'Unknown artist',
    practicedOn: row.practiced_on,
    durationMinutes: row.duration_minutes,
    goalDurationMinutes: row.goal_duration_minutes,
    completionPercent: row.completion_percent,
    bpm: row.bpm,
    tags: row.tags ?? [],
    focusArea: row.focus_area,
    reflection: row.reflection,
  };
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function readDemoSession(): PracticeAuthSession | null {
  const storedSession = window.localStorage.getItem(demoSessionStorageKey);
  return storedSession ? (JSON.parse(storedSession) as PracticeAuthSession) : null;
}

function readDemoPracticeHistory(): PracticeHistoryItem[] {
  const storedHistory = window.localStorage.getItem(demoPracticeHistoryStorageKey);
  return storedHistory ? (JSON.parse(storedHistory) as PracticeHistoryItem[]) : [];
}

function writeDemoPracticeHistory(sessions: PracticeHistoryItem[]) {
  window.localStorage.setItem(demoPracticeHistoryStorageKey, JSON.stringify(sessions));
}

function createDemoPracticeSession(input: PracticeSessionInput) {
  if (!readDemoSession()) {
    throw new Error('Sign in before saving practice sessions.');
  }

  const nextSession: PracticeHistoryItem = {
    id: `local-practice-${Date.now()}`,
    songId: input.songId,
    songTitle: 'Local demo practice',
    artistName: 'Local demo',
    practicedOn: new Date().toISOString().slice(0, 10),
    durationMinutes: input.durationMinutes,
    goalDurationMinutes: input.goalDurationMinutes ?? null,
    completionPercent: input.completionPercent ?? null,
    bpm: input.bpm,
    tags: input.tags ?? [],
    focusArea: input.focusArea,
    reflection: input.reflection,
  };

  writeDemoPracticeHistory([nextSession, ...readDemoPracticeHistory()]);
}

function updateDemoPracticeSession(sessionId: string, input: PracticeSessionInput) {
  if (!readDemoSession()) {
    throw new Error('Sign in before updating practice sessions.');
  }

  writeDemoPracticeHistory(
    readDemoPracticeHistory().map((session) =>
      session.id === sessionId
        ? {
            ...session,
            songId: input.songId,
            durationMinutes: input.durationMinutes,
            goalDurationMinutes: input.goalDurationMinutes ?? null,
            completionPercent: input.completionPercent ?? null,
            bpm: input.bpm,
            tags: input.tags ?? [],
            focusArea: input.focusArea,
            reflection: input.reflection,
          }
        : session,
    ),
  );
}

function deleteDemoPracticeSession(sessionId: string) {
  if (!readDemoSession()) {
    throw new Error('Sign in before deleting practice sessions.');
  }

  writeDemoPracticeHistory(readDemoPracticeHistory().filter((session) => session.id !== sessionId));
}

export async function listPracticeHistory(): Promise<PracticeHistoryItem[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoPracticeHistory();
    }
    throw caughtError;
  }
  const { data, error } = await supabase
    .from('practice_sessions')
    .select(
      'id,song_id,practiced_on,duration_minutes,goal_duration_minutes,completion_percent,bpm,tags,focus_area,reflection,songs(title)',
    )
    .order('practiced_on', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PracticeSessionRow[]).map(mapPracticeSessionRow);
}

export async function createPracticeSession(input: PracticeSessionInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      createDemoPracticeSession(input);
      return;
    }
    throw caughtError;
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Sign in before saving practice sessions.');
  }

  const { error } = await supabase.from('practice_sessions').insert({
    user_id: userId,
    song_id: input.songId,
    duration_minutes: input.durationMinutes,
    goal_duration_minutes: input.goalDurationMinutes ?? null,
    completion_percent: input.completionPercent ?? null,
    bpm: input.bpm,
    tags: input.tags ?? [],
    focus_area: input.focusArea,
    reflection: input.reflection,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePracticeSession(sessionId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      deleteDemoPracticeSession(sessionId);
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase.from('practice_sessions').delete().eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePracticeSession(sessionId: string, input: PracticeSessionInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      updateDemoPracticeSession(sessionId, input);
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase
    .from('practice_sessions')
    .update({
      song_id: input.songId,
      duration_minutes: input.durationMinutes,
      goal_duration_minutes: input.goalDurationMinutes ?? null,
      completion_percent: input.completionPercent ?? null,
      bpm: input.bpm,
      tags: input.tags ?? [],
      focus_area: input.focusArea,
      reflection: input.reflection,
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentPracticeSession(): Promise<PracticeAuthSession | null> {
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

export function onPracticeAuthStateChange(callback: (session: PracticeAuthSession | null) => void): () => void {
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
  const { data } = supabase.auth.onAuthStateChange((_event: string, session: PracticeAuthSession | null) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}
