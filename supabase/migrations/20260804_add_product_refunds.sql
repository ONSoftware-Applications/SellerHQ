-- Refund support on products. A sold product can be refunded, returning it
-- to a saleable state while retaining an audit trail of the original sale.
alter table public.products
  add column if not exists refunded boolean not null default false,
  add column if not exists refund_amount numeric(12,2),
  add column if not exists refund_date date,
  add column if not exists refund_note text;

-- Backfill: existing rows are not refunded.
update public.products
set
  refunded = coalesce(refunded, false),
  refund_amount = coalesce(refund_amount, null),
  refund_date = coalesce(refund_date, null),
  refund_note = coalesce(refund_note, null);