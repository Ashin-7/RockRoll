create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_name text,
  country text,
  begin_year integer,
  end_year integer,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  title text not null,
  release_year integer,
  album_type text not null default 'album',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.genres(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id uuid references public.albums(id) on delete set null,
  title text not null,
  release_year integer,
  difficulty integer check (difficulty is null or difficulty between 1 and 5),
  status text not null default 'planned',
  bpm integer check (bpm is null or bpm > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.song_artists (
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'primary',
  primary key (song_id, artist_id, role)
);

create table public.song_genres (
  song_id uuid not null references public.songs(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (song_id, genre_id)
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  practiced_on date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0),
  bpm integer check (bpm is null or bpm > 0),
  focus_area text not null default '',
  problems text not null default '',
  reflection text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  media_type text not null check (media_type in ('video', 'audio', 'pdf', 'gp', 'image', 'backing_track', 'link')),
  mime_type text,
  size_bytes bigint,
  duration_seconds integer,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.media_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  entity_type text not null check (entity_type in ('song', 'practice_session', 'artist', 'album')),
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create table public.external_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song', 'genre')),
  entity_id uuid not null,
  source_name text not null check (source_name in ('musicbrainz', 'discogs', 'spotify')),
  source_id text not null,
  source_url text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_name, source_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  source_name text not null check (source_name in ('musicbrainz', 'discogs', 'spotify')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song')),
  display_title text not null,
  display_subtitle text not null default '',
  source_name text not null,
  source_id text not null,
  source_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_candidate_id uuid not null references public.import_candidates(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song')),
  draft_payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.genres enable row level security;
alter table public.songs enable row level security;
alter table public.song_artists enable row level security;
alter table public.song_genres enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_links enable row level security;
alter table public.external_sources enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_candidates enable row level security;
alter table public.import_drafts enable row level security;

create policy "profiles are private" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "artists are private" on public.artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "albums are private" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "genres are private" on public.genres
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "songs are private" on public.songs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "song artists are private" on public.song_artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "song genres are private" on public.song_genres
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "practice sessions are private" on public.practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "media assets are private" on public.media_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "media links are private" on public.media_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "external sources are private" on public.external_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "import jobs are private" on public.import_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "import candidates are private" on public.import_candidates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "import drafts are private" on public.import_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
