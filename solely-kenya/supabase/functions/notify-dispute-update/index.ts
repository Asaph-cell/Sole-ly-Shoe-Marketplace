/**
 * Notify Dispute Update
 * 
 * Sends email notifications when a dispute status changes (e.g. resolved, refunded).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, emailTemplates } from "../_shared/email-service.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();
        const { disputeId } = body;

        if (!disputeId) {
            return new Response(
                JSON.stringify({ error: "Missing disputeId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch dispute details with order and customer info
        const { data: dispute, error: disputeError } = await supabase
            .from("disputes")
            .select(`
                *,
                orders (
                    id,
                    customer_id,
                    order_shipping_details(recipient_name, email)
                )
            `)
            .eq("id", disputeId)
            .single();

        if (disputeError || !dispute) {
            return new Response(
                JSON.stringify({ error: "Dispute not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const order = dispute.orders;
        if (!order) {
            return new Response(
                JSON.stringify({ error: "Associated order not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Determine recipient email
        let customerEmail = order.order_shipping_details?.email;
        if (!customerEmail && order.customer_id) {
            const { data: customerAuth } = await supabase.auth.admin.getUserById(order.customer_id);
            customerEmail = customerAuth?.user?.email;
        }

        if (!customerEmail) {
            return new Response(
                JSON.stringify({ success: true, message: "No customer email available", emailSent: false }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const customerName = order.order_shipping_details?.recipient_name || "Customer";
        const isRefund = dispute.status === "resolved_refunded" || dispute.resolution?.toLowerCase().includes("refund");

        // Helper to format status display
        const formatStatus = (status: string) => {
            return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        // Send email
        const emailResult = await sendEmail({
            to: customerEmail,
            subject: isRefund
                ? `💰 Refund Issued - Dispute Resolved #${dispute.order_id.slice(0, 8)}`
                : `📋 Dispute Update status: ${formatStatus(dispute.status)} #${dispute.order_id.slice(0, 8)}`,
            html: emailTemplates.disputeStatusUpdate({
                userName: customerName,
                orderId: dispute.order_id.slice(0, 8),
                newStatus: formatStatus(dispute.status),
                resolution: dispute.resolution || "Pending review",
                adminNotes: dispute.admin_notes,
                isRefund: isRefund,
                refundAmount: dispute.refund_amount
            }),
        });

        // Store in-app notification
        await supabase.from("notifications").insert({
            user_id: order.customer_id,
            type: "dispute_update",
            title: isRefund ? "Dispute Resolved: Refund Issued" : "Dispute Status Updated",
            message: `Your dispute for order #${dispute.order_id.slice(0, 8)} has been updated to: ${formatStatus(dispute.status)}.`,
            related_id: disputeId,
        }).catch(err => console.error("Error creating notification:", err));

        return new Response(
            JSON.stringify({
                success: true,
                message: "Dispute notification sent",
                emailSent: emailResult.success,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
