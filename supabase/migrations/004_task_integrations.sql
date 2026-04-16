-- Imisi v0.2 — Task integrations (Notion, Asana, Jira)

-- Extend provider check constraint
alter table public.integrations
  drop constraint if exists integrations_provider_check;

alter table public.integrations
  add constraint integrations_provider_check
  check (provider in ('google', 'microsoft', 'zoom', 'zoho', 'notion', 'asana', 'jira'));

-- Task push config + toggle per integration
alter table public.integrations
  add column if not exists task_push_enabled boolean not null default false,
  add column if not exists config jsonb not null default '{}';
  -- google/microsoft: calendar_sync_enabled already covers them
  -- notion: config -> { database_id }
  -- asana:  config -> { project_id, workspace_id }
  -- jira:   config -> { cloud_id, project_key, cloud_url }

-- Track push status per action item
alter table public.action_items
  add column if not exists push_provider text,
  add column if not exists push_status text check (push_status in ('pending', 'pushed', 'failed', null)),
  add column if not exists push_error text;
