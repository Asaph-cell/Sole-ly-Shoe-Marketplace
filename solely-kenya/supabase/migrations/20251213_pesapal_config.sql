-- Pesapal configuration table for IPN registration and token caching
-- Run this migration to add Pesapal support

-- Create pesapal_config table
CREATE TABLE IF NOT EXISTS pesapal_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  ipn_id TEXT,
  ipn_notification_type TEXT DEFAULT 'GET',
  auth_token TEXT,
  token_expiry TIMESTAMPTZ,
  sandbox_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default row
INSERT INTO pesapal_config (id, sandbox_mode)
VALUES ('default', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies (allow edge functions with service role to access)
ALTER TABLE pesapal_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions)
CREATE POLICY "pesapal_config_service_role" ON pesapal_config
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add pesapal to the payment_gateway enum if not exists
DO $$
BEGIN
  -- Check if 'pesapal' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'payment_gateway'::regtype 
    AND enumlabel = 'pesapal'
  ) THEN
    ALTER TYPE payment_gateway ADD VALUE 'pesapal';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Already exists, ignore
    NULL;
END $$;
