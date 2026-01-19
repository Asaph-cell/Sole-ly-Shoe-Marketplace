-- ================================================================
-- DISABLE AUTOMATIC PAYOUTS & CREATE VENDOR WALLETS
-- Run this SQL in Supabase Dashboard > SQL Editor
-- ================================================================

-- Step 1: Disable the old automatic payout cron job
SELECT cron.unschedule('process-auto-payouts');

-- Step 2: View existing vendors who need wallets
SELECT 
    p.id as vendor_id,
    p.store_name,
    p.full_name,
    p.intasend_wallet_id,
    vb.pending_balance
FROM profiles p
LEFT JOIN vendor_balances vb ON vb.vendor_id = p.id
WHERE p.store_name IS NOT NULL
  AND (p.intasend_wallet_id IS NULL OR p.intasend_wallet_id = '');

-- Note: After running this, you'll need to create wallets for each vendor
-- by calling the create-vendor-wallet function for each vendor_id
