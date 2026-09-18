-- Profile design studio extras (style / block / settings)
alter table public.link_settings
  add column if not exists profile_design jsonb not null default '{}'::jsonb;
