create table if not exists public.policy_ops_audits (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid,
  action text not null,
  domain text not null,
  region text not null default 'US',
  jurisdiction text not null default 'federal',
  source_version integer,
  target_version integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_policy_ops_audits_lookup
  on public.policy_ops_audits (domain, created_at desc);

alter table public.policy_ops_audits enable row level security;

drop policy if exists "Policy ops audits are readable" on public.policy_ops_audits;
create policy "Policy ops audits are readable"
  on public.policy_ops_audits
  for select
  using (true);

drop policy if exists "Service role manages policy ops audits" on public.policy_ops_audits;
create policy "Service role manages policy ops audits"
  on public.policy_ops_audits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
