-- Receipt URLs for expense items
alter table public.expenses add column if not exists receipt_url text;
