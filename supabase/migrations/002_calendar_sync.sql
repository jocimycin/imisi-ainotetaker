-- Imisi v0.2 — Calendar sync + token management

-- Track calendar sync state per integration
alter table public.integrations
  add column if not exists calendar_sync_enabled boolean not null default false,
  add column if not exists calendar_last_synced_at timestamptz,
  add column if not exists calendar_sync_cursor text; -- nextSyncToken (Google) | deltaLink (MS Graph)

-- Prevent duplicate bot dispatches for the same calendar event
alter table public.meetings
  add column if not exists calendar_event_id text,
  add column if not exists calendar_source text check (calendar_source in ('google', 'microsoft', null));

create unique index if not exists meetings_calendar_event_unique
  on public.meetings(user_id, calendar_event_id)
  where calendar_event_id is not null;
