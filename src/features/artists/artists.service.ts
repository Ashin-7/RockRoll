import { getSupabase } from '../../lib/supabase';
import { ArtistDetail, ArtistSummary, CreateArtistInput } from './artist.types';

interface ArtistRow {
  id: string;
  name: string;
  country: string | null;
  begin_year: number | null;
  end_year: number | null;
  notes: string;
}

const demoSessionStorageKey = 'rockroll.demoSession';
const demoArtistsStorageKey = 'rockroll.demoArtists';

function mapArtistRow(artist: ArtistRow): ArtistSummary {
  return {
    id: artist.id,
    name: artist.name,
    country: artist.country,
    beginYear: artist.begin_year,
    endYear: artist.end_year,
    notes: artist.notes,
  };
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function hasDemoSession(): boolean {
  return Boolean(window.localStorage.getItem(demoSessionStorageKey));
}

function readDemoArtists(): ArtistSummary[] {
  const storedArtists = window.localStorage.getItem(demoArtistsStorageKey);
  return storedArtists ? (JSON.parse(storedArtists) as ArtistSummary[]) : [];
}

function writeDemoArtists(artists: ArtistSummary[]) {
  window.localStorage.setItem(demoArtistsStorageKey, JSON.stringify(artists));
}

function findDemoArtist(artistId: string): ArtistDetail | null {
  return readDemoArtists().find((demoArtist) => demoArtist.id === artistId) ?? null;
}

export async function listArtists(): Promise<ArtistSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoArtists();
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('artists')
    .select('id,name,country,begin_year,end_year,notes')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ArtistRow[]).map(mapArtistRow);
}

export async function createArtist(input: CreateArtistInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding artists.');
      }
      writeDemoArtists([
        {
          id: `local-artist-${Date.now()}`,
          name: input.name,
          country: input.country,
          beginYear: input.beginYear,
          endYear: null,
          notes: input.notes,
        },
        ...readDemoArtists(),
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
    throw new Error('Sign in before adding artists.');
  }

  const { error } = await supabase.from('artists').insert({
    user_id: userId,
    name: input.name,
    country: input.country,
    begin_year: input.beginYear,
    notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getArtistById(artistId: string): Promise<ArtistDetail | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return findDemoArtist(artistId);
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('artists')
    .select('id,name,country,begin_year,end_year,notes')
    .eq('id', artistId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapArtistRow(data as ArtistRow) : null;
}
