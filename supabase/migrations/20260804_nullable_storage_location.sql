-- Make storage_location nullable so only name is required to create a product
ALTER TABLE public.products ALTER COLUMN storage_location DROP NOT NULL;
