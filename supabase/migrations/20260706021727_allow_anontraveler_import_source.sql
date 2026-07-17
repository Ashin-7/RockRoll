alter table public.import_jobs
  drop constraint if exists import_jobs_source_name_check;

alter table public.import_jobs
  add constraint import_jobs_source_name_check
  check (source_name in ('musicbrainz', 'discogs', 'spotify', 'anontraveler'));

alter table public.external_sources
  drop constraint if exists external_sources_source_name_check;

alter table public.external_sources
  add constraint external_sources_source_name_check
  check (source_name in ('musicbrainz', 'discogs', 'spotify', 'anontraveler'));
