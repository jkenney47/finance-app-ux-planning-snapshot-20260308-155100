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
