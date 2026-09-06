-- Run once if collected_posts already exists without this column.
alter table public.collected_posts
  add column if not exists scheduled_at timestamptz;
