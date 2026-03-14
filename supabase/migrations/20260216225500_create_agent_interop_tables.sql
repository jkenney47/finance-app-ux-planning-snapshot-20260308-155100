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
