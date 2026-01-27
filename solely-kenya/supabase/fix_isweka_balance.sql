-- Fix balance for iswekawenn@gmail.com to match IntaSend wallet (KES 95.43)
UPDATE vendor_balances
SET pending_balance = 95.43,
    updated_at = NOW()
FROM profiles
WHERE vendor_balances.vendor_id = profiles.id
AND profiles.email = 'iswekawenn@gmail.com';
