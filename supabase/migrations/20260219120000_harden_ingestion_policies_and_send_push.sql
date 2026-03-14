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
