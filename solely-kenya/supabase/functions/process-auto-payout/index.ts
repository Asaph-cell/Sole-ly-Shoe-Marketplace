/**
 * Automatic Payout Processor
 * Triggers when vendor balance reaches KES 1,500
 * Platform pays the KES 100 IntaSend payout fee
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_AUTO_PAYOUT = 1500;
const PAYOUT_FEE = 100;
const INTASEND_SECRET_KEY = Deno.env.get('INTASEND_SECRET_KEY');
const INTASEND_PUBLISHABLE_KEY = Deno.env.get('INTASEND_PUBLISHABLE_KEY');

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { vendor_id, balance } = await req.json();

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Verify balance is above minimum
        if (balance < MINIMUM_AUTO_PAYOUT) {
            throw new Error(`Balance ${balance} below minimum ${MINIMUM_AUTO_PAYOUT}`);
        }

        // Get vendor details
        const { data: vendor, error: vendorError } = await supabase
            .from('profiles')
            .select('mpesa_number, full_name, email')
            .eq('id', vendor_id)
            .single();

        if (vendorError || !vendor?.mpesa_number) {
            throw new Error('Vendor has no M-Pesa number');
        }

        // Platform pays the payout fee for auto payouts - vendor gets FULL balance
        // IntaSend charges: balance + 100 fee (platform absorbs the 100)
        const netPayout = balance;

        console.log(`Processing auto-payout: ${netPayout} KES to ${vendor.mpesa_number} for vendor ${vendor_id} (platform pays KES ${PAYOUT_FEE} fee)`);

        // Call IntaSend API for M-Pesa payout
        const intasendResponse = await fetch('https://api.intasend.com/api/v1/send-money/mpesa/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${INTASEND_SECRET_KEY}`,
            },
            body: JSON.stringify({
                currency: 'KES',
                transactions: [{
                    name: vendor.full_name || 'Vendor',
                    account: vendor.mpesa_number,
                    amount: netPayout,
                    narrative: 'Solely Kenya payout',
                }],
            }),
        });

        const intasendResult = await intasendResponse.json();

        if (!intasendResponse.ok) {
            console.error('IntaSend error:', intasendResult);
            throw new Error(`IntaSend error: ${JSON.stringify(intasendResult)}`);
        }

        console.log('IntaSend response:', intasendResult);

        // Record payout in database
        const { data: payout, error: payoutError } = await supabase
            .from('payouts')
            .insert({
                vendor_id,
                amount_ksh: netPayout,
                commission_amount: 0, // Already deducted from orders
                method: 'mpesa',
                reference: intasendResult.tracking_id || intasendResult.id,
                status: 'processing',
                trigger_type: 'automatic',
                balance_before: balance,
                fee_paid_by: 'platform',
            })
            .select()
            .single();

        if (payoutError) {
            console.error('Failed to record payout:', payoutError);
            throw payoutError;
        }

        // Update vendor balance to 0
        const { error: balanceError } = await supabase
            .from('vendor_balances')
            .update({
                pending_balance: 0,
                total_paid_out: supabase.rpc('increment', { x: netPayout }),
                last_payout_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('vendor_id', vendor_id);

        if (balanceError) {
            console.error('Failed to update balance:', balanceError);
        }

        console.log(`Auto-payout successful: ${payout.id}`);

        return new Response(
            JSON.stringify({
                success: true,
                payout_id: payout.id,
                amount: netPayout,
                tracking_id: intasendResult.tracking_id || intasendResult.id
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('Auto payout error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
