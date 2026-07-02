import { getSupabase } from '../../lib/supabase';
import { CreateSongInput, SongDetail, SongStatus, SongSummary, UpdateSongInput } from './song.types';

interface SongRow {
  id: string;
  title: string;
  status: string;
  difficulty: number | null;
}

interface SongDetailRow extends SongRow {
  release_year: number | null;
  bpm: number | null;
  notes: string;
}

const songStatuses: SongStatus[] = ['planned', 'learning', 'polishing', 'archived'];
const demoSessionStorageKey = 'rockroll.demoSession';
const demoSongsStorageKey = 'rockroll.demoSongs';

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

function mapSongDetailRow(song: SongDetailRow): SongDetail {
  return {
    ...mapSongRow(song),
    releaseYear: song.release_year,
    bpm: song.bpm,
    notes: song.notes,
  };
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function hasDemoSession(): boolean {
  return Boolean(window.localStorage.getItem(demoSessionStorageKey));
}

function readDemoSongs(): SongDetail[] {
  const storedSongs = window.localStorage.getItem(demoSongsStorageKey);
  return storedSongs ? (JSON.parse(storedSongs) as SongDetail[]) : [];
}

function writeDemoSongs(songs: SongDetail[]) {
  window.localStorage.setItem(demoSongsStorageKey, JSON.stringify(songs));
}

function findDemoSong(songId: string): SongDetail | null {
  const song = readDemoSongs().find((demoSong) => demoSong.id === songId);

  return song
    ? {
        releaseYear: null,
        bpm: null,
        notes: '',
        ...song,
      }
    : null;
}

export async function listSongs(): Promise<SongSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoSongs();
    }
    throw caughtError;
  }
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
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding songs.');
      }
      writeDemoSongs([
        {
          id: `local-song-${Date.now()}`,
          title: input.title,
          artistName: 'Local demo',
          status: input.status,
          difficulty: input.difficulty,
          releaseYear: null,
          bpm: null,
          notes: '',
        },
        ...readDemoSongs(),
      ]);
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

export async function updateSong(songId: string, input: UpdateSongInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before editing songs.');
      }
      writeDemoSongs(
        readDemoSongs().map((song) =>
          song.id === songId
            ? {
                ...song,
                title: input.title,
                status: input.status,
                difficulty: input.difficulty,
                releaseYear: input.releaseYear,
                bpm: input.bpm,
                notes: input.notes,
              }
            : song,
        ),
      );
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase
    .from('songs')
    .update({
      title: input.title,
      status: input.status,
      difficulty: input.difficulty,
      release_year: input.releaseYear,
      bpm: input.bpm,
      notes: input.notes,
    })
    .eq('id', songId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSong(songId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before deleting songs.');
      }
      writeDemoSongs(readDemoSongs().filter((song) => song.id !== songId));
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase.from('songs').delete().eq('id', songId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getSongById(songId: string): Promise<SongDetail | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return findDemoSong(songId);
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('songs')
    .select('id,title,status,difficulty,release_year,bpm,notes')
    .eq('id', songId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapSongDetailRow(data as SongDetailRow) : null;
}
