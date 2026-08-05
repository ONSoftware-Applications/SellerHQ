-- Business customization (Business plan): logo + accent colour
alter table public.businesses add column if not exists logo_url text;
alter table public.businesses add column if not exists accent_color text;

-- Storage bucket for business assets (logos)
insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

create policy "Public read business assets"
  on storage.objects for select
  using (bucket_id = 'business-assets');

create policy "Authenticated upload business assets"
  on storage.objects for insert
  with check (bucket_id = 'business-assets' and auth.role() = 'authenticated');

create policy "Authenticated update business assets"
  on storage.objects for update
  using (bucket_id = 'business-assets' and auth.role() = 'authenticated');
