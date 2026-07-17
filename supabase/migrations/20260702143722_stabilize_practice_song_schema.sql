create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row
  execute function public.set_updated_at();

drop trigger if exists practice_sessions_set_updated_at on public.practice_sessions;
create trigger practice_sessions_set_updated_at
  before update on public.practice_sessions
  for each row
  execute function public.set_updated_at();

drop policy if exists "practice sessions are private" on public.practice_sessions;

create policy "practice sessions are private for select" on public.practice_sessions
  for select using (auth.uid() = user_id);

create policy "practice sessions are private for insert" on public.practice_sessions
  for insert with check (
    auth.uid() = user_id
    and (
      song_id is null
      or exists (
        select 1
        from public.songs
        where songs.id = practice_sessions.song_id
          and songs.user_id = auth.uid()
      )
    )
  );

create policy "practice sessions are private for update" on public.practice_sessions
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      song_id is null
      or exists (
        select 1
        from public.songs
        where songs.id = practice_sessions.song_id
          and songs.user_id = auth.uid()
      )
    )
  );

create policy "practice sessions are private for delete" on public.practice_sessions
  for delete using (auth.uid() = user_id);
