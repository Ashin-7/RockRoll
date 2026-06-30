import { getSupabase } from '../../lib/supabase';
import { SongSummary } from './song.types';

interface SongRow {
  id: string;
  title: string;
  status: SongSummary['status'];
  difficulty: number | null;
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

  return ((data ?? []) as SongRow[]).map((song) => ({
    id: song.id,
    title: song.title,
    artistName: 'Unknown artist',
    status: song.status,
    difficulty: song.difficulty,
  }));
}
