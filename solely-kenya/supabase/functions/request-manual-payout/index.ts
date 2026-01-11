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

        // Get the user from the authorization header
        const { data: { user }, error: userError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (userError || !user) throw new Error('Invalid user');

        // Get current balance
        const { data: balanceData, error: balanceError } = await supabase
            .from('vendor_balances')
            .select('pending_balance')
            .eq('vendor_id', user.id)
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
            .eq('id', user.id)
            .single();

        if (vendorError || !vendor?.mpesa_number) {
            throw new Error('M-Pesa number not set. Update in vendor settings.');
        }

        console.log(`Processing manual payout: ${netPayout} KES (fee: ${PAYOUT_FEE}) to ${vendor.mpesa_number}`);

        // Call IntaSend API
        const intasendResponse = await fetch('https://api.intasend.com/api/v1/send-money/mpesa/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('INTASEND_SECRET_KEY')}`,
            },
            body: JSON.stringify({
                currency: 'KES',
                transactions: [{
                    name: vendor.full_name || 'Vendor',
                    account: vendor.mpesa_number,
                    amount: netPayout,
                    narrative: 'Solely Kenya manual payout',
                }],
            }),
        });

        const intasendResult = await intasendResponse.json();

        if (!intasendResponse.ok) {
            console.error('IntaSend error:', intasendResult);
            throw new Error(`IntaSend error: ${JSON.stringify(intasendResult)}`);
        }

        console.log('IntaSend response:', intasendResult);

        // Record payout
        const { data: payout, error: payoutError } = await supabase
            .from('payouts')
            .insert({
                vendor_id: user.id,
                amount_ksh: netPayout,
                commission_amount: 0,
                method: 'mpesa',
                reference: intasendResult.tracking_id || intasendResult.id,
                status: 'processing',
                trigger_type: 'manual',
                balance_before: balance,
                fee_paid_by: 'vendor',
            })
            .select()
            .single();

        if (payoutError) {
            console.error('Failed to record payout:', payoutError);
            throw payoutError;
        }

        // Update vendor balance to 0
        const { error: updateError } = await supabase
            .from('vendor_balances')
            .update({
                pending_balance: 0,
                total_paid_out: supabase.rpc('increment', { x: netPayout }),
                last_payout_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('vendor_id', user.id);

        if (updateError) {
            console.error('Failed to update balance:', updateError);
        }

        console.log(`Manual payout successful: ${payout.id}`);

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
