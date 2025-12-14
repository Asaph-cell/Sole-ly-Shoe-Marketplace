/**
 * Auto-Refund Unshipped Orders
 * 
 * This scheduled Edge Function runs periodically to:
 * 1. Find orders confirmed by vendor but not shipped within 3 days
 * 2. Cancel them automatically
 * 3. Update escrow to refunded status
 * 4. Notify the customer
 * 
 * Schedule: Run every hour via Supabase cron or external scheduler
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
        // 1. Status = processing (confirmed but not shipped)
        // 2. Status = pending_shipment
        // 3. Confirmed more than 3 days ago (72 hours)
        const cutoffTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const { data: unshippedOrders, error: fetchError } = await supabase
            .from("orders")
            .select(`
                id,
                vendor_id,
                customer_id,
                total_ksh,
                created_at,
                confirmed_at,
                order_items(product_name, quantity),
                order_shipping_details(recipient_name, phone, email)
            `)
            .in("status", ["processing", "pending_shipment", "confirmed"])
            .lt("created_at", cutoffTime);  // Use created_at as fallback if no confirmed_at

        if (fetchError) {
            console.error("Error fetching unshipped orders:", fetchError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch unshipped orders" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!unshippedOrders || unshippedOrders.length === 0) {
            console.log("No unshipped orders to refund");
            return new Response(
                JSON.stringify({ message: "No unshipped orders found", refunded: 0 }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Found ${unshippedOrders.length} unshipped orders to auto-refund`);

        const results = {
            refunded: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const order of unshippedOrders) {
            try {
                // 1. Cancel the order
                const { error: cancelError } = await supabase
                    .from("orders")
                    .update({
                        status: "cancelled_no_shipment",
                        cancelled_at: new Date().toISOString(),
                        vendor_notes: "Auto-cancelled: Vendor did not ship within 3 days",
                    })
                    .eq("id", order.id);

                if (cancelError) {
                    throw new Error(`Failed to cancel order: ${cancelError.message}`);
                }

                // 2. Update escrow to refunded
                const { error: escrowError } = await supabase
                    .from("escrow_transactions")
                    .update({
                        status: "refunded",
                        released_at: new Date().toISOString(),
                    })
                    .eq("order_id", order.id);

                if (escrowError) {
                    console.warn(`Escrow update warning for order ${order.id}:`, escrowError);
                }

                // 3. Notify customer about refund
                const shippingDetails = order.order_shipping_details?.[0];
                if (shippingDetails?.email) {
                    fetch(`${supabaseUrl}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({
                            to: shippingDetails.email,
                            subject: `Order #${order.id.slice(0, 8)} - Refund Processed`,
                            html: `
                                <h2>Your Order Has Been Cancelled & Refunded</h2>
                                <p>Dear ${shippingDetails.recipient_name || 'Customer'},</p>
                                <p>Unfortunately, the vendor did not ship your order within the required 3-day window.</p>
                                <p>Your payment of <strong>KES ${order.total_ksh?.toLocaleString()}</strong> will be refunded to your original payment method.</p>
                                <p>We apologize for the inconvenience.</p>
                                <p>Best regards,<br>Solely Marketplace</p>
                            `,
                        }),
                    }).catch(err => console.log(`Email notification failed for ${order.id}:`, err));
                }

                console.log(`Order ${order.id} auto-cancelled for no shipment, refund initiated`);
                results.refunded++;
            } catch (error) {
                console.error(`Failed to process order ${order.id}:`, error);
                results.failed++;
                results.errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        console.log(`Auto-refund complete: ${results.refunded} refunded, ${results.failed} failed`);

        return new Response(
            JSON.stringify({
                message: "Auto-refund job completed",
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
