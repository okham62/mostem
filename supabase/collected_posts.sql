create table if not exists public.collected_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null,
  post_id text not null,
  url text,
  author text,
  author_id text,
  caption text,
  thumbnail_url text,
  media_url text,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  reposts integer default 0,
  quotes integer default 0,
  followers integer default 0,
  engagement_rate numeric,
  views_per_hour numeric,
  spread numeric,
  multiplier numeric,
  grade text,
  status text not null default 'collected',
  collected_by text,
  collected_at timestamptz not null default now(),
  unique (user_id, platform, post_id)
);

create index if not exists collected_posts_user_platform_idx
  on public.collected_posts (user_id, platform, collected_at desc);

alter table public.collected_posts enable row level security;

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null default 'threads',
  username text not null,
  display_name text,
  intro text,
  topics text[] default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, platform, username)
);

create index if not exists connected_accounts_user_idx
  on public.connected_accounts (user_id, platform);

alter table public.connected_accounts enable row level security;
