-- users 테이블
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  name text,
  image text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now() not null
);

-- platform_connections 테이블
create table if not exists public.platform_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  channel_name text not null default '',
  channel_id text not null default '',
  created_at timestamptz default now() not null,
  unique(user_id, platform)
);

-- uploads 테이블
create table if not exists public.uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  tags text[] default '{}',
  type text not null check (type in ('long', 'short')),
  platforms text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'uploading', 'completed', 'failed', 'scheduled')),
  platform_statuses jsonb default '{}',
  platform_urls jsonb default '{}',
  scheduled_at timestamptz,
  file_url text,
  thumbnail_url text,
  created_at timestamptz default now() not null
);

-- templates 테이블
create table if not exists public.templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description_format text not null default '',
  default_tags text[] default '{}',
  created_at timestamptz default now() not null
);

-- RLS 활성화
alter table public.users enable row level security;
alter table public.platform_connections enable row level security;
alter table public.uploads enable row level security;
alter table public.templates enable row level security;

-- users RLS 정책
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Admins can view all users" on public.users
  for select using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update all users" on public.users
  for update using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- platform_connections RLS 정책
create policy "Users can manage own connections" on public.platform_connections
  for all using (auth.uid() = user_id);

-- uploads RLS 정책
create policy "Users can manage own uploads" on public.uploads
  for all using (auth.uid() = user_id);

-- templates RLS 정책
create policy "Users can manage own templates" on public.templates
  for all using (auth.uid() = user_id);

-- 신규 가입 시 users 테이블에 자동 삽입하는 함수
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, image)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 등록
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
