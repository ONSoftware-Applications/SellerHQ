-- Quantity: treat multiple identical products as stock
alter table public.products add column if not exists quantity integer not null default 1;
