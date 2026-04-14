-- Imisi v0.1 — Initial schema migration
-- Run: supabase db push

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- USERS
-- =====================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  created_at timestamptz not null default now()
);

-- Auto-create user row on Supabase Auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- INTEGRATIONS
-- =====================
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft', 'zoom', 'zoho')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- =====================
-- MEETINGS
-- =====================
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  platform text not null check (platform in ('zoom', 'teams', 'meet', 'zoho', 'other')),
  platform_meeting_id text,
  join_url text,
  bot_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'joining', 'live', 'processing', 'complete', 'failed')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  attendees jsonb not null default '[]',
  recording_url text,
  created_at timestamptz not null default now()
);

create index meetings_user_id_idx on public.meetings(user_id);
create index meetings_status_idx on public.meetings(status);
create index meetings_started_at_idx on public.meetings(started_at desc);

-- =====================
-- TRANSCRIPTS
-- =====================
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  raw_text text,
  segments jsonb not null default '[]',
  word_count integer,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  unique (meeting_id)
);

-- =====================
-- SUMMARIES
-- =====================
create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  tldr text,
  key_points jsonb not null default '[]',
  decisions jsonb not null default '[]',
  topics jsonb not null default '[]',
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  model_used text,
  created_at timestamptz not null default now(),
  unique (meeting_id)
);

-- =====================
-- ACTION ITEMS
-- =====================
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  assignee_name text,
  assignee_email text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  source_quote text,
  external_task_id text,
  created_at timestamptz not null default now()
);

create index action_items_user_id_idx on public.action_items(user_id);
create index action_items_status_idx on public.action_items(status);
create index action_items_due_date_idx on public.action_items(due_date);

-- =====================
-- EMAIL LOGS
-- =====================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id),
  recipient_email text not null,
  status text not null check (status in ('sent', 'failed', 'bounced')),
  sent_at timestamptz
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table public.users enable row level security;
alter table public.integrations enable row level security;
alter table public.meetings enable row level security;
alter table public.transcripts enable row level security;
alter table public.summaries enable row level security;
alter table public.action_items enable row level security;
alter table public.email_logs enable row level security;

-- Users: own row only
create policy "users_own_row" on public.users
  for all using (auth.uid() = id);

-- Integrations: own rows only
create policy "integrations_own" on public.integrations
  for all using (auth.uid() = user_id);

-- Meetings: own rows only
create policy "meetings_own" on public.meetings
  for all using (auth.uid() = user_id);

-- Transcripts: via meeting ownership
create policy "transcripts_via_meeting" on public.transcripts
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id
        and m.user_id = auth.uid()
    )
  );

-- Summaries: via meeting ownership
create policy "summaries_via_meeting" on public.summaries
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = summaries.meeting_id
        and m.user_id = auth.uid()
    )
  );

-- Action items: own rows only
create policy "action_items_own" on public.action_items
  for all using (auth.uid() = user_id);

-- Email logs: via meeting ownership
create policy "email_logs_via_meeting" on public.email_logs
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = email_logs.meeting_id
        and m.user_id = auth.uid()
    )
  );
