import { getSupabase } from '../../lib/supabase';
import { PracticeHistoryItem } from './practice.mock';
import { PracticeSessionInput } from './practice.types';

export interface PracticeAuthSession {
  user: {
    email?: string | null;
  };
}

interface PracticeSessionRow {
  id: string;
  song_id: string | null;
  practiced_on: string;
  duration_minutes: number;
  bpm: number | null;
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
    songTitle: getSongTitle(row),
    artistName: 'Unknown artist',
    practicedOn: row.practiced_on,
    durationMinutes: row.duration_minutes,
    bpm: row.bpm,
    focusArea: row.focus_area,
    reflection: row.reflection,
  };
}

export async function listPracticeHistory(): Promise<PracticeHistoryItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('id,song_id,practiced_on,duration_minutes,bpm,focus_area,reflection,songs(title)')
    .order('practiced_on', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PracticeSessionRow[]).map(mapPracticeSessionRow);
}

export async function createPracticeSession(input: PracticeSessionInput): Promise<void> {
  const supabase = getSupabase();
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
    bpm: input.bpm,
    focus_area: input.focusArea,
    reflection: input.reflection,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentPracticeSession(): Promise<PracticeAuthSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function onPracticeAuthStateChange(callback: (session: PracticeAuthSession | null) => void): () => void {
  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange((_event: string, session: PracticeAuthSession | null) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}
