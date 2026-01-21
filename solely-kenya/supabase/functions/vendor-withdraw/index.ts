/**
 * Vendor Withdraw
 * Instant withdrawal from vendor's IntaSend wallet to their M-Pesa
 * No minimum amount - vendors can withdraw any balance they have
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const INTASEND_SECRET_KEY = Deno.env.get('INTASEND_SECRET_KEY');
        if (!INTASEND_SECRET_KEY) {
            throw new Error('INTASEND_SECRET_KEY is not configured');
        }

        const { vendor_id, amount } = await req.json();

        if (!vendor_id) {
            throw new Error('vendor_id is required');
        }

        console.log(`[Vendor Withdraw] Processing withdrawal for vendor: ${vendor_id}, amount: ${amount || 'full balance'}`);

        // Get vendor profile for M-Pesa number
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('mpesa_number, full_name, intasend_wallet_id')
            .eq('id', vendor_id)
            .single();

        if (profileError || !profile) {
            throw new Error('Vendor profile not found');
        }

        if (!profile.mpesa_number) {
            throw new Error('No M-Pesa number configured. Please update your profile with your M-Pesa number.');
        }

        if (!profile.intasend_wallet_id) {
            throw new Error('No IntaSend wallet found. Please contact support.');
        }

        // Get vendor balance
        const { data: balance, error: balanceError } = await supabase
            .from('vendor_balances')
            .select('pending_balance, intasend_wallet_id')
            .eq('vendor_id', vendor_id)
            .single();

        if (balanceError || !balance) {
            throw new Error('Could not fetch balance');
        }

        // Determine withdrawal amount (full balance if not specified)
        let requestedAmount = amount ? Number(amount) : balance.pending_balance;

        if (requestedAmount <= 0) {
            throw new Error('No balance available for withdrawal');
        }

        if (requestedAmount > balance.pending_balance) {
            throw new Error(`Insufficient balance. Available: KES ${balance.pending_balance}`);
        }

        // Check actual IntaSend wallet balance first
        console.log(`[Vendor Withdraw] Checking IntaSend wallet balance for wallet: ${profile.intasend_wallet_id}`);

        const walletResponse = await fetch(`https://api.intasend.com/api/v1/wallets/${profile.intasend_wallet_id}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${INTASEND_SECRET_KEY}`,
            },
        });

        if (!walletResponse.ok) {
            const errorText = await walletResponse.text();
            console.error(`[Vendor Withdraw] Failed to fetch wallet balance: ${errorText}`);
            throw new Error('Unable to verify wallet balance. Please try again.');
        }

        const walletData = await walletResponse.json();
        const actualWalletBalance = parseFloat(walletData.current_balance || walletData.available_balance || 0);

        console.log(`[Vendor Withdraw] Database balance: KES ${balance.pending_balance}, Actual wallet balance: KES ${actualWalletBalance}`);

        // Use the LOWER of the two balances to be safe
        const safeWithdrawAmount = Math.min(requestedAmount, actualWalletBalance);

        if (safeWithdrawAmount !== requestedAmount) {
            console.warn(`[Vendor Withdraw] Balance mismatch detected! Database: ${balance.pending_balance}, Wallet: ${actualWalletBalance}. Using wallet balance.`);
            requestedAmount = safeWithdrawAmount;
        }

        if (requestedAmount <= 0) {
            throw new Error('No balance available in your wallet for withdrawal');
        }

        // Normalize phone number for IntaSend
        let normalizedPhone = profile.mpesa_number.replace(/[^0-9]/g, '');
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '254' + normalizedPhone.substring(1);
        } else if (normalizedPhone.startsWith('+254')) {
            normalizedPhone = normalizedPhone.substring(1);
        } else if (!normalizedPhone.startsWith('254')) {
            normalizedPhone = '254' + normalizedPhone;
        }

        // CRITICAL FIX: Send FULL wallet balance
        // IntaSend automatically deducts their B2C M-Pesa fee from the wallet BEFORE sending
        // So if wallet has KES 227 and fee is KES 20:
        // - IntaSend deducts: 227 - 20 = 207
        // - Then sends KES 207 to M-Pesa
        // 
        // We send the FULL balance and IntaSend handles the fee automatically
        const amountToSend = actualWalletBalance;

        // IntaSend B2C M-Pesa Fee Structure (from official API)
        // Up to KES 100: KES 11
        // KES 101-500: KES 13
        // KES 501-1,000: KES 15
        // KES 1,001-2,500: KES 20
        // Over KES 2,500: KES 25 (approximate)
        const estimatedFee = amountToSend <= 100 ? 11 :
            amountToSend <= 500 ? 13 :
                amountToSend <= 1000 ? 15 :
                    amountToSend <= 2500 ? 20 : 25;

        if (amountToSend <= 0) {
            throw new Error('Balance too low for withdrawal');
        }

        console.log(`[Vendor Withdraw] Wallet balance: KES ${actualWalletBalance}, Sending: KES ${amountToSend}, Estimated fee: KES ${estimatedFee}`);
        console.log(`[Vendor Withdraw] Vendor should receive approximately: KES ${amountToSend - estimatedFee}`);

        // Track what we're sending
        let executedAmount = amountToSend;
        let feeCharged = estimatedFee; // Use estimated fee initially
        let trackingId = '';

        // Send money from vendor's wallet to their M-Pesa
        const response = await fetch('https://api.intasend.com/api/v1/send-money/initiate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${INTASEND_SECRET_KEY}`,
            },
            body: JSON.stringify({
                provider: 'MPESA-B2C',
                currency: 'KES',
                wallet_id: profile.intasend_wallet_id,
                requires_approval: 'NO',
                transactions: [{
                    name: profile.full_name || 'Vendor',
                    account: normalizedPhone,
                    amount: amountToSend,
                    narrative: 'Solely Kenya withdrawal',
                }],
            }),
        });

        const responseText = await response.text();
        console.log(`[Vendor Withdraw] IntaSend response:`, responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(`IntaSend returned invalid JSON: ${responseText.substring(0, 200)}`);
        }

        if (!response.ok) {
            // Log full details for debugging
            console.error(`[Vendor Withdraw] IntaSend API failed. Status: ${response.status}, Response: ${responseText}`);
            console.error(`[Vendor Withdraw] Request was: wallet_id=${profile.intasend_wallet_id}, amount=${amountToSend}, phone=${normalizedPhone}`);

            const errorDetail = result.errors?.[0]?.detail || result.message || result.error || '';

            // DO NOT RETRY - retries can cause fees to be charged multiple times
            // Just fail and let the user try again with updated balance
            throw new Error(`Withdrawal failed: ${errorDetail || responseText.substring(0, 200)}`);
        } else {
            // Success! Track the transaction
            trackingId = result.tracking_id || result.id;
            console.log(`[Vendor Withdraw] Withdrawal initiated successfully. Tracking ID: ${trackingId}`);

            // Keep the estimated fee - the actual fee will be deducted by IntaSend
            // feeCharged already set to estimatedFee above
            console.log(`[Vendor Withdraw] Using estimated fee of KES ${feeCharged} for tracking`);
        }

        console.log(`[Vendor Withdraw] Withdrawal initiated successfully`);

        // Get current balance values for proper update
        const { data: currentBalance } = await supabase
            .from('vendor_balances')
            .select('pending_balance, total_paid_out')
            .eq('vendor_id', vendor_id)
            .single();

        const currentPaidOut = currentBalance?.total_paid_out || 0;
        const currentPending = currentBalance?.pending_balance || 0;

        // Update vendor balance
        // We deduct the full wallet balance that was sent
        // IntaSend deducts their fee automatically, but we deduct the full amount from our records
        const totalDeducted = amountToSend; // Full balance sent
        const newBalance = Math.max(0, currentPending - totalDeducted);

        // Track total paid out (amount received by vendor, not including fees)
        const newTotalPaidOut = currentPaidOut + executedAmount;

        const { error: updateError } = await supabase
            .from('vendor_balances')
            .update({
                pending_balance: newBalance,
                total_paid_out: newTotalPaidOut,
                last_payout_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('vendor_id', vendor_id);

        if (updateError) {
            console.error('[Vendor Withdraw] Balance update failed:', updateError);
        }

        // Record the payout
        await supabase.from('payouts').insert({
            vendor_id: vendor_id,
            amount_ksh: executedAmount, // Record the actual amount sent to their phone
            commission_amount: 0,
            method: 'mpesa',
            reference: trackingId || `withdraw-${Date.now()}`,
            status: 'paid',
            trigger_type: 'manual',
        });

        return new Response(
            JSON.stringify({
                success: true,
                amount: totalDeducted, // Total deducted from wallet
                net_amount: executedAmount, // Amount sent to M-Pesa
                fee: feeCharged,         // Transaction fee
                new_balance: newBalance,
                message: `KES ${executedAmount.toLocaleString()} sent to your M-Pesa! (Fee: KES ${feeCharged.toLocaleString()})`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('[Vendor Withdraw] Error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Withdrawal failed'
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

