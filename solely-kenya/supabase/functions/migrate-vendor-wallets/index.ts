/**
 * Create Wallets for Existing Vendors
 * One-time migration script to create IntaSend wallets for all existing vendors
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

        console.log('[Migrate Vendor Wallets] Starting migration...');

        // Find all vendors without IntaSend wallets
        const { data: vendors, error: vendorsError } = await supabase
            .from('profiles')
            .select('id, store_name, full_name, intasend_wallet_id')
            .not('store_name', 'is', null)
            .or('intasend_wallet_id.is.null,intasend_wallet_id.eq.');

        if (vendorsError) {
            throw vendorsError;
        }

        if (!vendors || vendors.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No vendors need wallet creation',
                    count: 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[Migrate Vendor Wallets] Found ${vendors.length} vendors without wallets`);

        const results = [];
        for (const vendor of vendors) {
            try {
                console.log(`[Migrate Vendor Wallets] Creating wallet for ${vendor.store_name || vendor.id}`);

                const { data, error } = await supabase.functions.invoke('create-vendor-wallet', {
                    body: { vendor_id: vendor.id }
                });

                if (error) {
                    console.error(`Failed for ${vendor.id}:`, error);
                    results.push({ vendor_id: vendor.id, success: false, error: error.message });
                } else {
                    console.log(`Created wallet ${data?.wallet_id} for ${vendor.store_name}`);
                    results.push({ vendor_id: vendor.id, success: true, wallet_id: data?.wallet_id });
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`Exception for ${vendor.id}:`, err);
                results.push({ vendor_id: vendor.id, success: false, error: String(err) });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return new Response(
            JSON.stringify({
                success: true,
                message: `Created ${successCount} wallets, ${failCount} failed`,
                total: vendors.length,
                successCount,
                failCount,
                results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('[Migrate Vendor Wallets] Error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Migration failed'
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
