-- Blog Hub automation tables (run in Supabase SQL editor)

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  keyword text not null default '',
  mode text not null default 'seo' check (mode in ('seo', 'home', 'product', 'folder')),
  title text not null default '',
  body_html text not null default '',
  body_markdown text not null default '',
  tags text[] not null default '{}',
  images jsonb not null default '[]'::jsonb,
  product jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'failed')),
  provider text not null default 'wordpress'
    check (provider in ('wordpress', 'tistory', 'naver', 'none')),
  published_url text,
  scheduled_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_user_created_idx
  on public.blog_posts (user_id, created_at desc);

create table if not exists public.blog_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('wordpress', 'tistory', 'naver')),
  site_url text not null default '',
  username text not null default '',
  app_password text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider, site_url)
);

create table if not exists public.blog_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  keyword text not null default '',
  mode text not null default 'seo',
  provider text not null default 'wordpress',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  post_id uuid references public.blog_posts(id) on delete set null,
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists blog_jobs_status_created_idx
  on public.blog_jobs (status, created_at desc);

alter table public.blog_posts enable row level security;
alter table public.blog_accounts enable row level security;
alter table public.blog_jobs enable row level security;
