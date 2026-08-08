-- Invite codes: shareable, role-specific codes replace emailed invites.
-- One active code per (business, role). Codes are reusable until they expire or
-- are regenerated, so the owner can hand a single code to multiple people.

-- 1. Codes table
create table if not exists public.business_invite_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  code text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- One code per business+role (regenerating replaces the existing one).
create unique index if not exists business_invite_codes_business_role_idx
  on public.business_invite_codes (business_id, role);
create index if not exists business_invite_codes_code_idx
  on public.business_invite_codes (code);

-- 2. RLS — only the owner can view and manage a business's codes. Codes are
-- never exposed to members directly; redemption happens via the security
-- definer RPC below.
alter table public.business_invite_codes enable row level security;

create policy "Owners can manage invite codes"
  on public.business_invite_codes for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- 3. RPC: redeem a code to join a business. SECURITY DEFINER lets it read the
-- (owner-only) code and insert a membership on behalf of the calling user,
-- bypassing the caller's row-level restrictions.
--
-- NOTE: the returned column names are prefixed (out_*) on purpose. A function's
-- RETURNS TABLE columns are also output parameters, and naming one `business_id`
-- or `role` collides with the same-named table columns in the body queries and
-- raises "column reference is ambiguous".
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
    select 1 from public.business_members
    where business_id = _business_id
      and user_id = auth.uid()
      and status = 'active'
  ) then
    out_business_id := _business_id;
    out_business_name := _business_name;
    out_role := _role;
    return next;
    return;
  end if;

  -- Enforce the per-business seat limit before adding a new member.
  select count(*) into _active_count
  from public.business_members
  where business_id = _business_id
    and status = 'active';

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

-- Make the RPC callable by any authenticated user.
grant execute on function public.accept_invite_code(text) to authenticated;
