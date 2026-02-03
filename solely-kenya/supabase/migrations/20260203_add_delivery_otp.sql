-- Add delivery OTP columns to orders table
-- This migration adds support for OTP-based delivery confirmation

-- Add OTP columns
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS delivery_otp TEXT,
  ADD COLUMN IF NOT EXISTS otp_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- Create index for OTP lookups (helps when vendor verifies OTP)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_otp ON orders(delivery_otp) WHERE delivery_otp IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN orders.delivery_otp IS 'OTP code sent to buyer, entered by vendor to confirm delivery';
COMMENT ON COLUMN orders.otp_generated_at IS 'Timestamp when OTP was generated/regenerated';
COMMENT ON COLUMN orders.otp_verified_at IS 'Timestamp when vendor successfully verified OTP';
