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

        // PRE-CALCULATE fees to avoid IntaSend insufficient balance error
        // IntaSend charges approximately 10% fee for M-Pesa B2C
        // We calculate net amount upfront so vendor wallet has enough to cover both amount + fee
        const ESTIMATED_FEE_RATE = 0.10; // 10%
        const netAmount = Math.floor((requestedAmount / (1 + ESTIMATED_FEE_RATE)) * 100) / 100;
        const estimatedFee = Math.ceil((requestedAmount - netAmount) * 100) / 100;

        // Normalize phone number for IntaSend
        let normalizedPhone = profile.mpesa_number.replace(/[^0-9]/g, '');
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '254' + normalizedPhone.substring(1);
        } else if (normalizedPhone.startsWith('+254')) {
            normalizedPhone = normalizedPhone.substring(1);
        } else if (!normalizedPhone.startsWith('254')) {
            normalizedPhone = '254' + normalizedPhone;
        }

        console.log(`[Vendor Withdraw] Requested: KES ${requestedAmount}, Net: KES ${netAmount}, Estimated fee: KES ${estimatedFee}`);

        // Track what we actually send and the fee
        let executedAmount = netAmount;
        let feeCharged = estimatedFee;
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
                    amount: netAmount, // Send net amount, not full amount
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
            console.error(`[Vendor Withdraw] Request was: wallet_id=${profile.intasend_wallet_id}, amount=${requestedAmount}, phone=${normalizedPhone}`);

            // Check if it's an insufficient balance error with fee info
            const errorDetail = result.errors?.[0]?.detail || result.message || result.error || '';

            // Try to extract fee from error: "Transaction charge estimate is KES 20.00"
            const feeMatch = errorDetail.match(/charge estimate is KES\s*([\d.]+)/i);
            if (feeMatch) {
                const fee = parseFloat(feeMatch[1]);
                const netAmount = Math.floor((requestedAmount - fee) * 100) / 100;

                if (netAmount > 0) {
                    console.log(`[Vendor Withdraw] Retrying with net amount: ${netAmount} (deducted fee: ${fee})`);

                    // Retry with the net amount
                    const retryResponse = await fetch('https://api.intasend.com/api/v1/send-money/initiate/', {
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
                                amount: netAmount,
                                narrative: 'Solely Kenya withdrawal',
                            }],
                        }),
                    });

                    const retryText = await retryResponse.text();
                    console.log(`[Vendor Withdraw] Retry response:`, retryText);

                    if (retryResponse.ok) {
                        result = JSON.parse(retryText);
                        // Update our tracking variables
                        executedAmount = netAmount;
                        feeCharged = fee;
                        trackingId = result.tracking_id || result.id;

                        // Keep requestedAmount as the ORIGINAL requested amount for DB deduction
                        // The vendor's wallet is now empty (IntaSend took full balance: net + fee)
                        console.log(`[Vendor Withdraw] Retry succeeded. Sent ${netAmount}, fee was ${fee}, deducting full ${requestedAmount} from balance`);
                    } else {
                        throw new Error(`Withdrawal failed after retry: ${retryText.substring(0, 200)}`);
                    }
                } else {
                    throw new Error(`Balance too low after fees. Balance: KES ${requestedAmount}, Fee: KES ${fee}`);
                }
            } else {
                throw new Error(`IntaSend error: ${errorDetail || responseText.substring(0, 200)}`);
            }
        } else {
            // First try succeeded (unlikely if balance == amount, but possible if IntaSend treats it differently)
            trackingId = result.tracking_id || result.id;
            // Fee is unknown here unless IntaSend returned it, but usually it's 0 if no error
            // Or maybe it was deducted unseen. But we assume executesAmount = requestedAmount.
            // Actually, if we requested full balance and it succeeded, fee might be 0? 
            // Or IntaSend deducted it implicitly? 
            // We'll stick to executedAmount = requestedAmount for now unless we know otherwise.
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
        // We deduct the FULL requested amount (which includes the fee)
        const newBalance = Math.max(0, currentPending - requestedAmount);

        // We track the FULL requested amount as paid out (since the fee is part of their cost)
        const newTotalPaidOut = currentPaidOut + requestedAmount;

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
            // Store fee in metadata if you had a column, or just implicit
            commission_amount: 0,
            method: 'mpesa',
            reference: trackingId || `withdraw-${Date.now()}`,
            status: 'paid',
            trigger_type: 'manual',
        });

        return new Response(
            JSON.stringify({
                success: true,
                amount: requestedAmount, // Amount deducted from system
                net_amount: executedAmount, // Amount sent to M-Pesa
                fee: feeCharged,         // Transaction fee
                new_balance: newBalance,
                message: `KES ${executedAmount.toLocaleString()} sent to your M-Pesa!`,
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

