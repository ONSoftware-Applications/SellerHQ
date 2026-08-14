-- Till Mode: full point-of-sale for Business plan.
-- Expands the QR relay pipeline into a functional till with sessions,
-- transactions, line items, cash drawer reconciliation, and held orders.

-- 1. Till sessions (open/close with float + cash reconciliation)
create table if not exists public.till_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  starting_float numeric(12,2) not null default 0,
  expected_cash numeric(12,2) not null default 0,
  counted_cash numeric(12,2),
  status text not null default 'open',
  closed_at timestamptz
);

create index if not exists till_sessions_business_idx
  on public.till_sessions (business_id, status, opened_at desc);

-- 2. Till transactions
create table if not exists public.till_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_id uuid not null references public.till_sessions(id) on delete cascade,
  cashier_id uuid not null references auth.users(id) on delete cascade,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'cash',
  amount_tendered numeric(12,2) not null default 0,
  change_due numeric(12,2) not null default 0,
  status text not null default 'completed',
  void_reason text,
  created_at timestamptz not null default now()
);

create index if not exists till_transactions_session_idx
  on public.till_transactions (session_id, created_at desc);

-- 3. Till transaction line items
create table if not exists public.till_transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.till_transactions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1,
  line_total numeric(12,2) not null default 0
);

create index if not exists till_transaction_items_transaction_idx
  on public.till_transaction_items (transaction_id);

-- 4. Held (parked) orders
create table if not exists public.till_holds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_id uuid not null references public.till_sessions(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists till_holds_session_idx
  on public.till_holds (session_id, created_at desc);

-- Row level security
alter table public.till_sessions enable row level security;
alter table public.till_transactions enable row level security;
alter table public.till_transaction_items enable row level security;
alter table public.till_holds enable row level security;

-- Sessions: members can view, open and close
create policy "Till sessions view" on public.till_sessions for select
  using (public.is_business_member(business_id));

create policy "Till sessions insert" on public.till_sessions for insert
  with check (public.is_business_member(business_id));

create policy "Till sessions update" on public.till_sessions for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- Transactions: members can view, create and void
create policy "Till transactions view" on public.till_transactions for select
  using (public.is_business_member(business_id));

create policy "Till transactions insert" on public.till_transactions for insert
  with check (public.is_business_member(business_id));

create policy "Till transactions update" on public.till_transactions for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- Items: members can view and create (managed via the transaction)
create policy "Till items view" on public.till_transaction_items for select
  using (
    transaction_id in (
      select id from public.till_transactions
      where public.is_business_member(business_id)
    )
  );

create policy "Till items insert" on public.till_transaction_items for insert
  with check (
    transaction_id in (
      select id from public.till_transactions
      where public.is_business_member(business_id)
    )
  );

-- Holds: members can view, create and delete
create policy "Till holds view" on public.till_holds for select
  using (public.is_business_member(business_id));

create policy "Till holds insert" on public.till_holds for insert
  with check (public.is_business_member(business_id));

create policy "Till holds delete" on public.till_holds for delete
  using (public.is_business_member(business_id));
