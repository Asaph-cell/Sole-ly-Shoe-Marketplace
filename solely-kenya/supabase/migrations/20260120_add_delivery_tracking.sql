-- Add delivery tracking columns to order_shipping_details
-- Enables real-time location sharing during delivery

ALTER TABLE order_shipping_details 
ADD COLUMN IF NOT EXISTS delivery_tracking_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_current_latitude decimal(10, 8),
ADD COLUMN IF NOT EXISTS delivery_current_longitude decimal(11, 8),
ADD COLUMN IF NOT EXISTS delivery_location_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS tracking_started_at timestamptz,
ADD COLUMN IF NOT EXISTS tracking_stopped_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN order_shipping_details.delivery_tracking_enabled IS 'Whether vendor has enabled live GPS tracking for this delivery';
COMMENT ON COLUMN order_shipping_details.delivery_current_latitude IS 'Vendor''s current latitude during active delivery';
COMMENT ON COLUMN order_shipping_details.delivery_current_longitude IS 'Vendor''s current longitude during active delivery';
COMMENT ON COLUMN order_shipping_details.delivery_location_updated_at IS 'Last time vendor''s location was updated';
COMMENT ON COLUMN order_shipping_details.tracking_started_at IS 'When vendor started sharing their location';
COMMENT ON COLUMN order_shipping_details.tracking_stopped_at IS 'When vendor stopped sharing their location';

-- Enable realtime for order_shipping_details if not already enabled
-- This allows buyers to receive live location updates
DO $$
BEGIN
    -- Check if realtime is already enabled for this table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'order_shipping_details'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_shipping_details;
    END IF;
END $$;
