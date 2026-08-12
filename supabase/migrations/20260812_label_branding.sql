-- White-label branding on printed labels & QR codes (Business plan).
-- When enabled (with white-label), printed labels/QR outputs include the
-- business's logo and name instead of no branding.
alter table public.businesses add column if not exists label_branding boolean not null default false;
