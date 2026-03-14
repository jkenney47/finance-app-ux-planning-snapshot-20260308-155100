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
