-- Till Mode: buy-ins (purchases from clients).
-- Adds direction and client name to till transactions so the till can record
-- stock bought in from clients alongside regular sales.

alter table public.till_transactions
  add column if not exists direction text not null default 'sale';

alter table public.till_transactions
  add column if not exists client_name text;

create index if not exists till_transactions_direction_idx
  on public.till_transactions (business_id, direction, created_at desc);
