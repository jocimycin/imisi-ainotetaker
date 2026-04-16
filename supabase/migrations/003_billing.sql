-- Imisi v0.2 — Stripe billing

alter table public.users
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text
    check (stripe_subscription_status in ('active', 'past_due', 'canceled', 'trialing', null)),
  add column if not exists plan_period_end timestamptz;

-- Monthly usage tracking for free tier enforcement
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,        -- first day of the billing month
  meetings_count integer not null default 0,
  unique (user_id, period_start)
);

alter table public.usage enable row level security;

create policy "usage_own" on public.usage
  for all using (auth.uid() = user_id);
