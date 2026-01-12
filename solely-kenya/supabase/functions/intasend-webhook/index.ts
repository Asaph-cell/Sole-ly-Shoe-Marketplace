import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const payload = await req.json();
        console.log('[IntaSend Webhook] Received webhook:', JSON.stringify(payload, null, 2));

        // IntaSend webhook payload structure:
        // {
        //   "invoice_id": "XXXXXXX",
        //   "state": "COMPLETE" | "FAILED" | "PENDING",
        //   "api_ref": "order_id",
        //   "value": 5000,
        //   "account": "254712345678",
        //   "name": "John Doe",
        //   "retail_price": 5000,
        //   "net_amount": 4850,
        //   "currency": "KES",
        //   "failed_reason": "...",
        //   "created_at": "2026-01-11T18:00:00Z",
        //   "updated_at": "2026-01-11T18:05:00Z"
        // }

        const {
            invoice_id,
            state,
            api_ref,
            value,
            account,
            name,
            retail_price,
            net_amount,
            currency,
            failed_reason,
            created_at,
            updated_at
        } = payload;

        if (!api_ref) {
            console.error('[IntaSend Webhook] No api_ref in payload');
            return new Response(
                JSON.stringify({ error: 'Missing api_ref' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const orderId = api_ref;
        console.log(`[IntaSend Webhook] Processing payment for order: ${orderId}, state: ${state}`);

        // Fetch the order
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('id, total_ksh, status')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('[IntaSend Webhook] Order not found:', orderId, orderError);
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Update payment record
        const { error: paymentUpdateError } = await supabaseClient
            .from('payments')
            .update({
                status: state === 'COMPLETE' ? 'captured' : state === 'FAILED' ? 'pending' : 'pending',
                transaction_id: invoice_id,
                updated_at: new Date().toISOString(),
            })
            .eq('order_id', orderId)
            .eq('gateway', 'intasend');

        if (paymentUpdateError) {
            console.error('[IntaSend Webhook] Failed to update payment:', paymentUpdateError);
        }

        // Handle based on payment state
        if (state === 'COMPLETE') {
            console.log(`[IntaSend Webhook] Payment successful for order ${orderId}`);

            // Update order status to confirmed (waiting for vendor to accept)
            const { error: orderUpdateError } = await supabaseClient
                .from('orders')
                .update({
                    status: 'pending_vendor_confirmation',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            if (orderUpdateError) {
                console.error('[IntaSend Webhook] Failed to update order status:', orderUpdateError);
            } else {
                console.log(`[IntaSend Webhook] Order ${orderId} status updated to pending_vendor_confirmation`);

                // Notify vendor about new order (non-blocking)
                supabaseClient.functions
                    .invoke('notify-vendor-new-order', {
                        body: { orderId: orderId },
                    })
                    .catch(err => console.log('[IntaSend Webhook] Vendor notification failed (non-critical):', err));

                // Notify buyer that order has been placed (non-blocking)
                supabaseClient.functions
                    .invoke('notify-buyer-order-placed', {
                        body: { orderId: orderId },
                    })
                    .catch(err => console.log('[IntaSend Webhook] Buyer notification failed (non-critical):', err));
            }

        } else if (state === 'FAILED') {
            console.log(`[IntaSend Webhook] Payment failed for order ${orderId}. Reason: ${failed_reason || 'Unknown'}`);

            // Update order status to payment failed
            const { error: orderUpdateError } = await supabaseClient
                .from('orders')
                .update({
                    status: 'payment_failed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            if (orderUpdateError) {
                console.error('[IntaSend Webhook] Failed to update order status:', orderUpdateError);
            }

        } else {
            console.log(`[IntaSend Webhook] Payment pending for order ${orderId}`);
        }

        // Return success response to IntaSend
        return new Response(
            JSON.stringify({ success: true, message: 'Webhook processed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[IntaSend Webhook] Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
