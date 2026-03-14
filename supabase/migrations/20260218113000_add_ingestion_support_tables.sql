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
