alter table public.import_review_items
  add column if not exists created_at timestamptz not null default now();

alter table public.import_review_items
  add column if not exists updated_at timestamptz not null default now();

create index if not exists import_review_items_job_idx
  on public.import_review_items (import_job_id, created_at);

create index if not exists import_review_items_user_action_idx
  on public.import_review_items (user_id, planned_action, created_at);

drop trigger if exists import_review_items_set_updated_at on public.import_review_items;
create trigger import_review_items_set_updated_at
  before update on public.import_review_items
  for each row
  execute function public.set_updated_at();
