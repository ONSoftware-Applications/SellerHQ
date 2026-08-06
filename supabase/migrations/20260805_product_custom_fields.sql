-- Custom product fields (Pro plan): free-form key/value metadata per product
alter table public.products add column if not exists custom_fields jsonb not null default '{}'::jsonb;
