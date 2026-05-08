-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor → New query)
-- Creates all the tables the app needs with row-level security

-- Users (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

-- Events (what the user logged)
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  value float default 1,
  metadata jsonb default '{}',
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Active effects (buffs/debuffs currently on the user)
create table if not exists public.active_effects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  effect_key text not null,
  expires_at timestamptz not null,
  source_event_id uuid references public.events(id) on delete set null,
  stat_deltas jsonb default '{}',
  created_at timestamptz default now()
);

-- Guilds
create table if not exists public.guilds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- Guild members
create table if not exists public.guild_members (
  guild_id uuid references public.guilds(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  primary key (guild_id, user_id)
);

-- Messages (guild chat)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  guild_id uuid references public.guilds(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  type text default 'chat',
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.active_effects enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.messages enable row level security;

-- Users: can only read/write own row
create policy "users_self" on public.users for all using (auth.uid() = id);

-- Events: own rows only
create policy "events_self" on public.events for all using (auth.uid() = user_id);

-- Active effects: own rows only
create policy "effects_self" on public.active_effects for all using (auth.uid() = user_id);

-- Guilds: anyone can read, authenticated can create
create policy "guilds_read" on public.guilds for select using (true);
create policy "guilds_insert" on public.guilds for insert with check (auth.uid() = created_by);

-- Guild members: members can see each other
create policy "members_read" on public.guild_members for select using (
  auth.uid() in (select user_id from public.guild_members gm where gm.guild_id = guild_members.guild_id)
);
create policy "members_insert" on public.guild_members for insert with check (auth.uid() = user_id);

-- Messages: guild members only
create policy "messages_guild" on public.messages for select using (
  auth.uid() in (select user_id from public.guild_members where guild_id = messages.guild_id)
);
create policy "messages_insert" on public.messages for insert with check (
  auth.uid() = user_id and
  auth.uid() in (select user_id from public.guild_members where guild_id = messages.guild_id)
);

-- Auto-create user profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
