-- Admin Dashboard Upgrade — Analytics, AI & Fraud Detection
-- Creates: analytics_events, login_logs, image_hashes, fraud_flags, vendor_scores

-- Enable UUID generator (Supabase usually has it; safe if already enabled)
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- analytics_events
-- ─────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  pg_id uuid references public.listings(id) on delete set null,
  event_type text not null,
  search_query text,
  device_type text,
  browser text,
  ip_address text,
  city text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ae_event_type on public.analytics_events(event_type);
create index if not exists idx_ae_user_id on public.analytics_events(user_id);
create index if not exists idx_ae_created_at on public.analytics_events(created_at desc);
create index if not exists idx_ae_city on public.analytics_events(city);

-- ─────────────────────────────────────────────────────────────
-- login_logs
-- ─────────────────────────────────────────────────────────────
create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  device_type text,
  browser text,
  user_agent text,
  ip_address text,
  city text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ll_user_id on public.login_logs(user_id);
create index if not exists idx_ll_created_at on public.login_logs(created_at desc);
create index if not exists idx_ll_ip on public.login_logs(ip_address);

-- ─────────────────────────────────────────────────────────────
-- image_hashes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.image_hashes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  vendor_id uuid references public.profiles(id) on delete set null,
  image_url text,
  hash_value text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ih_hash on public.image_hashes(hash_value);
create index if not exists idx_ih_listing on public.image_hashes(listing_id);

-- ─────────────────────────────────────────────────────────────
-- fraud_flags
-- ─────────────────────────────────────────────────────────────
create table if not exists public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  flag_type text not null,
  severity text not null default 'low',
  status text not null default 'open',
  reason text not null,
  user_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ff_status on public.fraud_flags(status);
create index if not exists idx_ff_type on public.fraud_flags(flag_type);
create index if not exists idx_ff_created_at on public.fraud_flags(created_at desc);

-- Deduplicate common flags (best-effort)
create unique index if not exists uq_ff_dedupe
  on public.fraud_flags(flag_type, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid), reason);

-- ─────────────────────────────────────────────────────────────
-- vendor_scores (optional persistence)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.vendor_scores (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  period_days int not null default 30,
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_vs_vendor_period on public.vendor_scores(vendor_id, period_days);

-- ─────────────────────────────────────────────────────────────
-- RLS helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

alter table public.analytics_events enable row level security;
alter table public.login_logs enable row level security;
alter table public.image_hashes enable row level security;
alter table public.fraud_flags enable row level security;
alter table public.vendor_scores enable row level security;

-- analytics_events policies
drop policy if exists "ae_insert_any_authed" on public.analytics_events;
create policy "ae_insert_any_authed"
on public.analytics_events for insert
to authenticated
with check (true);

drop policy if exists "ae_read_admin_only" on public.analytics_events;
create policy "ae_read_admin_only"
on public.analytics_events for select
to authenticated
using (public.is_admin());

-- login_logs policies
drop policy if exists "ll_insert_any_authed" on public.login_logs;
create policy "ll_insert_any_authed"
on public.login_logs for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "ll_read_admin_only" on public.login_logs;
create policy "ll_read_admin_only"
on public.login_logs for select
to authenticated
using (public.is_admin());

-- image_hashes policies
drop policy if exists "ih_insert_vendor_or_admin" on public.image_hashes;
create policy "ih_insert_vendor_or_admin"
on public.image_hashes for insert
to authenticated
with check (vendor_id = auth.uid() or public.is_admin());

drop policy if exists "ih_read_admin_only" on public.image_hashes;
create policy "ih_read_admin_only"
on public.image_hashes for select
to authenticated
using (public.is_admin());

-- fraud_flags policies
drop policy if exists "ff_insert_admin_only" on public.fraud_flags;
create policy "ff_insert_admin_only"
on public.fraud_flags for insert
to authenticated
with check (public.is_admin());

drop policy if exists "ff_read_admin_only" on public.fraud_flags;
create policy "ff_read_admin_only"
on public.fraud_flags for select
to authenticated
using (public.is_admin());

drop policy if exists "ff_update_admin_only" on public.fraud_flags;
create policy "ff_update_admin_only"
on public.fraud_flags for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- vendor_scores policies
drop policy if exists "vs_upsert_admin_only" on public.vendor_scores;
create policy "vs_upsert_admin_only"
on public.vendor_scores for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

