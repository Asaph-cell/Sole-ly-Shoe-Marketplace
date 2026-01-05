-- Add transfer fee tracking to payouts table (internal use only for admin reporting)
-- This tracks Paystack M-Pesa transfer fees that come from the platform commission

ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS transfer_fee_ksh NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS net_commission_ksh NUMERIC(10,2);

-- Add metadata column if not exists (for storing Paystack response details)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payouts' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.payouts ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.payouts.transfer_fee_ksh IS 'Paystack transfer fee deducted from platform commission (internal tracking)';
COMMENT ON COLUMN public.payouts.net_commission_ksh IS 'Commission minus transfer fee = actual platform revenue';
COMMENT ON COLUMN public.payouts.metadata IS 'Additional Paystack transfer details (transfer_code, recipient_code, etc.)';

-- Create index for efficient admin reporting queries
CREATE INDEX IF NOT EXISTS idx_payouts_status_paid ON public.payouts(status) WHERE status = 'paid';
