-- Backfill business_members for existing businesses.
-- Matches the table structure: id, business_id, user_id, role, status, invited_at

insert into public.business_members (business_id, user_id, role, status, invited_at)
select
  b.id as business_id,
  b.owner_id as user_id,
  'owner' as role,
  'active' as status,
  b.created_at as invited_at
from public.businesses b
where not exists (
  select 1 from public.business_members bm
  where bm.business_id = b.id and bm.user_id = b.owner_id
);
