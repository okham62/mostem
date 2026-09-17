-- Extensible partner API credentials (JSONB). Run in Supabase SQL editor.
-- Shape: { "coupang": { accessKey, secretKey, connectedAt }, "toss": { accessKey, secretKey, publisherId, connectedAt }, ... }
alter table public.link_settings
  add column if not exists partner_apis jsonb not null default '{}'::jsonb;
