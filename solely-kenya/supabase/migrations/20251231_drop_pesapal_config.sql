-- Drop legacy Pesapal configuration table (migrated to Paystack)
-- This table is no longer used and triggers RLS security warnings

DROP TABLE IF EXISTS public.pesapal_config CASCADE;
