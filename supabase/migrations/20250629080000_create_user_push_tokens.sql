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
