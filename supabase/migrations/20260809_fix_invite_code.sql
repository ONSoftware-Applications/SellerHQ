-- Fix: "column reference business_id is ambiguous" when redeeming an invite code.
--
-- The first migration defined accept_invite_code(...) RETURNS TABLE
-- (business_id, business_name, role). A function's RETURNS TABLE columns are
-- also output parameters, so inside the body the bare names `business_id` and
-- `role` collided with the same-named table columns (business_members / 
-- business_invite_codes) in the WHERE clauses of the EXISTS/count subqueries,
-- raising "column reference is ambiguous".
--
-- Renaming the return columns to out_* removes the collision. create or replace
-- is idempotent, so this is safe on fresh and already-migrated databases alike.

create or replace function public.accept_invite_code(p_code text)
returns table (
  out_business_id uuid,
  out_business_name text,
  out_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _business_id uuid;
  _business_name text;
  _role text;
  _active_count int;
  _seat_limit int := 5;
begin
  -- Look up a non-expired code (case-insensitive to be forgiving to the user).
  select i.business_id, b.name, i.role
  into _business_id, _business_name, _role
  from public.business_invite_codes i
  join public.businesses b on b.id = i.business_id
  where upper(i.code) = upper(p_code)
    and i.expires_at > now()
  limit 1;

  if _business_id is null then
    raise exception 'The invite code you entered is invalid or has expired.';
  end if;

  -- Already an active member? nothing to do, just report the business.
  if exists (
    select 1 from public.business_members bm
    where bm.business_id = _business_id
      and bm.user_id = auth.uid()
      and bm.status = 'active'
  ) then
    out_business_id := _business_id;
    out_business_name := _business_name;
    out_role := _role;
    return next;
    return;
  end if;

  -- Enforce the per-business seat limit before adding a new member.
  select count(*) into _active_count
  from public.business_members bm
  where bm.business_id = _business_id
    and bm.status = 'active';

  if _active_count >= _seat_limit then
    raise exception 'The team is full. Remove a member before joining.';
  end if;

  -- Add (or re-activate) the caller as a member with the code's role.
  insert into public.business_members
    (business_id, user_id, email, role, status, invited_by, joined_at)
  values
    (_business_id, auth.uid(), coalesce(auth.email(), ''), _role, 'active', auth.uid(), now())
  on conflict (business_id, user_id) do update
    set status = 'active',
        role = excluded.role,
        joined_at = now();

  out_business_id := _business_id;
  out_business_name := _business_name;
  out_role := _role;
  return next;
end;
$$;

grant execute on function public.accept_invite_code(text) to authenticated;
