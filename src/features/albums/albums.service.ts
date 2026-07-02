import { getSupabase } from '../../lib/supabase';
import { AlbumDetail, AlbumSummary, AlbumType, CreateAlbumInput, UpdateAlbumInput } from './album.types';

interface AlbumRow {
  id: string;
  title: string;
  release_year: number | null;
  album_type: string;
  notes: string;
  artists: { name: string } | Array<{ name: string }> | null;
}

const albumTypes: AlbumType[] = ['album', 'ep', 'live', 'compilation'];
const demoSessionStorageKey = 'rockroll.demoSession';
const demoAlbumsStorageKey = 'rockroll.demoAlbums';

function toAlbumType(albumType: string): AlbumType {
  return albumTypes.includes(albumType as AlbumType) ? (albumType as AlbumType) : 'album';
}

function getArtistName(row: AlbumRow): string {
  if (Array.isArray(row.artists)) {
    return row.artists[0]?.name ?? 'Unknown artist';
  }

  return row.artists?.name ?? 'Unknown artist';
}

function mapAlbumRow(album: AlbumRow): AlbumSummary {
  return {
    id: album.id,
    title: album.title,
    artistName: getArtistName(album),
    releaseYear: album.release_year,
    albumType: toAlbumType(album.album_type),
    notes: album.notes,
  };
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function hasDemoSession(): boolean {
  return Boolean(window.localStorage.getItem(demoSessionStorageKey));
}

function readDemoAlbums(): AlbumSummary[] {
  const storedAlbums = window.localStorage.getItem(demoAlbumsStorageKey);
  return storedAlbums ? (JSON.parse(storedAlbums) as AlbumSummary[]) : [];
}

function writeDemoAlbums(albums: AlbumSummary[]) {
  window.localStorage.setItem(demoAlbumsStorageKey, JSON.stringify(albums));
}

function findDemoAlbum(albumId: string): AlbumDetail | null {
  return readDemoAlbums().find((demoAlbum) => demoAlbum.id === albumId) ?? null;
}

export async function listAlbums(): Promise<AlbumSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoAlbums();
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('albums')
    .select('id,title,release_year,album_type,notes,artists(name)')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AlbumRow[]).map(mapAlbumRow);
}

export async function createAlbum(input: CreateAlbumInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding albums.');
      }
      writeDemoAlbums([
        {
          id: `local-album-${Date.now()}`,
          title: input.title,
          artistName: 'Unknown artist',
          releaseYear: input.releaseYear,
          albumType: input.albumType,
          notes: input.notes,
        },
        ...readDemoAlbums(),
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
    throw new Error('Sign in before adding albums.');
  }

  const { error } = await supabase.from('albums').insert({
    user_id: userId,
    artist_id: input.artistId,
    title: input.title,
    release_year: input.releaseYear,
    album_type: input.albumType,
    notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAlbum(albumId: string, input: UpdateAlbumInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before editing albums.');
      }
      writeDemoAlbums(
        readDemoAlbums().map((album) =>
          album.id === albumId
            ? {
                ...album,
                title: input.title,
                releaseYear: input.releaseYear,
                albumType: input.albumType,
                notes: input.notes,
              }
            : album,
        ),
      );
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase
    .from('albums')
    .update({
      artist_id: input.artistId,
      title: input.title,
      release_year: input.releaseYear,
      album_type: input.albumType,
      notes: input.notes,
    })
    .eq('id', albumId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAlbum(albumId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before deleting albums.');
      }
      writeDemoAlbums(readDemoAlbums().filter((album) => album.id !== albumId));
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase.from('albums').delete().eq('id', albumId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAlbumById(albumId: string): Promise<AlbumDetail | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return findDemoAlbum(albumId);
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('albums')
    .select('id,title,release_year,album_type,notes,artists(name)')
    .eq('id', albumId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAlbumRow(data as AlbumRow) : null;
}
