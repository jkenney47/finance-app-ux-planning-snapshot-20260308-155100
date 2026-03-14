create extension if not exists "uuid-ossp";

create table if not exists public.policy_packs (
  id uuid primary key default uuid_generate_v4(),
  domain text not null,
  region text not null,
  jurisdiction text not null default 'federal',
  version integer not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  pack jsonb not null,
  source jsonb,
  status text not null default 'draft',
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_policy_packs_lookup
  on public.policy_packs (region, jurisdiction, domain, effective_from desc);

alter table public.policy_packs enable row level security;

drop policy if exists "Policy packs are readable" on public.policy_packs;
create policy "Policy packs are readable"
  on public.policy_packs
  for select
  using (true);

drop policy if exists "Service role manages policy packs" on public.policy_packs;
create policy "Service role manages policy packs"
  on public.policy_packs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.rule_packs (
  id uuid primary key default uuid_generate_v4(),
  region text not null,
  version integer not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  pack jsonb not null,
  source jsonb,
  status text not null default 'draft',
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_rule_packs_lookup
  on public.rule_packs (region, effective_from desc);

alter table public.rule_packs enable row level security;

drop policy if exists "Rule packs are readable" on public.rule_packs;
create policy "Rule packs are readable"
  on public.rule_packs
  for select
  using (true);

drop policy if exists "Service role manages rule packs" on public.rule_packs;
create policy "Service role manages rule packs"
  on public.rule_packs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
