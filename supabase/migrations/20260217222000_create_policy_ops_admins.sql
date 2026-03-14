create table if not exists public.policy_ops_admins (
  user_id uuid primary key,
  active boolean not null default true,
  notes text,
  added_by_user_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_policy_ops_admins_active
  on public.policy_ops_admins (active, created_at desc);

alter table public.policy_ops_admins enable row level security;

drop policy if exists "Policy ops admins are readable" on public.policy_ops_admins;
create policy "Policy ops admins are readable"
  on public.policy_ops_admins
  for select
  using (true);

drop policy if exists "Service role manages policy ops admins" on public.policy_ops_admins;
create policy "Service role manages policy ops admins"
  on public.policy_ops_admins
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
