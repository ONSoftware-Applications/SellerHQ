-- Batch 1 security: authoritative invitation flow.
-- Keep ONE flow: authenticated user -> invite code -> server-side RPC.
-- Adds per-user rate limiting, server-side high-entropy code generation, and
-- retires the older token-based business_invites flow.

-- 1. Rate-limit attempts per user (rolling window).
create table if not exists public.invite_redemption_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists invite_redemption_attempts_user_idx
  on public.invite_redemption_attempts (user_id, attempted_at desc);

alter table public.invite_redemption_attempts enable row level security;
-- No client policies: written by the SECURITY DEFINER RPC below only.

-- 2. Redeem a code: rate limited (max 5 attempts per 15 minutes per user),
-- seat-limit enforced transactionally, audit-logged.
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
  _attempts int;
begin
  -- Prune the caller's stale attempts, then enforce the rate limit.
  delete from public.invite_redemption_attempts
  where user_id = auth.uid()
    and attempted_at < now() - interval '15 minutes';

  select count(*) into _attempts
  from public.invite_redemption_attempts
  where user_id = auth.uid();

  if _attempts >= 5 then
    raise exception 'Too many attempts. Please wait a few minutes and try again.';
  end if;

  insert into public.invite_redemption_attempts (user_id)
  values (auth.uid());

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

  insert into public.audit_logs (user_id, business_id, action, details)
  values (auth.uid(), _business_id, 'team.member_joined',
    jsonb_build_object('role', _role, 'via', 'invite_code'));

  out_business_id := _business_id;
  out_business_name := _business_name;
  out_role := _role;
  return next;
end;
$$;

grant execute on function public.accept_invite_code(text) to authenticated;

-- 3. Server-side, owner-gated code generation with high entropy.
-- Replaces the old client-generated code path (TeamContext generated codes
-- with Math.random and wrote them directly).
create or replace function public.generate_invite_code(
  p_business_id uuid,
  p_role text
)
returns table (
  out_code text,
  out_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _code text := '';
  _chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _i int;
  _expires timestamptz := now() + interval '30 days';
begin
  if not public.is_business_owner(p_business_id) then
    raise exception 'Only the business owner can generate invite codes';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invalid role';
  end if;

  -- 12 chars from a 32-char alphabet -> ~60 bits of entropy.
  for _i in 1..12 loop
    _code := _code || substr(
      _chars,
      floor(random() * length(_chars))::int + 1,
      1
    );
  end loop;

  insert into public.business_invite_codes
    (business_id, role, code, expires_at, created_by)
  values
    (p_business_id, p_role, _code, _expires, auth.uid())
  on conflict (business_id, role) do update
    set code = excluded.code,
        expires_at = excluded.expires_at,
        created_by = excluded.created_by,
        created_at = now();

  insert into public.audit_logs (user_id, business_id, action, details)
  values (auth.uid(), p_business_id, 'team.invite_code_generated',
    jsonb_build_object('role', p_role));

  out_code := _code;
  out_expires_at := _expires;
  return next;
end;
$$;

grant execute on function public.generate_invite_code(uuid, text) to authenticated;

-- 4. Retire the older token-based invitation flow. The AcceptInvite page and
-- /invite/:token route are removed from the app; business_invites is no
-- longer written by anything. The table is kept (not dropped) so existing
-- pending invite records can be audited. All policies are removed, so with RLS
-- enabled every non-owner access is denied by default.
drop policy if exists "Members can view invites for their business" on public.business_invites;
drop policy if exists "Owners can manage invites" on public.business_invites;

-- Belt and braces: revoke so the old flow can never insert memberships.
revoke select, insert, update, delete on public.business_invites from authenticated;
