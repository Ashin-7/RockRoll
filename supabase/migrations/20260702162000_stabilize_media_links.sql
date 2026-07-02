drop policy if exists "media links are private" on public.media_links;

create policy "media links are private for select" on public.media_links
  for select using (auth.uid() = user_id);

create policy "media links are private for insert" on public.media_links
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.media_assets
      where media_assets.id = media_links.media_asset_id
        and media_assets.user_id = auth.uid()
    )
    and (
      (
        entity_type = 'song'
        and exists (
          select 1
          from public.songs
          where songs.id = media_links.entity_id
            and songs.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'practice_session'
        and exists (
          select 1
          from public.practice_sessions
          where practice_sessions.id = media_links.entity_id
            and practice_sessions.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'artist'
        and exists (
          select 1
          from public.artists
          where artists.id = media_links.entity_id
            and artists.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'album'
        and exists (
          select 1
          from public.albums
          where albums.id = media_links.entity_id
            and albums.user_id = auth.uid()
        )
      )
    )
  );

create policy "media links are private for update" on public.media_links
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.media_assets
      where media_assets.id = media_links.media_asset_id
        and media_assets.user_id = auth.uid()
    )
    and (
      (
        entity_type = 'song'
        and exists (
          select 1
          from public.songs
          where songs.id = media_links.entity_id
            and songs.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'practice_session'
        and exists (
          select 1
          from public.practice_sessions
          where practice_sessions.id = media_links.entity_id
            and practice_sessions.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'artist'
        and exists (
          select 1
          from public.artists
          where artists.id = media_links.entity_id
            and artists.user_id = auth.uid()
        )
      )
      or (
        entity_type = 'album'
        and exists (
          select 1
          from public.albums
          where albums.id = media_links.entity_id
            and albums.user_id = auth.uid()
        )
      )
    )
  );

create policy "media links are private for delete" on public.media_links
  for delete using (auth.uid() = user_id);
