alter table public.pending_insights
  add column if not exists claimed_at timestamptz;

create index if not exists idx_pending_insights_processing_claimed_at
  on public.pending_insights (claimed_at)
  where status = 'processing';

update public.pending_insights
set claimed_at = coalesce(claimed_at, created_at)
where status = 'processing'
  and claimed_at is null;
