alter table public.practice_sessions
  add column if not exists goal_duration_minutes integer check (
    goal_duration_minutes is null
    or goal_duration_minutes > 0
  ),
  add column if not exists completion_percent integer check (
    completion_percent is null
    or completion_percent between 0 and 100
  ),
  add column if not exists tags text[] not null default '{}'::text[];
