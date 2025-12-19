-- Add confirmed_at column to orders table
-- This column stores when the buyer confirmed receipt of the order

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN orders.confirmed_at IS 'Timestamp when buyer confirmed receipt of order';
