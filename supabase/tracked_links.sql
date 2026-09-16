-- Link conversion / tracking (Mostem)
create table if not exists public.link_settings (
  user_id uuid primary key,
  prefix text not null default 'm',
  display_name text,
  channel_id text not null default '기본값',
  profile_slug text unique,
  profile_blocks jsonb not null default '[]'::jsonb,
  hotdeal_slug text unique,
  hotdeal_name text,
  hotdeal_intro text,
  hotdeal_categories text[] not null default '{}',
  hotdeal_published boolean not null default false,
  hotdeal_theme text not null default 'mostem',
  hotdeal_bg text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_settings_prefix_format check (prefix ~ '^[a-z0-9]{1,12}$'),
  constraint link_settings_profile_slug_format check (
    profile_slug is null or profile_slug ~ '^[a-z0-9-]{3,30}$'
  ),
  constraint link_settings_hotdeal_slug_format check (
    hotdeal_slug is null or hotdeal_slug ~ '^[a-z0-9-]{3,30}$'
  )
);

create unique index if not exists link_settings_prefix_uidx
  on public.link_settings (prefix);

create table if not exists public.tracked_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prefix text not null,
  code text not null,
  destination_url text not null,
  title text not null default '',
  og_image_url text,
  platform text not null default 'other',
  channel text not null default '기본값',
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (prefix, code)
);

create index if not exists tracked_links_user_created_idx
  on public.tracked_links (user_id, created_at desc);

create index if not exists tracked_links_user_clicks_idx
  on public.tracked_links (user_id, click_count desc);

alter table public.link_settings enable row level security;
alter table public.tracked_links enable row level security;
