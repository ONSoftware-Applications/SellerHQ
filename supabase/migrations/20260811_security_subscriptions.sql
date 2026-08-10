-- Batch 1 security: subscription ownership.
-- Establish one authoritative model: Business -> Subscription -> Stripe.
-- Team members inherit the business entitlement via business membership.

-- Link a subscription to the business it entitles.
alter table public.subscriptions
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

create index if not exists subscriptions_business_id_idx
  on public.subscriptions (business_id);

-- Remove the broken policies that passed a user_id where the membership
-- helper expects a business_id (see 20260806_multi_user_rls.sql).
drop policy if exists "Team members can view subscriptions" on public.subscriptions;
drop policy if exists "Team members can insert subscriptions" on public.subscriptions;
drop policy if exists "Team members can update subscriptions" on public.subscriptions;

-- The subscriber can always view their own subscription.
drop policy if exists "Users can view their own subscription" on public.subscriptions;
create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Team members inherit the entitlement of the business's subscription.
-- business_id is null for legacy rows; those fall back to the owner-only view.
create policy "Business members can view their business subscription"
  on public.subscriptions for select
  using (public.is_business_member(business_id));

-- No INSERT/UPDATE/DELETE policies: subscriptions are written only by the
-- service-role Stripe webhook / edge functions, never by the client.
