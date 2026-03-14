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
