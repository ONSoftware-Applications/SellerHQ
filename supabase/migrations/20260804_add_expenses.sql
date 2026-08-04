-- Standalone expenses table for tracking costs that aren't tied to a product
-- (advertising, subscriptions, packaging, vehicle costs, etc.)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null default 'Other',
  description text not null default '',
  amount numeric(12,2) not null default 0,
  expense_date date not null default current_date,
  marketplace text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable row level security
alter table public.expenses enable row level security;

create policy "Users can view expenses for their businesses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = expenses.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can insert expenses for their businesses"
  on public.expenses for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = expenses.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can update expenses for their businesses"
  on public.expenses for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = expenses.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can delete expenses for their businesses"
  on public.expenses for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = expenses.business_id and b.owner_id = auth.uid()
    )
  );