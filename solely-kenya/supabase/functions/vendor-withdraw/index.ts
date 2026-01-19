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
        const withdrawAmount = amount ? Number(amount) : balance.pending_balance;

        if (withdrawAmount <= 0) {
            throw new Error('No balance available for withdrawal');
        }

        if (withdrawAmount > balance.pending_balance) {
            throw new Error(`Insufficient balance. Available: KES ${balance.pending_balance}`);
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

        console.log(`[Vendor Withdraw] Sending KES ${withdrawAmount} to ${normalizedPhone}`);

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
                    amount: withdrawAmount,
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
            // Check for specific error types
            const errorMsg = JSON.stringify(result);
            if (errorMsg.includes('insufficient balance')) {
                throw new Error('Insufficient balance in wallet. Funds may still be clearing.');
            }
            throw new Error(`Withdrawal failed: ${errorMsg}`);
        }

        console.log(`[Vendor Withdraw] Withdrawal initiated successfully`);

        // Update vendor balance
        const newBalance = balance.pending_balance - withdrawAmount;
        const { error: updateError } = await supabase
            .from('vendor_balances')
            .update({
                pending_balance: newBalance,
                total_paid_out: supabase.sql`total_paid_out + ${withdrawAmount}`,
                last_payout_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('vendor_id', vendor_id);

        // Fallback update if the above fails
        if (updateError) {
            await supabase.from('vendor_balances')
                .update({
                    pending_balance: newBalance,
                    last_payout_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('vendor_id', vendor_id);
        }

        // Record the payout
        await supabase.from('payouts').insert({
            vendor_id: vendor_id,
            amount_ksh: withdrawAmount,
            method: 'mpesa',
            reference: result.tracking_id || result.id || `withdraw-${Date.now()}`,
            status: 'paid',
            trigger_type: 'manual',
        });

        return new Response(
            JSON.stringify({
                success: true,
                amount: withdrawAmount,
                new_balance: newBalance,
                message: `KES ${withdrawAmount.toLocaleString()} sent to your M-Pesa!`,
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
