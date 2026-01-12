/**
 * Manual Payout Request
 * Allows vendors to request early payout (min KES 500)
 * Vendor pays the KES 100 IntaSend fee from their balance
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_MANUAL_PAYOUT = 500;
const PAYOUT_FEE = 100;

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing auth header');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Decode JWT to get user ID
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');

        const payload = JSON.parse(atob(parts[1]));
        const userId = payload.sub;

        if (!userId) throw new Error('Invalid user token');

        console.log(`Manual payout requested by user: ${userId}`);

        // Get current balance
        const { data: balanceData, error: balanceError } = await supabase
            .from('vendor_balances')
            .select('pending_balance')
            .eq('vendor_id', userId)
            .single();

        if (balanceError) throw balanceError;

        const balance = balanceData?.pending_balance || 0;

        // Validate minimum
        if (balance < MINIMUM_MANUAL_PAYOUT) {
            throw new Error(`Minimum manual payout is KES ${MINIMUM_MANUAL_PAYOUT}. Current balance: KES ${balance}`);
        }

        // Vendor pays the fee for manual payouts
        const netPayout = balance - PAYOUT_FEE;

        if (netPayout <= 0) {
            throw new Error('Insufficient balance to cover payout fee');
        }

        // Get vendor details
        const { data: vendor, error: vendorError } = await supabase
            .from('profiles')
            .select('mpesa_number, full_name, email')
            .eq('id', userId)
            .single();

        if (vendorError || !vendor?.mpesa_number) {
            throw new Error('M-Pesa number not set. Update in vendor settings.');
        }

        // Normalize phone number to 2547... format (required by IntaSend)
        let normalizedPhone = vendor.mpesa_number.replace(/[^0-9]/g, ''); // Remove non-digits
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '254' + normalizedPhone.substring(1); // 0722... -> 254722...
        } else if (normalizedPhone.startsWith('+254')) {
            normalizedPhone = normalizedPhone.substring(1); // +254... -> 254...
        } else if (!normalizedPhone.startsWith('254')) {
            normalizedPhone = '254' + normalizedPhone; // Add 254 prefix if missing
        }

        console.log(`Processing manual payout: ${netPayout} KES (fee: ${PAYOUT_FEE}) to ${normalizedPhone}`);

        // Check if INTASEND_SECRET_KEY is set
        const intasendKey = Deno.env.get('INTASEND_SECRET_KEY');
        if (!intasendKey) {
            throw new Error('INTASEND_SECRET_KEY is not configured');
        }

        // Call IntaSend API - Using send-money/initiate endpoint for M-Pesa B2C
        const intasendResponse = await fetch('https://api.intasend.com/api/v1/send-money/initiate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${intasendKey}`,
            },
            body: JSON.stringify({
                provider: 'MPESA-B2C',
                currency: 'KES',
                requires_approval: 'NO', // Auto-approve payout
                transactions: [{
                    name: vendor.full_name || 'Vendor',
                    account: normalizedPhone,
                    amount: netPayout,
                    narrative: 'Solely Kenya payout',
                }],
            }),
        });

        // Check response content type before parsing
        const contentType = intasendResponse.headers.get('content-type');
        let intasendResult;

        if (contentType && contentType.includes('application/json')) {
            intasendResult = await intasendResponse.json();
        } else {
            const textResponse = await intasendResponse.text();
            console.error('IntaSend returned non-JSON response:', textResponse.substring(0, 500));
            throw new Error(`IntaSend API error (status ${intasendResponse.status}): Response was not JSON. Check API key.`);
        }

        if (!intasendResponse.ok) {
            console.error('IntaSend error:', intasendResult);
            throw new Error(`IntaSend error: ${JSON.stringify(intasendResult)}`);
        }

        console.log('IntaSend response:', intasendResult);

        // Record payout - order_id might fail due to FK constraint, so handle gracefully
        // since payment already went through
        let payoutId = null;
        try {
            const { data: payout, error: payoutError } = await supabase
                .from('payouts')
                .insert({
                    vendor_id: userId,
                    amount_ksh: netPayout,
                    commission_amount: 0,
                    method: 'mpesa',
                    reference: intasendResult.tracking_id || intasendResult.id || `manual-${Date.now()}`,
                    status: 'completed', // Already completed since payment went through
                })
                .select()
                .single();

            if (payoutError) {
                console.error('Failed to record payout (non-fatal):', JSON.stringify(payoutError));
            } else {
                payoutId = payout?.id;
                console.log('Payout recorded:', payoutId);
            }
        } catch (err) {
            console.error('Payout record error (non-fatal):', err);
        }

        // Update vendor balance to 0 and increment total_paid_out
        // First get current total_paid_out
        const { data: currentBalanceData } = await supabase
            .from('vendor_balances')
            .select('total_paid_out')
            .eq('vendor_id', userId)
            .single();

        const currentPaidOut = currentBalanceData?.total_paid_out || 0;

        const { error: updateError } = await supabase
            .from('vendor_balances')
            .update({
                pending_balance: 0,
                total_paid_out: currentPaidOut + netPayout,
                last_payout_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('vendor_id', userId);

        if (updateError) {
            console.error('Failed to update balance:', updateError);
        }

        console.log(`Manual payout successful: ${payoutId || 'no-record'}`);

        return new Response(
            JSON.stringify({
                success: true,
                amount: netPayout,
                fee: PAYOUT_FEE,
                balance_before: balance,
                tracking_id: intasendResult.tracking_id || intasendResult.id
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('Manual payout error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
