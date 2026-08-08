-- Backfill default role permissions for existing businesses.
-- The handle_new_business trigger only populates permissions for NEW businesses,
-- so existing businesses need these defaults inserted manually.

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'inventory', true, true, true
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'sales', true, true, true
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'sales'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'expenses', true, true, true
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'expenses'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'listings', true, true, true
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'listings'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'forecasts', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'forecasts'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'reports', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'reports'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'tax', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'tax'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'settings', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'settings'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'admin', 'team', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'admin' and p.page = 'team'
);

-- Member defaults
insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'inventory', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'sales', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'sales'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'expenses', true, true, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'expenses'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'listings', true, false, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'listings'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'forecasts', true, false, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'forecasts'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'reports', true, false, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'reports'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'tax', false, false, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'tax'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'settings', false, false, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'settings'
);

insert into public.business_role_permissions (business_id, role, page, can_view, can_edit, can_delete)
select b.id, 'member', 'team', false, false, false
from public.businesses b
where not exists (
  select 1 from public.business_role_permissions p where p.business_id = b.id and p.role = 'member' and p.page = 'team'
);
