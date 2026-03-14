alter table public.policy_ops_audits
  add column if not exists operation_signature text;

alter table public.policy_ops_audits
  add column if not exists artifact_signature text;

create index if not exists idx_policy_ops_audits_operation_signature
  on public.policy_ops_audits (operation_signature);
