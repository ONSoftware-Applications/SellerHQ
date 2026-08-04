-- Add supplier, payment method and notes columns to expenses
alter table public.expenses
  add column if not exists supplier text,
  add column if not exists payment_method text,
  add column if not exists notes text;