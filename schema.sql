-- AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
-- Source of truth: supabase/migrations/*.sql
-- Regenerate with: npm run schema:generate

-- >>> 20250629080000_create_user_push_tokens.sql
-- Migration: Create user_push_tokens table and RLS policies
create extension if not exists "uuid-ossp";

create table if not exists user_push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  last_seen_at timestamptz default now(),
  device_os text
);

alter table user_push_tokens enable row level security;

drop policy if exists "Users read their own tokens" on user_push_tokens;
create policy "Users read their own tokens"
  on user_push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert their own token" on user_push_tokens;
create policy "Users insert their own token"
  on user_push_tokens for insert
  with check (auth.uid() = user_id);
-- <<< 20250629080000_create_user_push_tokens.sql
-- >>> 20250629120000_notify_send_push.sql
-- Enable HTTP extension if not already
create extension if not exists http;

-- Function: fire a POST to the Edge Function
create or replace function public.notify_send_push()
returns trigger
language plpgsql
as $$
declare
  _resp json;
begin
  select content
  into   _resp
  from   http(
           'POST',
           -- Replace <PROJECT-REF> with your Supabase project ref
           'https://<PROJECT-REF>.functions.supabase.co/sendPush',
           'Content-Type: application/json',
           json_build_object('insight_id', new.id)::text
         );

  -- Optional: check _resp for errors and raise if needed
  return new;
end;
$$ security definer;

-- Trigger fires AFTER each insert on insights.
-- Guard bootstrap runs where insights is introduced by a later migration.
do $$
begin
  if to_regclass('public.insights') is not null then
    drop trigger if exists trg_send_push on public.insights;
    create trigger trg_send_push
    after insert on public.insights
    for each row
    execute procedure public.notify_send_push();
  end if;
end
$$;
-- <<< 20250629120000_notify_send_push.sql
-- >>> 20260216170000_create_policy_and_rule_packs.sql
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
-- <<< 20260216170000_create_policy_and_rule_packs.sql
-- >>> 20260216170500_create_fme_evaluation_logs.sql
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
-- <<< 20260216170500_create_fme_evaluation_logs.sql
-- >>> 20260216225500_create_agent_interop_tables.sql
create extension if not exists "uuid-ossp";

create table if not exists public.agent_providers (
  id uuid primary key default uuid_generate_v4(),
  provider_key text not null unique,
  display_name text not null,
  description text,
  endpoint_url text,
  auth_type text not null default 'none',
  capabilities text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (auth_type in ('none', 'bearer_env', 'api_key_env')),
  check (status in ('active', 'inactive'))
);

create index if not exists idx_agent_providers_status
  on public.agent_providers (status, provider_key);

insert into public.agent_providers (
  provider_key,
  display_name,
  description,
  endpoint_url,
  auth_type,
  capabilities,
  metadata,
  status
)
values (
  'mock_agent_bridge',
  'Mock Agent Bridge',
  'Default dry-run provider for agent interoperability scaffolding.',
  null,
  'none',
  array['explain', 'plan', 'summarize'],
  '{"mode":"dry_run"}'::jsonb,
  'active'
)
on conflict (provider_key) do nothing;

alter table public.agent_providers enable row level security;

drop policy if exists "Agent providers are readable" on public.agent_providers;
create policy "Agent providers are readable"
  on public.agent_providers
  for select
  using (true);

drop policy if exists "Service role manages agent providers" on public.agent_providers;
create policy "Service role manages agent providers"
  on public.agent_providers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.agent_invocation_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  provider_key text not null references public.agent_providers(provider_key) on delete restrict,
  capability text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  status text not null,
  latency_ms integer,
  error_message text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_agent_invocation_logs_user_created
  on public.agent_invocation_logs (user_id, created_at desc);

create index if not exists idx_agent_invocation_logs_provider_created
  on public.agent_invocation_logs (provider_key, created_at desc);

alter table public.agent_invocation_logs enable row level security;

drop policy if exists "Users read own agent invocation logs" on public.agent_invocation_logs;
create policy "Users read own agent invocation logs"
  on public.agent_invocation_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Service role manages agent invocation logs" on public.agent_invocation_logs;
create policy "Service role manages agent invocation logs"
  on public.agent_invocation_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
-- <<< 20260216225500_create_agent_interop_tables.sql
-- >>> 20260217193000_add_fme_log_signatures.sql
alter table public.fme_evaluation_logs
  add column if not exists evaluation_signature text;

alter table public.fme_evaluation_logs
  add column if not exists artifact_signature text;

create index if not exists idx_fme_evaluation_logs_signature
  on public.fme_evaluation_logs (evaluation_signature);

create unique index if not exists idx_fme_evaluation_logs_user_signature
  on public.fme_evaluation_logs (user_id, evaluation_signature)
  where evaluation_signature is not null;
-- <<< 20260217193000_add_fme_log_signatures.sql
-- >>> 20260217213000_create_policy_ops_audits.sql
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
-- <<< 20260217213000_create_policy_ops_audits.sql
-- >>> 20260217222000_create_policy_ops_admins.sql
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
-- <<< 20260217222000_create_policy_ops_admins.sql
-- >>> 20260217224500_add_policy_ops_audit_signatures.sql
alter table public.policy_ops_audits
  add column if not exists operation_signature text;

alter table public.policy_ops_audits
  add column if not exists artifact_signature text;

create index if not exists idx_policy_ops_audits_operation_signature
  on public.policy_ops_audits (operation_signature);
-- <<< 20260217224500_add_policy_ops_audit_signatures.sql
-- >>> 20260218113000_add_ingestion_support_tables.sql
create extension if not exists "uuid-ossp";

-- Ensure transactions exists for rollup_net_worth support.
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  plaid_transaction_id text not null unique,
  user_id uuid references auth.users(id) not null,
  plaid_item_id text not null,
  plaid_account_id text not null,
  transaction_date date not null,
  name text not null,
  amount numeric not null,
  iso_currency_code text,
  pending boolean default false,
  category text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.transactions enable row level security;

drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions"
  on public.transactions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Backend services can insert transactions" on public.transactions;
create policy "Backend services can insert transactions"
  on public.transactions
  for insert
  with check (true);

drop policy if exists "Backend services can update transactions" on public.transactions;
create policy "Backend services can update transactions"
  on public.transactions
  for update
  using (true)
  with check (true);

create table if not exists public.raw_transactions (
  id uuid primary key default uuid_generate_v4(),
  plaid_item_id text not null,
  plaid_env text,
  webhook_id text,
  webhook_payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_raw_transactions_created_at
  on public.raw_transactions (created_at desc);

create index if not exists idx_raw_transactions_item
  on public.raw_transactions (plaid_item_id, created_at desc);

alter table public.raw_transactions enable row level security;

drop policy if exists "Service role manages raw transactions" on public.raw_transactions;
create policy "Service role manages raw transactions"
  on public.raw_transactions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.pending_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  plaid_env text,
  webhook_id text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (status in ('pending', 'processing', 'complete', 'failed'))
);

create index if not exists idx_pending_insights_user_status
  on public.pending_insights (user_id, status, created_at desc);

alter table public.pending_insights enable row level security;

drop policy if exists "Users can view their own pending insights" on public.pending_insights;
create policy "Users can view their own pending insights"
  on public.pending_insights
  for select
  using (auth.uid() = user_id);

drop policy if exists "Service role manages pending insights" on public.pending_insights;
create policy "Service role manages pending insights"
  on public.pending_insights
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_insights_user_created
  on public.insights (user_id, created_at desc);

alter table public.insights enable row level security;

drop policy if exists "Users can view their own insights" on public.insights;
create policy "Users can view their own insights"
  on public.insights
  for select
  using (auth.uid() = user_id);

drop policy if exists "Service role manages insights" on public.insights;
create policy "Service role manages insights"
  on public.insights
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.user_push_tokens enable row level security;

drop policy if exists "Service role manages push tokens" on public.user_push_tokens;
create policy "Service role manages push tokens"
  on public.user_push_tokens
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.rollup_net_worth(
  p_user_id uuid,
  p_since timestamptz,
  p_days integer default 90
)
returns table (
  day date,
  net_worth numeric,
  income numeric,
  expenses numeric
)
language sql
stable
as $$
  with bounds as (
    select
      p_since::date as start_day,
      (p_since::date + (greatest(p_days, 1) - 1) * interval '1 day')::date as end_day
  ),
  calendar as (
    select generate_series(
      (select start_day from bounds),
      (select end_day from bounds),
      interval '1 day'
    )::date as day
  ),
  daily as (
    select
      t.transaction_date::date as day,
      coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0)::numeric as income,
      coalesce(sum(case when t.amount < 0 then abs(t.amount) else 0 end), 0)::numeric as expenses
    from public.transactions t
    where t.user_id = p_user_id
      and t.transaction_date::date >= (select start_day from bounds)
      and t.transaction_date::date <= (select end_day from bounds)
    group by t.transaction_date::date
  ),
  joined as (
    select
      c.day,
      coalesce(d.income, 0)::numeric as income,
      coalesce(d.expenses, 0)::numeric as expenses
    from calendar c
    left join daily d on d.day = c.day
  )
  select
    j.day,
    sum(j.income - j.expenses)
      over (order by j.day rows between unbounded preceding and current row)::numeric as net_worth,
    j.income,
    j.expenses
  from joined j
  order by j.day;
$$;
-- <<< 20260218113000_add_ingestion_support_tables.sql
-- >>> 20260218151500_add_plaid_link_tables.sql
create extension if not exists "uuid-ossp";

create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  plaid_item_id text,
  plaid_account_id text not null,
  account_name text,
  account_type text,
  account_subtype text,
  balance numeric,
  iso_currency_code text,
  institution_name text,
  institution_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, plaid_account_id)
);

alter table public.accounts add column if not exists institution_name text;
alter table public.accounts add column if not exists institution_id text;

create index if not exists idx_accounts_user_id
  on public.accounts (user_id, created_at desc);

create index if not exists idx_accounts_item_id
  on public.accounts (plaid_item_id, created_at desc);

alter table public.accounts enable row level security;

drop policy if exists "Users can view their own accounts" on public.accounts;
create policy "Users can view their own accounts"
  on public.accounts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own accounts" on public.accounts;
create policy "Users can insert their own accounts"
  on public.accounts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own accounts" on public.accounts;
create policy "Users can update their own accounts"
  on public.accounts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Service role manages accounts" on public.accounts;
create policy "Service role manages accounts"
  on public.accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.plaid_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  plaid_item_id text not null unique,
  encrypted_plaid_access_token text not null,
  institution_name text,
  institution_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.plaid_items add column if not exists institution_name text;
alter table public.plaid_items add column if not exists institution_id text;

create index if not exists idx_plaid_items_user_id
  on public.plaid_items (user_id, created_at desc);

alter table public.plaid_items enable row level security;

drop policy if exists "Users can view their own Plaid items" on public.plaid_items;
create policy "Users can view their own Plaid items"
  on public.plaid_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Plaid items" on public.plaid_items;
create policy "Users can insert their own Plaid items"
  on public.plaid_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Plaid items" on public.plaid_items;
create policy "Users can update their own Plaid items"
  on public.plaid_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Service role manages Plaid items" on public.plaid_items;
create policy "Service role manages Plaid items"
  on public.plaid_items
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
-- <<< 20260218151500_add_plaid_link_tables.sql
-- >>> 20260218162000_create_user_goals.sql
create extension if not exists "uuid-ossp";

create table if not exists public.user_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  cadence text,
  milestone_note text,
  status text not null default 'active',
  due_date date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (target_amount >= 0),
  check (saved_amount >= 0),
  check (status in ('active', 'paused', 'completed'))
);

create index if not exists idx_user_goals_user_created
  on public.user_goals (user_id, created_at desc);

alter table public.user_goals enable row level security;

drop policy if exists "Users can view their own goals" on public.user_goals;
create policy "Users can view their own goals"
  on public.user_goals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own goals" on public.user_goals;
create policy "Users can insert their own goals"
  on public.user_goals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own goals" on public.user_goals;
create policy "Users can update their own goals"
  on public.user_goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own goals" on public.user_goals;
create policy "Users can delete their own goals"
  on public.user_goals
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Service role manages user goals" on public.user_goals;
create policy "Service role manages user goals"
  on public.user_goals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
-- <<< 20260218162000_create_user_goals.sql
-- >>> 20260219000000_reconcile_send_push_trigger.sql
-- Ensure send-push trigger exists after insights table creation.
create extension if not exists http;

create or replace function public.notify_send_push()
returns trigger
language plpgsql
as $$
declare
  _resp json;
begin
  select content
  into _resp
  from http(
    'POST',
    -- Replace <PROJECT-REF> with your Supabase project ref.
    'https://<PROJECT-REF>.functions.supabase.co/sendPush',
    'Content-Type: application/json',
    json_build_object('insight_id', new.id)::text
  );

  return new;
end;
$$ security definer;

do $$
begin
  if to_regclass('public.insights') is not null then
    drop trigger if exists trg_send_push on public.insights;
    create trigger trg_send_push
    after insert on public.insights
    for each row
    execute procedure public.notify_send_push();
  end if;
end
$$;
-- <<< 20260219000000_reconcile_send_push_trigger.sql
-- >>> 20260219120000_harden_ingestion_policies_and_send_push.sql
-- Apply post-review hardening for ingestion policies and push trigger wiring.

drop policy if exists "Backend services can insert transactions" on public.transactions;
create policy "Backend services can insert transactions"
  on public.transactions
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists "Backend services can update transactions" on public.transactions;
create policy "Backend services can update transactions"
  on public.transactions
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Users can insert their own insights" on public.insights;
create policy "Users can insert their own insights"
  on public.insights
  for insert
  with check (auth.uid() = user_id);

create extension if not exists http;

create or replace function public.notify_send_push()
returns trigger
language plpgsql
security definer
as $$
declare
  _resp json;
begin
  begin
    select content
    into _resp
    from http(
      'POST',
      'https://zderaqrvjljvkwhilesp.functions.supabase.co/sendPush',
      'Content-Type: application/json',
      json_build_object('insight_id', new.id)::text
    );
  exception
    when others then
      raise warning 'notify_send_push failed for insight_id=%: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.insights') is not null then
    drop trigger if exists trg_send_push on public.insights;
    create trigger trg_send_push
    after insert on public.insights
    for each row
    execute procedure public.notify_send_push();
  end if;
end
$$;
-- <<< 20260219120000_harden_ingestion_policies_and_send_push.sql
-- >>> 20260301110000_add_pending_insights_claim_tracking.sql
alter table public.pending_insights
  add column if not exists claimed_at timestamptz;

create index if not exists idx_pending_insights_processing_claimed_at
  on public.pending_insights (claimed_at)
  where status = 'processing';

update public.pending_insights
set claimed_at = coalesce(claimed_at, created_at)
where status = 'processing'
  and claimed_at is null;
-- <<< 20260301110000_add_pending_insights_claim_tracking.sql
