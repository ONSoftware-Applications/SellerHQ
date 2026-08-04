-- Add labels column to products table for custom tags/labels
ALTER TABLE products ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';

COMMENT ON COLUMN products.labels IS 'Custom labels/tags for product organisation and filtering';
