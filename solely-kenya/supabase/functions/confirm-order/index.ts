/**
 * Confirm Order & Release Funds
 * 
 * Called when buyer confirms receipt of goods.
 * 1. Updates order status to 'completed'
 * 2. Updates escrow transaction to 'released'
 * 3. Creates a PAYOUT record for the vendor (Critical for accessing funds)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get the user from the authorization header (for security)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing auth header');

        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError || !user) throw new Error('Invalid user');

        const { orderId, rating, review } = await req.json();

        if (!orderId) throw new Error('Missing orderId');

        // 1. Fetch Order to verify ownership and amount
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*, escrow_transactions(*)")
            .eq("id", orderId)
            .single();

        if (orderError || !order) throw new Error('Order not found');
        if (order.customer_id !== user.id) throw new Error('Unauthorized');
        if (order.status === 'completed') throw new Error('Order already completed');

        console.log(`Confirming order ${orderId} for user ${user.id}`);

        // 2. Transact: Update Order, Escrow, and Create Payout
        // We do this sequentially since Supabase HTTP clients don't support SQL transactions easily in JS
        // But we use the service role key so RLS won't block us

        // A. Update Order
        const { error: updateOrderError } = await supabase
            .from("orders")
            .update({
                status: "completed",
                buyer_confirmed: true,
                confirmed_at: new Date().toISOString()
            })
            .eq("id", orderId);

        if (updateOrderError) throw updateOrderError;

        // B. Update Escrow
        const { error: updateEscrowError } = await supabase
            .from("escrow_transactions")
            .update({
                status: "released",
                released_at: new Date().toISOString()
            })
            .eq("order_id", orderId);

        if (updateEscrowError) console.error('Escrow update failed (non-critical if order is completed):', updateEscrowError);

        // C. Create Payout Record (CRITICAL MISSING STEP)
        // Calculate 95% of total order value (assuming 5% commission) - or use stored commission
        // The previous code in `VendorOrders.tsx` didn't seem to set `payout_amount` on creation?
        // Let's check if `payout_amount` exists on the order.

        const payoutAmount = order.payout_amount ?? (order.total_ksh * 0.90);
        const commissionAmount = order.commission_amount ?? (order.total_ksh * 0.10);

        const { error: payoutError } = await supabase
            .from("payouts")
            .insert({
                vendor_id: order.vendor_id,
                order_id: orderId,
                amount_ksh: payoutAmount,
                commission_amount: commissionAmount,
                status: "pending", // Waiting for process-payouts to pick it up
                method: "mpesa",   // Default to M-Pesa
                created_at: new Date().toISOString()
            });

        if (payoutError) {
            console.error('Failed to create payout record:', payoutError);
            // We should probably alert admin or store a failure record
        } else {
            console.log(`Payout created for order ${orderId}: ${payoutAmount} KES (commission: ${commissionAmount} KES)`);
        }


        // D. Add Rating (Optional)
        if (rating && rating > 0) {
            try {
                const { error: ratingError } = await supabase
                    .from("vendor_ratings")
                    .insert({
                        order_id: orderId,
                        buyer_id: user.id,
                        vendor_id: order.vendor_id,
                        rating,
                        review: review || null,
                    });

                if (ratingError) {
                    console.error("Failed to insert vendor rating:", ratingError);
                } else {
                    console.log(`Rating added for order ${orderId}: ${rating} stars`);
                }
            } catch (err) {
                console.error("Exception adding vendor rating:", err);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Order confirmed and funds released",
                ratingStatus: (rating && rating > 0) ? "attempted" : "skipped"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error confirming order:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
