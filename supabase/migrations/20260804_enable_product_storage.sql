-- Allow authenticated users to upload/read/delete product photos in the public bucket
-- (RLS on storage.objects is enabled by default; these policies scope to the products bucket)
create policy "Users can upload product photos"
  on storage.objects for insert
  with check (
    bucket_id = 'products'
    and auth.role() = 'authenticated'
  );

create policy "Users can read product photos"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "Users can update their product photos"
  on storage.objects for update
  using (
    bucket_id = 'products'
    and auth.role() = 'authenticated'
  );

create policy "Users can delete their product photos"
  on storage.objects for delete
  using (
    bucket_id = 'products'
    and auth.role() = 'authenticated'
  );