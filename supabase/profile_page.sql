-- Profile page enhancements (run after tracked_links.sql)

alter table public.link_settings
  add column if not exists profile_published boolean not null default false;

alter table public.link_settings
  add column if not exists profile_simple_address boolean not null default false;

alter table public.link_settings
  add column if not exists profile_avatar_url text;

alter table public.link_settings
  add column if not exists profile_cover_url text;

alter table public.link_settings
  add column if not exists profile_layout text not null default 'cover';

alter table public.link_settings
  add column if not exists profile_bio text;

alter table public.link_settings
  add column if not exists profile_sns jsonb not null default '[]'::jsonb;

alter table public.link_settings
  add column if not exists profile_font_size text not null default 'md';

create table if not exists public.profile_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slug text not null,
  kind text not null check (kind in ('view', 'click')),
  block_id text,
  visitor_key text,
  created_at timestamptz not null default now()
);

create index if not exists profile_events_user_created_idx
  on public.profile_events (user_id, created_at desc);

create index if not exists profile_events_user_kind_created_idx
  on public.profile_events (user_id, kind, created_at desc);

create index if not exists profile_events_dedupe_idx
  on public.profile_events (user_id, kind, visitor_key, created_at desc);

alter table public.profile_events enable row level security;
