alter table public.external_sources
  drop constraint if exists external_sources_entity_type_check;

alter table public.external_sources
  add constraint external_sources_entity_type_check
  check (entity_type in ('artist', 'album', 'song', 'genre', 'archive_collection', 'archive_item', 'media_asset'));

alter table public.external_sources
  drop constraint if exists external_sources_user_id_source_name_source_id_key;

alter table public.external_sources
  add constraint external_sources_user_source_entity_unique
  unique (user_id, source_name, source_id, entity_type);

create table public.import_review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  import_candidate_id uuid references public.import_candidates(id) on delete cascade,
  entity_type text not null check (
    entity_type in ('artist', 'album', 'song', 'archive_collection', 'archive_item', 'media_asset')
  ),
  source_name text not null check (source_name in ('musicbrainz', 'discogs', 'spotify', 'anontraveler')),
  source_id text not null,
  source_url text,
  display_title text not null default '',
  planned_action text not null default 'create' check (
    planned_action in ('create', 'match_existing', 'skip', 'failed')
  ),
  target_entity_id uuid,
  skip_reason text not null default '',
  error_message text,
  review_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_name, source_id, entity_type)
);

create index import_review_items_job_idx
  on public.import_review_items (import_job_id, created_at);

create index import_review_items_user_action_idx
  on public.import_review_items (user_id, planned_action, created_at);

alter table public.import_review_items enable row level security;

drop trigger if exists import_review_items_set_updated_at on public.import_review_items;
create trigger import_review_items_set_updated_at
  before update on public.import_review_items
  for each row
  execute function public.set_updated_at();

grant select, insert, update, delete on public.import_review_items to authenticated;

create policy "import review items are private for select" on public.import_review_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "import review items are private for insert" on public.import_review_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.import_jobs
      where import_jobs.id = import_review_items.import_job_id
        and import_jobs.user_id = (select auth.uid())
    )
    and (
      import_candidate_id is null
      or exists (
        select 1
        from public.import_candidates
        where import_candidates.id = import_review_items.import_candidate_id
          and import_candidates.import_job_id = import_review_items.import_job_id
          and import_candidates.user_id = (select auth.uid())
      )
    )
  );

create policy "import review items are private for update" on public.import_review_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.import_jobs
      where import_jobs.id = import_review_items.import_job_id
        and import_jobs.user_id = (select auth.uid())
    )
    and (
      import_candidate_id is null
      or exists (
        select 1
        from public.import_candidates
        where import_candidates.id = import_review_items.import_candidate_id
          and import_candidates.import_job_id = import_review_items.import_job_id
          and import_candidates.user_id = (select auth.uid())
      )
    )
  );

create policy "import review items are private for delete" on public.import_review_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
