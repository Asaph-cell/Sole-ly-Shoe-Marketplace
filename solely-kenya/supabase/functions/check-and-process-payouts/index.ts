/**
 * Check and Process Automatic Payouts
 * Called by cron job every 2 hours
 * Finds all vendors with balance >= KES 1,500 and triggers automatic payouts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_AUTO_PAYOUT = 1500;

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        console.log(`[Auto-Payout Checker] Starting payout check...`);

        // Find all vendors with balance >= minimum payout threshold
        const { data: eligibleVendors, error: vendorsError } = await supabase
            .from('vendor_balances')
            .select('vendor_id, pending_balance')
            .gte('pending_balance', MINIMUM_AUTO_PAYOUT);

        if (vendorsError) {
            console.error('[Auto-Payout Checker] Error fetching vendor balances:', vendorsError);
            throw vendorsError;
        }

        if (!eligibleVendors || eligibleVendors.length === 0) {
            console.log('[Auto-Payout Checker] No vendors eligible for automatic payout');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No vendors eligible for payout',
                    count: 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[Auto-Payout Checker] Found ${eligibleVendors.length} vendor(s) eligible for payout`);

        // Process each vendor's payout
        const results = [];
        for (const vendor of eligibleVendors) {
            try {
                console.log(`[Auto-Payout Checker] Processing payout for vendor ${vendor.vendor_id}: KES ${vendor.pending_balance}`);

                // Call the process-auto-payout function
                const { data, error } = await supabase.functions.invoke('process-auto-payout', {
                    body: {
                        vendor_id: vendor.vendor_id,
                        balance: vendor.pending_balance
                    }
                });

                if (error) {
                    console.error(`[Auto-Payout Checker] Failed to process payout for ${vendor.vendor_id}:`, error);
                    results.push({
                        vendor_id: vendor.vendor_id,
                        success: false,
                        error: error.message
                    });
                } else {
                    console.log(`[Auto-Payout Checker] Successfully initiated payout for ${vendor.vendor_id}`);
                    results.push({
                        vendor_id: vendor.vendor_id,
                        success: true,
                        amount: vendor.pending_balance
                    });
                }
            } catch (error) {
                console.error(`[Auto-Payout Checker] Exception processing vendor ${vendor.vendor_id}:`, error);
                results.push({
                    vendor_id: vendor.vendor_id,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`[Auto-Payout Checker] Completed: ${successCount} successful, ${failCount} failed`);

        return new Response(
            JSON.stringify({
                success: true,
                total_checked: eligibleVendors.length,
                successful: successCount,
                failed: failCount,
                results: results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('[Auto-Payout Checker] Fatal error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
