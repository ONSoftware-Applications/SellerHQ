-- Batch 1 security: Stripe webhook idempotency.
-- Records processed Stripe event IDs so duplicate deliveries are ignored.

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

-- No RLS policies: only the service-role webhook writes/reads this table.
