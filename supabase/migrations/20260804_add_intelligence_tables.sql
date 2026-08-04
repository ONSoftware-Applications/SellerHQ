-- Product history / audit trail
create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_events enable row level security;

create policy "Users can view events for their products"
  on public.product_events for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = product_events.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can insert events for their products"
  on public.product_events for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = product_events.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can delete events for their products"
  on public.product_events for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = product_events.business_id and b.owner_id = auth.uid()
    )
  );

-- Relisting tracking
create table if not exists public.relistings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  marketplace text,
  previous_price numeric(12,2),
  new_price numeric(12,2),
  relisted_at timestamptz not null default now()
);

alter table public.relistings enable row level security;

create policy "Users can view relistings for their products"
  on public.relistings for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = relistings.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can insert relistings for their products"
  on public.relistings for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = relistings.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can delete relistings for their products"
  on public.relistings for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = relistings.business_id and b.owner_id = auth.uid()
    )
  );

-- Expense receipt storage reference
alter table public.expenses
  add column if not exists receipt_url text;

-- Business members / multi-user businesses
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff',
  invited_at timestamptz not null default now(),
  unique (business_id, user_id)
);

alter table public.business_members enable row level security;

create policy "Business owners can manage members"
  on public.business_members for all
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Members can view their own memberships"
  on public.business_members for select
  using (auth.uid() = business_members.user_id);