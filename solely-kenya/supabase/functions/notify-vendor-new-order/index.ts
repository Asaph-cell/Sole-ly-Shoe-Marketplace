/**
 * Notify Vendor of New Order
 * 
 * This Edge Function is triggered when a new order is created.
 * It sends email and in-app notifications to the vendor about the new order.
 * 
 * Can be triggered by:
 * 1. Database webhook on orders insert
 * 2. Called directly from the checkout flow
 * 
 * Setup:
 * 1. Create a database webhook in Supabase Dashboard
 * 2. Events: INSERT on orders table
 * 3. URL: https://<project>.supabase.co/functions/v1/notify-vendor-new-order
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, emailTemplates } from "../_shared/email-service.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderPayload {
    type: "INSERT";
    table: "orders";
    record: {
        id: string;
        vendor_id: string;
        customer_id: string;
        total_ksh: number;
        status: string;
        created_at: string;
    };
    schema: "public";
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse the webhook payload or direct call
        const body = await req.json();

        let orderId: string;
        let vendorId: string;
        let totalKsh: number;

        // Check if this is a webhook payload or direct call
        if (body.type === "INSERT" && body.table === "orders") {
            // Webhook payload
            const payload = body as OrderPayload;
            orderId = payload.record.id;
            vendorId = payload.record.vendor_id;
            totalKsh = payload.record.total_ksh;
        } else if (body.orderId) {
            // Direct call
            orderId = body.orderId;
            vendorId = body.vendorId;
            totalKsh = body.totalKsh;
        } else {
            return new Response(
                JSON.stringify({ error: "Invalid payload" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch vendor details including email
        const { data: vendor, error: vendorError } = await supabase
            .from("vendor_profiles")
            .select("business_name, phone, user_id")
            .eq("user_id", vendorId)
            .single();

        if (vendorError || !vendor) {
            console.error("Failed to fetch vendor:", vendorError);
            return new Response(
                JSON.stringify({ error: "Vendor not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get vendor email from auth.users
        const { data: vendorAuth } = await supabase.auth.admin.getUserById(vendorId);
        const vendorEmail = vendorAuth?.user?.email;

        // Fetch order details with items
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(`
        id,
        total_ksh,
        subtotal_ksh,
        shipping_fee_ksh,
        created_at,
        order_items(product_name, quantity, unit_price_ksh),
        order_shipping_details(recipient_name, city, delivery_type)
      `)
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            console.error("Failed to fetch order:", orderError);
            return new Response(
                JSON.stringify({ error: "Order not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build notification message
        const itemsList = order.order_items
            ?.map((item: any) => `${item.quantity}x ${item.product_name}`)
            .join(", ") || "Items";

        const deliveryType = order.order_shipping_details?.delivery_type === "pickup"
            ? "Pickup"
            : order.order_shipping_details?.city || "Delivery";

        const customerName = order.order_shipping_details?.recipient_name || "Customer";

        // Send email notification to vendor
        if (vendorEmail) {
            const dashboardUrl = `${supabaseUrl.replace('.supabase.co', '')}/vendor/orders`;

            const emailResult = await sendEmail({
                to: vendorEmail,
                subject: `🛒 New Order #${orderId.slice(0, 8)} - Action Required`,
                html: emailTemplates.vendorNewOrder({
                    businessName: vendor.business_name,
                    orderId: orderId.slice(0, 8),
                    items: itemsList,
                    total: order.total_ksh,
                    deliveryLocation: deliveryType,
                    customerName: customerName,
                    dashboardUrl: "https://solelyshoes.co.ke/vendor/orders",
                }),
            });

            console.log("Vendor email sent:", emailResult);
        } else {
            console.log("No vendor email found, skipping email notification");
        }

        // Store notification in a notifications table if it exists
        // This is optional - you can add a notifications table later
        try {
            await supabase.from("notifications").insert({
                user_id: vendorId,
                type: "new_order",
                title: "New Order Received",
                message: `New order #${orderId.slice(0, 8)}: ${itemsList} - KES ${order.total_ksh.toLocaleString()}. Reply within 48hrs.`,
                data: { orderId, totalKsh: order.total_ksh },
                read: false,
            });
        } catch (notifError) {
            // Notifications table might not exist, that's okay
            console.log("Could not store notification (table may not exist)");
        }


        return new Response(
            JSON.stringify({
                success: true,
                message: "Vendor notification sent",
                vendorId,
                orderId,
                emailSent: !!vendorEmail,
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
