-- Habit Tracker schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).

create table if not exists public.habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  type text not null check (type in ('binary', 'count')),
  target_count integer not null,
  created_at timestamptz not null,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_completed_date text,
  completions jsonb not null default '{}'::jsonb,
  reminder_intention text,
  reminder_time text,
  reminder_notification_id text,
  archived_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  kind text not null,
  start_date_key text not null,
  duration_days integer not null,
  completed_days jsonb not null default '[]'::jsonb,
  status text not null check (status in ('active', 'completed', 'failed')),
  reward_claimed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  permission_status text not null default 'undetermined',
  has_prompted_soft_ask boolean not null default false,
  scheduled_midday_id text,
  scheduled_evening_id text,
  updated_at timestamptz not null default now()
);

-- Public profile info only — the password itself lives solely in Supabase
-- Auth's own protected auth.users table (securely hashed there), never here.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits (user_id);
create index if not exists challenges_user_id_idx on public.challenges (user_id);

alter table public.habits enable row level security;
alter table public.challenges enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users manage their own habits" on public.habits;
create policy "Users manage their own habits" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own challenges" on public.challenges;
create policy "Users manage their own challenges" on public.challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own notification prefs" on public.notification_prefs;
create policy "Users manage their own notification prefs" on public.notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-creates a profile row whenever someone signs up, pulling `name` from
-- the `data` passed to supabase.auth.signUp() (see useAuth.tsx) and email
-- from the new auth user itself. security definer is required here since
-- this runs as a trigger on auth.users, outside any user's own RLS context.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
