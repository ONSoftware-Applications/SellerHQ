-- Teams feature: members, permissions, invites

-- 1. Team members
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active', 'removed')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (business_id, user_id)
);

create index on public.business_members (business_id, status);
create index on public.business_members (user_id, status);

-- 2. Per-role page permissions (owner configures these)
create table if not exists public.business_role_permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  page text not null,
  can_view boolean not null default true,
  can_edit boolean not null default true,
  can_delete boolean not null default false,
  unique (business_id, role, page)
);

create index on public.business_role_permissions (business_id, role);

-- 3. Invites
create table if not exists public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

create index on public.business_invites (token, status);
create index on public.business_invites (business_id, status);

-- 4. RLS helper functions
create or replace function public.is_business_member(business_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.business_members
    where business_id = business_uuid
      and user_id = auth.uid()
      and status = 'active'
  );
$$ stable security definer set search_path = public, auth;

create or replace function public.is_business_owner(business_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.business_members
    where business_id = business_uuid
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$ stable security definer set search_path = public, auth;

create or replace function public.is_business_admin_or_owner(business_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.business_members
    where business_id = business_uuid
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
  );
$$ stable security definer set search_path = public, auth;

-- 5. Auto-create owner membership when business is created
create or replace function public.handle_new_business()
returns trigger as $$
declare
  owner_email text;
begin
  select email into owner_email from auth.users where id = new.owner_id;

  insert into public.business_members (business_id, user_id, email, role, status, joined_at)
  values (new.id, new.owner_id, owner_email, 'owner', 'active', now());

  -- Default permissions for admin role
  insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete) values
  (new.id, 'admin', 'inventory', true, true, true),
  (new.id, 'admin', 'sales', true, true, true),
  (new.id, 'admin', 'expenses', true, true, true),
  (new.id, 'admin', 'listings', true, true, true),
  (new.id, 'admin', 'forecasts', true, true, false),
  (new.id, 'admin', 'reports', true, true, false),
  (new.id, 'admin', 'tax', true, true, false),
  (new.id, 'admin', 'settings', true, true, false),
  (new.id, 'admin', 'team', true, true, false);

  -- Default permissions for member role
  insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete) values
  (new.id, 'member', 'inventory', true, true, false),
  (new.id, 'member', 'sales', true, true, false),
  (new.id, 'member', 'expenses', true, true, false),
  (new.id, 'member', 'listings', true, false, false),
  (new.id, 'member', 'forecasts', true, false, false),
  (new.id, 'member', 'reports', true, false, false),
  (new.id, 'member', 'tax', false, false, false),
  (new.id, 'member', 'settings', false, false, false),
  (new.id, 'member', 'team', false, false, false);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_business_created on public.businesses;
create trigger on_business_created
  after insert on public.businesses
  for each row execute function public.handle_new_business();

-- 6. RLS on new tables
alter table public.business_members enable row level security;
alter table public.business_role_permissions enable row level security;
alter table public.business_invites enable row level security;

create policy "Members can view their business members"
  on public.business_members for select
  using (is_business_member(business_id));

create policy "Owners can manage members"
  on public.business_members for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Members can update own membership"
  on public.business_members for update
  using (user_id = auth.uid());

create policy "Owners can manage permissions"
  on public.business_role_permissions for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Members can view permissions"
  on public.business_role_permissions for select
  using (is_business_member(business_id));

create policy "Owners can manage invites"
  on public.business_invites for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Members can view invites for their business"
  on public.business_invites for select
  using (is_business_member(business_id));
