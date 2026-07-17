alter table public.albums
  add column cover_url text,
  add column styles text[] not null default '{}'::text[];
