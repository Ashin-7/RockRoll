alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

drop policy if exists "profiles are private" on public.profiles;

create policy "profiles are readable by owner" on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles can be created by owner as user" on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id and role = 'user');

create or replace function public.is_public_library_admin(user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = user_id
      and profiles.role = 'admin'
  );
$$;

grant execute on function public.is_public_library_admin(uuid) to authenticated;

alter table public.artists
  add column if not exists visibility text not null default 'private';

alter table public.albums
  add column if not exists visibility text not null default 'private';

alter table public.archive_collections
  add column if not exists visibility text not null default 'private';

alter table public.archive_items
  add column if not exists visibility text not null default 'private';

alter table public.external_sources
  add column if not exists visibility text not null default 'private';

alter table public.artists
  drop constraint if exists artists_visibility_check;
alter table public.albums
  drop constraint if exists albums_visibility_check;
alter table public.archive_collections
  drop constraint if exists archive_collections_visibility_check;
alter table public.archive_items
  drop constraint if exists archive_items_visibility_check;
alter table public.external_sources
  drop constraint if exists external_sources_visibility_check;

alter table public.artists
  add constraint artists_visibility_check check (visibility in ('private', 'public'));
alter table public.albums
  add constraint albums_visibility_check check (visibility in ('private', 'public'));
alter table public.archive_collections
  add constraint archive_collections_visibility_check check (visibility in ('private', 'public'));
alter table public.archive_items
  add constraint archive_items_visibility_check check (visibility in ('private', 'public'));
alter table public.external_sources
  add constraint external_sources_visibility_check check (visibility in ('private', 'public'));

grant select on public.artists to anon, authenticated;
grant select on public.albums to anon, authenticated;
grant select on public.archive_collections to anon, authenticated;
grant select on public.archive_items to anon, authenticated;
grant select on public.external_sources to anon, authenticated;
grant insert, update, delete on public.artists to authenticated;
grant insert, update, delete on public.albums to authenticated;
grant insert, update, delete on public.archive_collections to authenticated;
grant insert, update, delete on public.archive_items to authenticated;
grant insert, update, delete on public.external_sources to authenticated;

drop policy if exists "artists are private" on public.artists;
create policy "artists are public or owned for select" on public.artists
  for select
  to anon, authenticated
  using (visibility = 'public' or (select auth.uid()) = user_id);
create policy "artists private owner or public admin insert" on public.artists
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "artists private owner or public admin update" on public.artists
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "artists owner or admin delete" on public.artists
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())));

drop policy if exists "albums are private" on public.albums;
create policy "albums are public or owned for select" on public.albums
  for select
  to anon, authenticated
  using (visibility = 'public' or (select auth.uid()) = user_id);
create policy "albums private owner or public admin insert" on public.albums
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "albums private owner or public admin update" on public.albums
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "albums owner or admin delete" on public.albums
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())));

drop policy if exists "external sources are private" on public.external_sources;
create policy "external sources are public or owned for select" on public.external_sources
  for select
  to anon, authenticated
  using (visibility = 'public' or (select auth.uid()) = user_id);
create policy "external sources private owner or public admin insert" on public.external_sources
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "external sources private owner or public admin update" on public.external_sources
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "external sources owner or admin delete" on public.external_sources
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())));

drop policy if exists "archive collections are private" on public.archive_collections;
create policy "archive collections are public or owned for select" on public.archive_collections
  for select
  to anon, authenticated
  using (visibility = 'public' or (select auth.uid()) = user_id);
create policy "archive collections private owner or public admin insert" on public.archive_collections
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "archive collections private owner or public admin update" on public.archive_collections
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and (visibility = 'private' or public.is_public_library_admin((select auth.uid()))));
create policy "archive collections owner or admin delete" on public.archive_collections
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())));

create policy "archive items are public for anon select" on public.archive_items
  for select
  to anon, authenticated
  using (visibility = 'public' or (select auth.uid()) = user_id);

drop policy if exists "archive items are private for insert" on public.archive_items;
drop policy if exists "archive items are private for update" on public.archive_items;
drop policy if exists "archive items are private for delete" on public.archive_items;

create policy "archive items private owner or public admin insert" on public.archive_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (visibility = 'private' or public.is_public_library_admin((select auth.uid())))
    and exists (
      select 1
      from public.archive_collections
      where archive_collections.id = archive_items.collection_id
        and archive_collections.user_id = (select auth.uid())
    )
    and (
      (entity_type = 'artist' and exists (
        select 1 from public.artists where artists.id = archive_items.entity_id and artists.user_id = (select auth.uid())
      ))
      or (entity_type = 'album' and exists (
        select 1 from public.albums where albums.id = archive_items.entity_id and albums.user_id = (select auth.uid())
      ))
      or (entity_type = 'song' and exists (
        select 1 from public.songs where songs.id = archive_items.entity_id and songs.user_id = (select auth.uid())
      ))
    )
  );

create policy "archive items private owner or public admin update" on public.archive_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())))
  with check (
    (select auth.uid()) = user_id
    and (visibility = 'private' or public.is_public_library_admin((select auth.uid())))
    and exists (
      select 1
      from public.archive_collections
      where archive_collections.id = archive_items.collection_id
        and archive_collections.user_id = (select auth.uid())
    )
    and (
      (entity_type = 'artist' and exists (
        select 1 from public.artists where artists.id = archive_items.entity_id and artists.user_id = (select auth.uid())
      ))
      or (entity_type = 'album' and exists (
        select 1 from public.albums where albums.id = archive_items.entity_id and albums.user_id = (select auth.uid())
      ))
      or (entity_type = 'song' and exists (
        select 1 from public.songs where songs.id = archive_items.entity_id and songs.user_id = (select auth.uid())
      ))
    )
  );

create policy "archive items owner or admin delete" on public.archive_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_public_library_admin((select auth.uid())));

drop policy if exists "import jobs are private" on public.import_jobs;
create policy "import jobs admin private" on public.import_jobs
  for all
  to authenticated
  using ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

drop policy if exists "import candidates are private" on public.import_candidates;
create policy "import candidates admin private" on public.import_candidates
  for all
  to authenticated
  using ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

drop policy if exists "import drafts are private" on public.import_drafts;
create policy "import drafts admin private" on public.import_drafts
  for all
  to authenticated
  using ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())))
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

drop policy if exists "import review items are private for select" on public.import_review_items;
drop policy if exists "import review items are private for insert" on public.import_review_items;
drop policy if exists "import review items are private for update" on public.import_review_items;
drop policy if exists "import review items are private for delete" on public.import_review_items;

create policy "import review items admin private for select" on public.import_review_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

create policy "import review items admin private for insert" on public.import_review_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.is_public_library_admin((select auth.uid()))
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

create policy "import review items admin private for update" on public.import_review_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())))
  with check (
    (select auth.uid()) = user_id
    and public.is_public_library_admin((select auth.uid()))
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

create policy "import review items admin private for delete" on public.import_review_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));
