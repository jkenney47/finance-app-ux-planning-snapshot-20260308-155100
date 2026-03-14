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
