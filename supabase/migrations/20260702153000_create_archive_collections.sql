create table public.archive_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source text not null default 'manual',
  source_url text not null default '',
  description text not null default '',
  collection_type text not null default 'album_rank',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.archive_collections(id) on delete cascade,
  entity_type text not null check (entity_type in ('artist', 'album', 'song')),
  entity_id uuid not null,
  display_title text not null,
  position integer check (position is null or position > 0),
  note text not null default '',
  external_source text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, entity_type, entity_id)
);

create index archive_collections_user_updated_idx on public.archive_collections (user_id, updated_at desc);
create index archive_items_collection_position_idx on public.archive_items (collection_id, position);
create index archive_items_user_entity_idx on public.archive_items (user_id, entity_type, entity_id);

alter table public.archive_collections enable row level security;
alter table public.archive_items enable row level security;

drop trigger if exists archive_collections_set_updated_at on public.archive_collections;
create trigger archive_collections_set_updated_at
  before update on public.archive_collections
  for each row
  execute function public.set_updated_at();

drop trigger if exists archive_items_set_updated_at on public.archive_items;
create trigger archive_items_set_updated_at
  before update on public.archive_items
  for each row
  execute function public.set_updated_at();

create policy "archive collections are private" on public.archive_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "archive items are private for select" on public.archive_items
  for select using (auth.uid() = user_id);

create policy "archive items are private for insert" on public.archive_items
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.archive_collections
      where archive_collections.id = archive_items.collection_id
        and archive_collections.user_id = auth.uid()
    )
    and (
      (
        entity_type = 'artist'
        and exists (
          select 1
          from public.artists
          where artists.id = archive_items.entity_id
            and artists.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'album'
        and exists (
          select 1
          from public.albums
          where albums.id = archive_items.entity_id
            and albums.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'song'
        and exists (
          select 1
          from public.songs
          where songs.id = archive_items.entity_id
            and songs.user_id = auth.uid()
        )
      )
    )
  );

create policy "archive items are private for update" on public.archive_items
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.archive_collections
      where archive_collections.id = archive_items.collection_id
        and archive_collections.user_id = auth.uid()
    )
    and (
      (
        entity_type = 'artist'
        and exists (
          select 1
          from public.artists
          where artists.id = archive_items.entity_id
            and artists.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'album'
        and exists (
          select 1
          from public.albums
          where albums.id = archive_items.entity_id
            and albums.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'song'
        and exists (
          select 1
          from public.songs
          where songs.id = archive_items.entity_id
            and songs.user_id = auth.uid()
        )
      )
    )
  );

create policy "archive items are private for delete" on public.archive_items
  for delete using (auth.uid() = user_id);
