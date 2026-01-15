-- Add buyer evidence URLs column to disputes table
-- This separates buyer evidence from vendor evidence to prevent overwrites

-- Add the new buyer_evidence_urls column
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS buyer_evidence_urls TEXT[];

-- Rename existing evidence_urls to vendor_evidence_urls for clarity
-- First check if the vendor_evidence_urls column doesn't exist yet
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'disputes' AND column_name = 'evidence_urls') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'disputes' AND column_name = 'vendor_evidence_urls') THEN
        -- Rename the column
        ALTER TABLE public.disputes RENAME COLUMN evidence_urls TO vendor_evidence_urls;
    END IF;
END $$;

-- Migrate existing data: move evidence_urls to buyer_evidence_urls where vendor hasn't responded
-- (Only for disputes where vendor_response is NULL - meaning the evidence was uploaded by buyer)
UPDATE public.disputes
SET buyer_evidence_urls = vendor_evidence_urls,
    vendor_evidence_urls = NULL
WHERE vendor_response IS NULL 
  AND vendor_evidence_urls IS NOT NULL
  AND buyer_evidence_urls IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.disputes.buyer_evidence_urls IS 'Evidence images uploaded by buyer when filing the dispute';
COMMENT ON COLUMN public.disputes.vendor_evidence_urls IS 'Evidence images uploaded by vendor when responding to the dispute';
