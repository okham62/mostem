-- Blog Hub local agent: category schedules + folder watchers
-- Run in Supabase SQL editor after blog_hub.sql

create table if not exists public.blog_category_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid references public.blog_accounts(id) on delete set null,
  category_name text not null,
  blog_id text not null default '',
  open_dow smallint not null check (open_dow between 0 and 6),
  open_time text not null default '17:00',
  close_dow smallint not null check (close_dow between 0 and 6),
  close_time text not null default '21:00',
  timezone text not null default 'Asia/Seoul',
  enabled boolean not null default true,
  last_open_at timestamptz,
  last_close_at timestamptz,
  last_error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_category_schedules_user_idx
  on public.blog_category_schedules (user_id, enabled);

create table if not exists public.blog_folder_watchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  local_path text not null,
  label text not null default '',
  mode text not null default 'seo' check (mode in ('seo', 'home', 'product', 'folder')),
  enabled boolean not null default true,
  last_scan_at timestamptz,
  last_batch_key text,
  last_error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_path)
);

create index if not exists blog_folder_watchers_user_idx
  on public.blog_folder_watchers (user_id, enabled);

alter table public.blog_category_schedules enable row level security;
alter table public.blog_folder_watchers enable row level security;

-- Allow folder mode on blog_posts if constraint exists from earlier migration
do $$
begin
  alter table public.blog_posts drop constraint if exists blog_posts_mode_check;
exception when undefined_object then null;
end $$;

alter table public.blog_posts
  drop constraint if exists blog_posts_mode_check;

alter table public.blog_posts
  add constraint blog_posts_mode_check
  check (mode in ('seo', 'home', 'product', 'folder'));
