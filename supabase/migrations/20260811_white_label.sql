-- White-label branding (Business plan): replace SellerHQ branding in the app
-- shell with the business's own name and logo.
alter table public.businesses add column if not exists white_label boolean not null default false;
alter table public.businesses add column if not exists app_name text;
