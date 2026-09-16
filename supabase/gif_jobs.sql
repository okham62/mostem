-- Per-user GIF conversion history (Mostem)
create table if not exists public.gif_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('video', 'image', 'slideshow')),
  label text not null default '',
  settings jsonb not null default '{}'::jsonb,
  source_paths text[] not null default '{}',
  source_names text[] not null default '{}',
  result_path text,
  result_bytes integer,
  width integer,
  height integer,
  frames integer,
  status text not null default 'done',
  created_at timestamptz not null default now()
);

create index if not exists gif_jobs_user_created_idx
  on public.gif_jobs (user_id, created_at desc);

alter table public.gif_jobs enable row level security;
