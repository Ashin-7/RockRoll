drop policy if exists "artists private owner or public admin insert" on public.artists;
drop policy if exists "artists private owner or public admin update" on public.artists;
drop policy if exists "artists owner or admin delete" on public.artists;

create policy "artists admin insert" on public.artists
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

create policy "artists admin update" on public.artists
  for update
  to authenticated
  using (public.is_public_library_admin((select auth.uid())))
  with check (public.is_public_library_admin((select auth.uid())));

create policy "artists admin delete" on public.artists
  for delete
  to authenticated
  using (public.is_public_library_admin((select auth.uid())));

drop policy if exists "albums private owner or public admin insert" on public.albums;
drop policy if exists "albums private owner or public admin update" on public.albums;
drop policy if exists "albums owner or admin delete" on public.albums;

create policy "albums admin insert" on public.albums
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

create policy "albums admin update" on public.albums
  for update
  to authenticated
  using (public.is_public_library_admin((select auth.uid())))
  with check (public.is_public_library_admin((select auth.uid())));

create policy "albums admin delete" on public.albums
  for delete
  to authenticated
  using (public.is_public_library_admin((select auth.uid())));

drop policy if exists "external sources private owner or public admin insert" on public.external_sources;
drop policy if exists "external sources private owner or public admin update" on public.external_sources;
drop policy if exists "external sources owner or admin delete" on public.external_sources;

create policy "external sources admin insert" on public.external_sources
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

create policy "external sources admin update" on public.external_sources
  for update
  to authenticated
  using (public.is_public_library_admin((select auth.uid())))
  with check (public.is_public_library_admin((select auth.uid())));

create policy "external sources admin delete" on public.external_sources
  for delete
  to authenticated
  using (public.is_public_library_admin((select auth.uid())));

drop policy if exists "archive collections private owner or public admin insert" on public.archive_collections;
drop policy if exists "archive collections private owner or public admin update" on public.archive_collections;
drop policy if exists "archive collections owner or admin delete" on public.archive_collections;

create policy "archive collections admin insert" on public.archive_collections
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and public.is_public_library_admin((select auth.uid())));

create policy "archive collections admin update" on public.archive_collections
  for update
  to authenticated
  using (public.is_public_library_admin((select auth.uid())))
  with check (public.is_public_library_admin((select auth.uid())));

create policy "archive collections admin delete" on public.archive_collections
  for delete
  to authenticated
  using (public.is_public_library_admin((select auth.uid())));

drop policy if exists "archive items private owner or public admin insert" on public.archive_items;
drop policy if exists "archive items private owner or public admin update" on public.archive_items;
drop policy if exists "archive items owner or admin delete" on public.archive_items;

create policy "archive items admin insert" on public.archive_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.is_public_library_admin((select auth.uid()))
    and exists (
      select 1
      from public.archive_collections
      where archive_collections.id = archive_items.collection_id
        and (
          archive_collections.visibility = 'public'
          or archive_collections.user_id = (select auth.uid())
        )
    )
    and (
      (entity_type = 'artist' and exists (
        select 1
        from public.artists
        where artists.id = archive_items.entity_id
          and (artists.visibility = 'public' or artists.user_id = (select auth.uid()))
      ))
      or (entity_type = 'album' and exists (
        select 1
        from public.albums
        where albums.id = archive_items.entity_id
          and (albums.visibility = 'public' or albums.user_id = (select auth.uid()))
      ))
      or (entity_type = 'song' and exists (
        select 1
        from public.songs
        where songs.id = archive_items.entity_id
          and songs.user_id = (select auth.uid())
      ))
    )
  );

create policy "archive items admin update" on public.archive_items
  for update
  to authenticated
  using (public.is_public_library_admin((select auth.uid())))
  with check (
    public.is_public_library_admin((select auth.uid()))
    and exists (
      select 1
      from public.archive_collections
      where archive_collections.id = archive_items.collection_id
        and (
          archive_collections.visibility = 'public'
          or archive_collections.user_id = (select auth.uid())
        )
    )
    and (
      (entity_type = 'artist' and exists (
        select 1
        from public.artists
        where artists.id = archive_items.entity_id
          and (artists.visibility = 'public' or artists.user_id = (select auth.uid()))
      ))
      or (entity_type = 'album' and exists (
        select 1
        from public.albums
        where albums.id = archive_items.entity_id
          and (albums.visibility = 'public' or albums.user_id = (select auth.uid()))
      ))
      or (entity_type = 'song' and exists (
        select 1
        from public.songs
        where songs.id = archive_items.entity_id
          and songs.user_id = (select auth.uid())
      ))
    )
  );

create policy "archive items admin delete" on public.archive_items
  for delete
  to authenticated
  using (public.is_public_library_admin((select auth.uid())));
