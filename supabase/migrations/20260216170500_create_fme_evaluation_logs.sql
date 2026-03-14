create extension if not exists "uuid-ossp";

create table if not exists public.fme_evaluation_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  facts_hash text,
  facts_summary jsonb,
  policy_versions jsonb not null,
  rule_version integer,
  output_summary jsonb not null,
  trace jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_fme_evaluation_logs_user_created
  on public.fme_evaluation_logs (user_id, created_at desc);

alter table public.fme_evaluation_logs enable row level security;

drop policy if exists "Users read own fme evaluation logs" on public.fme_evaluation_logs;
create policy "Users read own fme evaluation logs"
  on public.fme_evaluation_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own fme evaluation logs" on public.fme_evaluation_logs;
create policy "Users insert own fme evaluation logs"
  on public.fme_evaluation_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Service role manages fme evaluation logs" on public.fme_evaluation_logs;
create policy "Service role manages fme evaluation logs"
  on public.fme_evaluation_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
