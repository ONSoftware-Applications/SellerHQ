-- Business-defined neutral inventory statuses.
-- Products reference these through the existing products.status text column
-- using the value "custom:<status uuid>", so no built-in workflow meaning is implied.

create table if not exists public.custom_product_statuses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  colour text not null default 'slate'
    check (colour in ('slate', 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'amber', 'green', 'teal')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custom_product_statuses_business_name_unique
  on public.custom_product_statuses (business_id, lower(name));

create index if not exists custom_product_statuses_business_sort
  on public.custom_product_statuses (business_id, sort_order, created_at);

alter table public.custom_product_statuses enable row level security;

create policy "Business members can view custom product statuses"
  on public.custom_product_statuses for select
  using (public.is_business_member(business_id));

create policy "Business admins can create custom product statuses"
  on public.custom_product_statuses for insert
  with check (public.is_business_admin_or_owner(business_id));

create policy "Business admins can update custom product statuses"
  on public.custom_product_statuses for update
  using (public.is_business_admin_or_owner(business_id))
  with check (public.is_business_admin_or_owner(business_id));

create policy "Business admins can delete custom product statuses"
  on public.custom_product_statuses for delete
  using (public.is_business_admin_or_owner(business_id));
