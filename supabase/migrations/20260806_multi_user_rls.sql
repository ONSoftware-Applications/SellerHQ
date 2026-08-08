-- Multi-user RLS: grant team members access to business data.
-- Existing owner policies remain; these ADD team-member access (policies are OR'd).

-- 1. Products
create policy "Team members can view products"
  on public.products for select
  using (public.is_business_member(business_id));

create policy "Team members can insert products"
  on public.products for insert
  with check (public.is_business_member(business_id));

create policy "Team members can update products"
  on public.products for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Team admins and owners can delete products"
  on public.products for delete
  using (public.is_business_admin_or_owner(business_id));

-- 2. Expenses
create policy "Team members can view expenses"
  on public.expenses for select
  using (public.is_business_member(business_id));

create policy "Team members can insert expenses"
  on public.expenses for insert
  with check (public.is_business_member(business_id));

create policy "Team members can update expenses"
  on public.expenses for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Team admins and owners can delete expenses"
  on public.expenses for delete
  using (public.is_business_admin_or_owner(business_id));

-- 3. Subscriptions
create policy "Team members can view subscriptions"
  on public.subscriptions for select
  using (public.is_business_member(user_id));

create policy "Team members can insert subscriptions"
  on public.subscriptions for insert
  with check (public.is_business_member(user_id));

create policy "Team members can update subscriptions"
  on public.subscriptions for update
  using (public.is_business_member(user_id))
  with check (public.is_business_member(user_id));

-- 4. Product events
create policy "Team members can view product events"
  on public.product_events for select
  using (
    product_id in (
      select id from public.products where public.is_business_member(business_id)
    )
  );

create policy "Team members can insert product events"
  on public.product_events for insert
  with check (
    product_id in (
      select id from public.products where public.is_business_member(business_id)
    )
  );

-- 5. Audit logs
create policy "Team members can view audit logs"
  on public.audit_logs for select
  using (public.is_business_member(business_id));

create policy "Team members can insert audit logs"
  on public.audit_logs for insert
  with check (public.is_business_member(business_id));

-- 6. Businesses (members can read businesses they belong to)
create policy "Team members can view their businesses"
  on public.businesses for select
  using (public.is_business_member(id));
