-- Fix ghost balance for iswekawenn@gmail.com
-- The wallet is empty (0.00) but database shows 10.00 due to previous bug.
UPDATE vendor_balances
SET pending_balance = 0.00,
    updated_at = NOW()
FROM profiles
WHERE vendor_balances.vendor_id = profiles.id
AND profiles.email = 'iswekawenn@gmail.com';
