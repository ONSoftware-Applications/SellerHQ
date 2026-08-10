-- Batch 1 security: team membership.
-- Role/status/business-association must never be client-editable by the member
-- themselves. All changes go through SECURITY DEFINER RPCs that only the
-- business owner can call, and every change is audit-logged server-side.

-- Remove the permissive membership policies. SELECT policies are retained
-- ("Members can view their business members", "Members can view their own
-- memberships").
drop policy if exists "Members can update own membership" on public.business_members;
drop policy if exists "Business owners can manage members" on public.business_members;
drop policy if exists "Owners can manage members" on public.business_members;

-- Change a member's role. Owner only; the owner role itself can never be
-- changed; last-active-owner is protected.
create or replace function public.change_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _business_id uuid;
  _current_role text;
begin
  select business_id, role into _business_id, _current_role
  from public.business_members
  where id = p_member_id;

  if _business_id is null then
    raise exception 'Member not found';
  end if;

  if not public.is_business_owner(_business_id) then
    raise exception 'Only the business owner can change roles';
  end if;

  if _current_role = 'owner' then
    raise exception 'The owner role cannot be changed';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invalid role';
  end if;

  update public.business_members
  set role = p_role
  where id = p_member_id;

  insert into public.audit_logs (user_id, business_id, action, details)
  values (auth.uid(), _business_id, 'team.role_changed',
    jsonb_build_object(
      'member_id', p_member_id,
      'old_role', _current_role,
      'new_role', p_role
    ));
end;
$$;

-- Remove a member. Owner only; prevents removing the last active owner.
create or replace function public.remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _business_id uuid;
  _role text;
  _active_owners int;
begin
  select business_id, role into _business_id, _role
  from public.business_members
  where id = p_member_id;

  if _business_id is null then
    raise exception 'Member not found';
  end if;

  if not public.is_business_owner(_business_id) then
    raise exception 'Only the business owner can remove members';
  end if;

  if _role = 'owner' then
    select count(*) into _active_owners
    from public.business_members
    where business_id = _business_id
      and role = 'owner'
      and status = 'active';
    if _active_owners <= 1 then
      raise exception 'The last owner cannot be removed';
    end if;
  end if;

  update public.business_members
  set status = 'removed'
  where id = p_member_id;

  insert into public.audit_logs (user_id, business_id, action, details)
  values (auth.uid(), _business_id, 'team.member_removed',
    jsonb_build_object('member_id', p_member_id, 'role', _role));
end;
$$;

grant execute on function public.change_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
