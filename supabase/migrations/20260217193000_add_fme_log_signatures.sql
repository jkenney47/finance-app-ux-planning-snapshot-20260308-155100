alter table public.fme_evaluation_logs
  add column if not exists evaluation_signature text;

alter table public.fme_evaluation_logs
  add column if not exists artifact_signature text;

create index if not exists idx_fme_evaluation_logs_signature
  on public.fme_evaluation_logs (evaluation_signature);

create unique index if not exists idx_fme_evaluation_logs_user_signature
  on public.fme_evaluation_logs (user_id, evaluation_signature)
  where evaluation_signature is not null;
