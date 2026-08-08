-- QR relay: lets a phone's Scan page push scanned codes to a laptop
-- running the Relay page, streamed live over Supabase Realtime.
-- This replaces the Bluetooth pairing approach (no device pairing needed).
create table if not exists public.qr_relay_scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists qr_relay_scans_business_idx
  on public.qr_relay_scans (business_id, created_at desc);

alter table public.qr_relay_scans enable row level security;

create policy "Team members can view relay scans"
  on public.qr_relay_scans for select
  using (public.is_business_member(business_id));

create policy "Team members can insert relay scans"
  on public.qr_relay_scans for insert
  with check (public.is_business_member(business_id));

create policy "Team members can delete relay scans"
  on public.qr_relay_scans for delete
  using (public.is_business_member(business_id));

-- Broadcast inserted rows to connected Relay pages.
alter table public.qr_relay_scans replica identity full;
alter publication supabase_realtime add table public.qr_relay_scans;