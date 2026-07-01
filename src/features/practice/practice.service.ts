import { getSupabase } from '../../lib/supabase';
import { PracticeSessionInput } from './practice.types';

export async function createPracticeSession(input: PracticeSessionInput): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('practice_sessions').insert({
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
