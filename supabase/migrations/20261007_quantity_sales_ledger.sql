-- Canonical sales ledger for quantity-aware stock and finance.
-- Product rows remain inventory/SKU records; each completed sale is stored here.

create table if not exists public.product_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,

  product_code text not null default '',
  sku text not null default '',
  product_name text not null default '',
  brand text not null default '',
  category text not null default '',

  quantity integer not null default 1 check (quantity > 0),
  unit_sale_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  unit_purchase_price numeric(12,2) not null default 0,
  cost_of_goods numeric(12,2) not null default 0,
  additional_costs numeric(12,2) not null default 0,

  shipping_cost numeric(12,2) not null default 0,
  platform_fees numeric(12,2) not null default 0,
  other_fees numeric(12,2) not null default 0,
  fees numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,

  sale_date date not null default current_date,
  shipping_date date,
  sale_marketplace text,
  status text not null default 'sold'
    check (status in ('awaiting_shipping', 'in_shipping', 'sold', 'refunded', 'voided')),

  refunded boolean not null default false,
  refund_amount numeric(12,2) not null default 0,
  refund_date date,
  refund_note text not null default '',

  source text not null default 'manual',
  external_reference text,
  till_transaction_id uuid references public.till_transactions(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_sales_business_date_idx
  on public.product_sales (business_id, sale_date desc, created_at desc);

create index if not exists product_sales_product_idx
  on public.product_sales (product_id, created_at desc);

create index if not exists product_sales_status_idx
  on public.product_sales (business_id, status, created_at desc);

create unique index if not exists product_sales_external_reference_unique
  on public.product_sales (business_id, source, external_reference)
  where external_reference is not null;

alter table public.product_sales enable row level security;

drop policy if exists "Business members can view sales" on public.product_sales;
drop policy if exists "Business members can update sales" on public.product_sales;
drop policy if exists "Business admins can delete sales" on public.product_sales;

create policy "Business members can view sales"
  on public.product_sales for select
  using (public.is_business_member(business_id));

create policy "Business members can update sales"
  on public.product_sales for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Business admins can delete sales"
  on public.product_sales for delete
  using (public.is_business_admin_or_owner(business_id));

-- Existing sale-shaped product rows are backfilled once. This preserves historic
-- revenue when the application switches from product rows to the sales ledger.
insert into public.product_sales (
  business_id,
  product_id,
  product_code,
  sku,
  product_name,
  brand,
  category,
  quantity,
  unit_sale_price,
  sale_price,
  unit_purchase_price,
  cost_of_goods,
  additional_costs,
  shipping_cost,
  platform_fees,
  other_fees,
  fees,
  profit,
  sale_date,
  shipping_date,
  sale_marketplace,
  status,
  refunded,
  refund_amount,
  refund_date,
  refund_note,
  source,
  external_reference,
  created_at,
  updated_at
)
select
  p.business_id,
  p.id,
  coalesce(p.product_reference, ''),
  coalesce(p.sku, ''),
  coalesce(p.name, ''),
  coalesce(p.brand, ''),
  coalesce(p.category, ''),
  1,
  coalesce(p.sale_price, 0),
  coalesce(p.sale_price, 0),
  coalesce(p.purchase_price, 0),
  coalesce(p.purchase_price, 0) + coalesce(p.additional_costs, 0),
  coalesce(p.additional_costs, 0),
  coalesce(p.shipping_cost, 0),
  coalesce(p.platform_fees, 0),
  coalesce(p.other_fees, 0),
  coalesce(p.fees, 0),
  coalesce(
    p.profit,
    coalesce(p.sale_price, 0)
      - coalesce(p.purchase_price, 0)
      - coalesce(p.additional_costs, 0)
      - coalesce(p.fees, 0)
  ),
  coalesce(p.sale_date, p.updated_at::date, p.created_at::date, current_date),
  p.shipping_date,
  p.sale_marketplace,
  case
    when coalesce(p.refunded, false) then 'refunded'
    when p.status = 'awaiting_shipping' then 'awaiting_shipping'
    when p.status = 'in_shipping' then 'in_shipping'
    else 'sold'
  end,
  coalesce(p.refunded, false),
  coalesce(p.refund_amount, 0),
  p.refund_date,
  coalesce(p.refund_note, ''),
  'legacy',
  'legacy-product:' || p.id::text,
  coalesce(p.updated_at, p.created_at, now()),
  coalesce(p.updated_at, p.created_at, now())
from public.products p
where p.sale_price is not null
on conflict (business_id, source, external_reference)
  where external_reference is not null
do nothing;

create or replace function public.record_product_sale(
  p_product_id uuid,
  p_quantity integer,
  p_sale_price numeric,
  p_sale_date date,
  p_sale_marketplace text default null,
  p_shipping_cost numeric default 0,
  p_platform_fees numeric default 0,
  p_other_fees numeric default 0,
  p_sale_status text default 'sold',
  p_source text default 'manual',
  p_external_reference text default null,
  p_till_transaction_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  remaining integer;
  total_fees numeric;
  total_cost numeric;
  sale_profit numeric;
  created_sale_id uuid;
  existing_sale_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Sale quantity must be greater than zero.';
  end if;

  if p_sale_price is null or p_sale_price < 0 then
    raise exception 'Sale price must be zero or higher.';
  end if;

  if p_sale_status not in ('awaiting_shipping', 'in_shipping', 'sold') then
    raise exception 'Invalid sale status.';
  end if;

  select *
    into product_row
    from public.products
    where id = p_product_id
    for update;

  if not found then
    raise exception 'Product not found.';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and not public.is_business_member(product_row.business_id)
  then
    raise exception 'You do not have access to this business.';
  end if;

  if p_external_reference is not null then
    select id into existing_sale_id
    from public.product_sales
    where business_id = product_row.business_id
      and source = coalesce(nullif(p_source, ''), 'manual')
      and external_reference = p_external_reference
    limit 1;

    if existing_sale_id is not null then
      return existing_sale_id;
    end if;
  end if;

  if coalesce(product_row.quantity, 0) < p_quantity then
    raise exception 'Only % unit(s) remain in stock.', coalesce(product_row.quantity, 0);
  end if;

  remaining := coalesce(product_row.quantity, 0) - p_quantity;
  total_fees :=
    coalesce(p_shipping_cost, 0)
    + coalesce(p_platform_fees, 0)
    + coalesce(p_other_fees, 0);

  -- Purchase price and additional product costs are treated as per-unit costs,
  -- matching the quantity-aware purchase/till model.
  total_cost :=
    (coalesce(product_row.purchase_price, 0)
      + coalesce(product_row.additional_costs, 0))
    * p_quantity;

  sale_profit := coalesce(p_sale_price, 0) - total_cost - total_fees;

  insert into public.product_sales (
    business_id,
    product_id,
    product_code,
    sku,
    product_name,
    brand,
    category,
    quantity,
    unit_sale_price,
    sale_price,
    unit_purchase_price,
    cost_of_goods,
    additional_costs,
    shipping_cost,
    platform_fees,
    other_fees,
    fees,
    profit,
    sale_date,
    sale_marketplace,
    status,
    source,
    external_reference,
    till_transaction_id
  ) values (
    product_row.business_id,
    product_row.id,
    coalesce(product_row.product_reference, ''),
    coalesce(product_row.sku, ''),
    coalesce(product_row.name, ''),
    coalesce(product_row.brand, ''),
    coalesce(product_row.category, ''),
    p_quantity,
    case when p_quantity > 0 then coalesce(p_sale_price, 0) / p_quantity else 0 end,
    coalesce(p_sale_price, 0),
    coalesce(product_row.purchase_price, 0),
    total_cost,
    coalesce(product_row.additional_costs, 0) * p_quantity,
    coalesce(p_shipping_cost, 0),
    coalesce(p_platform_fees, 0),
    coalesce(p_other_fees, 0),
    total_fees,
    sale_profit,
    coalesce(p_sale_date, current_date),
    nullif(p_sale_marketplace, ''),
    p_sale_status,
    coalesce(nullif(p_source, ''), 'manual'),
    p_external_reference,
    p_till_transaction_id
  )
  returning id into created_sale_id;

  update public.products
  set
    quantity = remaining,
    status = case when remaining = 0 then p_sale_status else status end,
    sale_price = coalesce(p_sale_price, 0),
    sale_date = coalesce(p_sale_date, current_date),
    sale_marketplace = nullif(p_sale_marketplace, ''),
    shipping_cost = coalesce(p_shipping_cost, 0),
    platform_fees = coalesce(p_platform_fees, 0),
    other_fees = coalesce(p_other_fees, 0),
    fees = total_fees,
    profit = sale_profit,
    refunded = false,
    refund_amount = 0,
    refund_date = null,
    refund_note = '',
    updated_at = now()
  where id = product_row.id;

  return created_sale_id;
end;
$$;

create or replace function public.void_product_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row public.product_sales%rowtype;
  product_row public.products%rowtype;
begin
  select *
    into sale_row
    from public.product_sales
    where id = p_sale_id
    for update;

  if not found then
    raise exception 'Sale not found.';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and not public.is_business_member(sale_row.business_id)
  then
    raise exception 'You do not have access to this business.';
  end if;

  if sale_row.status = 'voided' then
    return;
  end if;

  if sale_row.product_id is not null then
    select *
      into product_row
      from public.products
      where id = sale_row.product_id
      for update;

    if found then
      update public.products
      set
        quantity = coalesce(quantity, 0) + sale_row.quantity,
        status = case
          when coalesce(quantity, 0) = 0
            and status in ('sold', 'awaiting_shipping', 'in_shipping')
          then 'unlisted'
          else status
        end,
        sale_price = case when coalesce(quantity, 0) = 0 then null else sale_price end,
        sale_date = case when coalesce(quantity, 0) = 0 then null else sale_date end,
        sale_marketplace = case when coalesce(quantity, 0) = 0 then null else sale_marketplace end,
        shipping_date = case when coalesce(quantity, 0) = 0 then null else shipping_date end,
        fees = case when coalesce(quantity, 0) = 0 then 0 else fees end,
        profit = case when coalesce(quantity, 0) = 0 then 0 else profit end,
        shipping_cost = case when coalesce(quantity, 0) = 0 then 0 else shipping_cost end,
        platform_fees = case when coalesce(quantity, 0) = 0 then 0 else platform_fees end,
        other_fees = case when coalesce(quantity, 0) = 0 then 0 else other_fees end,
        updated_at = now()
      where id = sale_row.product_id;
    end if;
  end if;

  update public.product_sales
  set status = 'voided', updated_at = now()
  where id = p_sale_id;
end;
$$;
