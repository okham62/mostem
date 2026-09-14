-- Add live profile avatar cache for connected publish accounts.
alter table public.connected_accounts
  add column if not exists avatar_url text;
