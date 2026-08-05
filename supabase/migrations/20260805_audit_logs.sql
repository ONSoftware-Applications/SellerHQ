-- Audit log: records key account actions for Business plan transparency.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "Users can view their own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own audit logs"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);
