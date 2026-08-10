-- Batch 1 security: server-side plan enforcement.
-- Paid feature access and hard limits are enforced in the database, not just
-- in the client. A BEFORE INSERT trigger blocks writes that would exceed the
-- plan's product or business limits, transactionally.

-- Resolve the active plan for a business. Entitlement comes from the
-- business's subscription (Business -> Subscription); falls back to the
-- owner's subscription for legacy rows with a null business_id.
create or replace function public.business_plan(business_uuid uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.plan
      from public.subscriptions s
      where s.business_id = business_uuid
        and s.status in ('active', 'trialing', 'past_due')
      limit 1
    ),
    (
      select s.plan
      from public.businesses b
      join public.subscriptions s on s.user_id = b.owner_id
      where b.id = business_uuid
        and s.status in ('active', 'trialing', 'past_due')
      limit 1
    ),
    'basic'
  );
$$;

-- Product count limit for a business, from its plan.
create or replace function public.business_product_limit(business_uuid uuid)
returns int
language sql
security definer
set search_path = public
as $$
  select case public.business_plan(business_uuid)
    when 'growing' then 500
    when 'pro' then 5000
    when 'business' then 2147483647
    else 50
  end;
$$;

-- Block product inserts once the business is at its plan's product limit.
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _limit int;
  _count int;
begin
  _limit := public.business_product_limit(new.business_id);

  if _limit = 2147483647 then
    -- Unlimited plan: never block by count.
    return new;
  end if;

  select count(*) into _count
  from public.products
  where business_id = new.business_id;

  if _count >= _limit then
    raise exception 'Product limit reached for this business''s plan (% allowed). Upgrade to add more.', _limit;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_product_limit_on_insert on public.products;
create trigger enforce_product_limit_on_insert
  before insert on public.products
  for each row execute function public.enforce_product_limit();

-- Business count limit for a user, from their subscription plan.
create or replace function public.user_business_limit(p_user_id uuid)
returns int
language sql
security definer
set search_path = public
as $$
  select case coalesce(
    (
      select s.plan
      from public.subscriptions s
      where s.user_id = p_user_id
        and s.status in ('active', 'trialing', 'past_due')
      limit 1
    ),
    'basic'
  )
    when 'growing' then 2
    when 'pro' then 5
    when 'business' then 2147483647
    else 1
  end;
$$;

-- Block business creation once the user is at their plan's business limit.
create or replace function public.enforce_business_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _limit int;
  _count int;
begin
  _limit := public.user_business_limit(new.owner_id);

  if _limit = 2147483647 then
    return new;
  end if;

  select count(*) into _count
  from public.businesses
  where owner_id = new.owner_id;

  if _count >= _limit then
    raise exception 'Business limit reached for this account (% allowed). Upgrade to create another.', _limit;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_business_limit_on_insert on public.businesses;
create trigger enforce_business_limit_on_insert
  before insert on public.businesses
  for each row execute function public.enforce_business_limit();
