-- Quantity: treat multiple identical products as stock
alter table public.products add column if not exists quantity integer not null default 1;

-- Reorder level: alert when stock falls to this threshold (0 = disabled)
alter table public.products add column if not exists reorder_level integer not null default 0;
