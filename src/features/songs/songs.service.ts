import { getSupabase } from '../../lib/supabase';
import { CreateSongInput, SongStatus, SongSummary } from './song.types';

interface SongRow {
  id: string;
  title: string;
  status: string;
  difficulty: number | null;
}

const songStatuses: SongStatus[] = ['planned', 'learning', 'polishing', 'archived'];

function toSongStatus(status: string): SongStatus {
  return songStatuses.includes(status as SongStatus) ? (status as SongStatus) : 'planned';
}

function mapSongRow(song: SongRow): SongSummary {
  return {
    id: song.id,
    title: song.title,
    artistName: 'Unknown artist',
    status: toSongStatus(song.status),
    difficulty: song.difficulty,
  };
}

export async function listSongs(): Promise<SongSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('songs')
    .select('id,title,status,difficulty')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SongRow[]).map(mapSongRow);
}

export async function createSong(input: CreateSongInput): Promise<void> {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Sign in before adding songs.');
  }

  const { error } = await supabase.from('songs').insert({
    user_id: userId,
    title: input.title,
    status: input.status,
    difficulty: input.difficulty,
  });

  if (error) {
    throw new Error(error.message);
  }
}
