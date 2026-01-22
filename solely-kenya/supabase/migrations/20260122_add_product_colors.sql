-- Add colors support to products and order_items
-- Mirrors the existing sizes functionality

-- Add colors array column to products table (same pattern as sizes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[];

-- Add color column to order_items for selected color (same pattern as size)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT;

-- Add comment for clarity
COMMENT ON COLUMN products.colors IS 'Available colors for this product, comma-separated by vendor';
COMMENT ON COLUMN order_items.color IS 'Color selected by buyer at checkout';
