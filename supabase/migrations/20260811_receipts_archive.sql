-- Receipts Archive: standalone receipt storage, separate from expenses.
-- Receipts live in the "receipts" storage bucket; this table tracks metadata.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  file_path text not null,
  file_url text not null,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text,
  uploaded_at timestamptz not null default now()
);

alter table public.receipts enable row level security;

-- Owners
create policy "Users can view receipts for their businesses"
  on public.receipts for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = receipts.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can insert receipts for their businesses"
  on public.receipts for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = receipts.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can update receipts for their businesses"
  on public.receipts for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = receipts.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can delete receipts for their businesses"
  on public.receipts for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = receipts.business_id and b.owner_id = auth.uid()
    )
  );

-- Team members (mirrors expenses policies)
create policy "Team members can view receipts"
  on public.receipts for select
  using (public.is_business_member(business_id));

create policy "Team members can insert receipts"
  on public.receipts for insert
  with check (public.is_business_member(business_id));

create policy "Team members can update receipts"
  on public.receipts for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Team admins and owners can delete receipts"
  on public.receipts for delete
  using (public.is_business_admin_or_owner(business_id));

-- Storage bucket for receipt files (public read so receipts can be viewed)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Any authenticated user can read receipt files (needed to display thumbnails)
create policy "Authenticated users can read receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

-- Uploads must be scoped to the uploader's own folder (first path segment = user id)
create policy "Users can upload receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own receipts"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
