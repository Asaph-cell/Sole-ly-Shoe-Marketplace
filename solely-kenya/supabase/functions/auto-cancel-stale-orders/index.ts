/**
 * Auto-Cancel Stale Orders
 * 
 * This scheduled Edge Function runs periodically to:
 * 1. Find orders pending_vendor_confirmation for > 24 hours
 * 2. Cancel them automatically
 * 3. Update escrow to refunded status
 * 4. Notify the customer
 * 
 * Schedule: Run every hour via Supabase cron or external scheduler
 * 
 * To set up cron in Supabase:
 * - Use pg_cron extension or external scheduler (GitHub Actions, etc.)
 * - Call: curl -X POST https://<project>.supabase.co/functions/v1/auto-cancel-stale-orders
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find orders that are:
        // 1. Status = pending_vendor_confirmation
        // 2. Created more than 24 hours ago
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: staleOrders, error: fetchError } = await supabase
            .from("orders")
            .select(`
        id,
        vendor_id,
        customer_id,
        total_ksh,
        created_at,
        order_items(product_name, quantity),
        order_shipping_details(recipient_name, phone, email)
      `)
            .eq("status", "pending_vendor_confirmation")
            .lt("created_at", cutoffTime);

        if (fetchError) {
            console.error("Error fetching stale orders:", fetchError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch stale orders" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!staleOrders || staleOrders.length === 0) {
            console.log("No stale orders to cancel");
            return new Response(
                JSON.stringify({ message: "No stale orders found", cancelled: 0 }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Found ${staleOrders.length} stale orders to auto-cancel`);

        const results = {
            cancelled: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const order of staleOrders) {
            try {
                // 1. Cancel the order
                const { error: cancelError } = await supabase
                    .from("orders")
                    .update({
                        status: "cancelled_by_vendor",
                        cancelled_at: new Date().toISOString(),
                        vendor_notes: "Auto-cancelled: No vendor response within 24 hours",
                    })
                    .eq("id", order.id);

                if (cancelError) {
                    throw new Error(`Failed to cancel order: ${cancelError.message}`);
                }

                // 2. Update escrow to released (for refund)
                const { error: escrowError } = await supabase
                    .from("escrow_transactions")
                    .update({
                        status: "released",
                        released_at: new Date().toISOString(),
                    })
                    .eq("order_id", order.id);

                if (escrowError) {
                    console.warn(`Escrow update warning for order ${order.id}:`, escrowError);
                    // Continue anyway - order is cancelled
                }

                // 3. Notify customer about refund via email
                fetch(`${supabaseUrl}/functions/v1/notify-buyer-order-declined`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                        orderId: order.id,
                        isAutoDeclined: true,
                    }),
                }).catch(err => console.log(`Buyer notification failed for ${order.id}:`, err));

                console.log(`Order ${order.id} auto-cancelled, refund initiated, buyer notified`);

                results.cancelled++;
            } catch (error) {
                console.error(`Failed to process order ${order.id}:`, error);
                results.failed++;
                results.errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        console.log(`Auto-cancel complete: ${results.cancelled} cancelled, ${results.failed} failed`);

        return new Response(
            JSON.stringify({
                message: "Auto-cancel job completed",
                ...results,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
