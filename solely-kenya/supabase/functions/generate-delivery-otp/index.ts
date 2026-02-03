/**
 * Generate Delivery OTP
 * 
 * Called when vendor marks order as "Shipped" or "Ready for Pickup".
 * Generates a 6-digit OTP and stores it in the order.
 * The OTP is sent to the buyer (in-app + email).
 * Vendor must collect this OTP from buyer at delivery to confirm.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get the user from the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing auth header');

        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');

        const payload = JSON.parse(atob(parts[1]));
        const userId = payload.sub;

        if (!userId) throw new Error('Invalid user token');

        const { orderId, isResend } = await req.json();

        if (!orderId) throw new Error('Missing orderId');

        // Verify the order belongs to this vendor
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("id, vendor_id, status, customer_id, delivery_otp")
            .eq("id", orderId)
            .single();

        if (orderError || !order) throw new Error('Order not found');
        if (order.vendor_id !== userId) throw new Error('Unauthorized - not your order');

        // Validate order status - can generate OTP for accepted, shipped, or arrived orders
        const validStatuses = ['accepted', 'shipped', 'arrived'];
        if (!validStatuses.includes(order.status)) {
            throw new Error(`Cannot generate OTP for order in status: ${order.status}`);
        }

        // Generate new OTP (invalidates any previous OTP)
        const otp = generateOTP();
        const now = new Date().toISOString();

        // Update order with new OTP
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                delivery_otp: otp,
                otp_generated_at: now,
                otp_verified_at: null, // Clear any previous verification
            })
            .eq("id", orderId);

        if (updateError) throw updateError;

        console.log(`OTP generated for order ${orderId}: ${otp} (isResend: ${isResend || false})`);

        // TODO: Send email/push notification to buyer with OTP
        // For now, the buyer will see OTP in-app on their Orders page

        return new Response(
            JSON.stringify({
                success: true,
                message: isResend ? "New OTP generated and sent to buyer" : "OTP generated successfully",
                // OTP is NOT returned to vendor for security - only buyer sees it
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error generating delivery OTP:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
