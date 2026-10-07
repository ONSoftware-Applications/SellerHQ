-- Enforce custom inventory statuses as a Pro/Business feature.
-- Read access remains available after a downgrade so existing custom labels can
-- still be displayed and products can be moved back to a SellerHQ system status.

drop policy if exists "Business admins can create custom product statuses"
  on public.custom_product_statuses;
drop policy if exists "Business admins can update custom product statuses"
  on public.custom_product_statuses;
drop policy if exists "Business admins can delete custom product statuses"
  on public.custom_product_statuses;

create policy "Pro business admins can create custom product statuses"
  on public.custom_product_statuses for insert
  with check (
    public.is_business_admin_or_owner(business_id)
    and public.business_plan(business_id) in ('pro', 'business')
  );

create policy "Pro business admins can update custom product statuses"
  on public.custom_product_statuses for update
  using (
    public.is_business_admin_or_owner(business_id)
    and public.business_plan(business_id) in ('pro', 'business')
  )
  with check (
    public.is_business_admin_or_owner(business_id)
    and public.business_plan(business_id) in ('pro', 'business')
  );

create policy "Pro business admins can delete custom product statuses"
  on public.custom_product_statuses for delete
  using (
    public.is_business_admin_or_owner(business_id)
    and public.business_plan(business_id) in ('pro', 'business')
  );

create or replace function public.enforce_custom_product_status_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  custom_id uuid;
  assigning_custom boolean := false;
begin
  if new.status not like 'custom:%' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    assigning_custom := true;
  elsif old.status is distinct from new.status then
    assigning_custom := true;
  end if;

  -- Existing custom-status products remain editable after a downgrade as long
  -- as the status itself is not changed to another custom status.
  if assigning_custom
    and public.business_plan(new.business_id) not in ('pro', 'business')
  then
    raise exception 'Custom inventory statuses require SellerHQ Pro or Business.';
  end if;

  begin
    custom_id := substring(new.status from char_length('custom:') + 1)::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Invalid custom inventory status.';
  end;

  if not exists (
    select 1
    from public.custom_product_statuses s
    where s.id = custom_id
      and s.business_id = new.business_id
  ) then
    raise exception 'Custom inventory status does not belong to this business.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_custom_product_status_plan_on_products
  on public.products;

create trigger enforce_custom_product_status_plan_on_products
  before insert or update of status on public.products
  for each row execute function public.enforce_custom_product_status_plan();
