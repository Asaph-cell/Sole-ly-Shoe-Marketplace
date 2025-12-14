/**
 * pesapal-ipn-listener Edge Function
 * 
 * Receives Instant Payment Notifications from Pesapal when payment status changes.
 * IMPORTANT: Never trust IPN data directly - always verify via GetTransactionStatus.
 * 
 * Pesapal sends either GET or POST based on your registration.
 * Query params include: OrderTrackingId, OrderMerchantReference, OrderNotificationType
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { PesapalService } from "../_shared/pesapal-service.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Extract parameters from query string (GET) or body (POST)
        let orderTrackingId: string | null = null;
        let orderMerchantReference: string | null = null;
        let orderNotificationType: string | null = null;

        const url = new URL(req.url);

        // Try query params first (GET request)
        orderTrackingId = url.searchParams.get('OrderTrackingId');
        orderMerchantReference = url.searchParams.get('OrderMerchantReference');
        orderNotificationType = url.searchParams.get('OrderNotificationType');

        // If not in query params, try body (POST request)
        if (!orderTrackingId && req.method === 'POST') {
            try {
                const body = await req.json();
                orderTrackingId = body.OrderTrackingId || body.orderTrackingId;
                orderMerchantReference = body.OrderMerchantReference || body.orderMerchantReference;
                orderNotificationType = body.OrderNotificationType || body.orderNotificationType;
            } catch {
                // Body parse failed, use query params only
            }
        }

        console.log('IPN received:', { orderTrackingId, orderMerchantReference, orderNotificationType });

        if (!orderTrackingId) {
            console.error('Missing OrderTrackingId in IPN');
            return new Response(
                JSON.stringify({
                    orderNotificationType: orderNotificationType || 'IPNCHANGE',
                    orderTrackingId: '',
                    orderMerchantReference: orderMerchantReference || '',
                    status: 400,
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize services
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const pesapal = new PesapalService();

        // CRITICAL: Verify payment status via API - never trust IPN data blindly
        const transactionStatus = await pesapal.getTransactionStatus(orderTrackingId);

        console.log('Transaction status verified:', transactionStatus.payment_status_description);

        // Find the payment record by tracking ID
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('*, orders(id, total_ksh, commission_amount, payout_amount, status)')
            .eq('transaction_reference', orderTrackingId)
            .single();

        if (paymentError || !payment) {
            console.error('Payment not found for tracking ID:', orderTrackingId);
            // Return success to Pesapal anyway to prevent retries for unknown orders
            return new Response(
                JSON.stringify({
                    orderNotificationType: orderNotificationType || 'IPNCHANGE',
                    orderTrackingId: orderTrackingId,
                    orderMerchantReference: orderMerchantReference || transactionStatus.merchant_reference,
                    status: 200,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const orderId = payment.order_id;
        const order = payment.orders;

        // Process based on payment status
        if (pesapal.isPaymentCompleted(transactionStatus)) {
            console.log('Payment COMPLETED for order:', orderId);

            // Update payment status to captured
            await supabase
                .from('payments')
                .update({
                    status: 'captured',
                    captured_at: new Date().toISOString(),
                    metadata: {
                        ...(payment.metadata || {}),
                        pesapal_confirmation_code: transactionStatus.confirmation_code,
                        pesapal_payment_method: transactionStatus.payment_method,
                        pesapal_payment_account: transactionStatus.payment_account,
                        pesapal_status_code: transactionStatus.status_code,
                        verified_at: new Date().toISOString(),
                    },
                })
                .eq('id', payment.id);

            // Update order status to pending_vendor_confirmation
            await supabase
                .from('orders')
                .update({
                    status: 'pending_vendor_confirmation',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            // Create or update escrow transaction
            const { data: existingEscrow } = await supabase
                .from('escrow_transactions')
                .select('id')
                .eq('order_id', orderId)
                .single();

            if (!existingEscrow && order) {
                await supabase
                    .from('escrow_transactions')
                    .insert({
                        order_id: orderId,
                        payment_id: payment.id,
                        status: 'held',
                        held_amount: order.total_ksh,
                        commission_amount: order.commission_amount,
                        release_amount: order.payout_amount,
                    });
                console.log('Escrow transaction created for order:', orderId);
            }

            // Notify vendor about new order (non-blocking)
            try {
                const { data: orderWithVendor } = await supabase
                    .from('orders')
                    .select('vendor_id, total_ksh')
                    .eq('id', orderId)
                    .single();

                if (orderWithVendor) {
                    // Call notify function (fire and forget)
                    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-vendor-new-order`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        },
                        body: JSON.stringify({
                            orderId,
                            vendorId: orderWithVendor.vendor_id,
                            totalKsh: orderWithVendor.total_ksh,
                        }),
                    }).catch(err => console.log('Vendor notification failed (non-critical):', err));
                }
            } catch (notifyErr) {
                console.log('Vendor notification skipped:', notifyErr);
            }

        } else if (pesapal.isPaymentFailed(transactionStatus)) {
            console.log('Payment FAILED for order:', orderId);

            // Update payment with failure details
            await supabase
                .from('payments')
                .update({
                    status: 'pending', // Keep as pending to allow retry
                    metadata: {
                        ...(payment.metadata || {}),
                        pesapal_status_code: transactionStatus.status_code,
                        pesapal_status_description: transactionStatus.payment_status_description,
                        failure_recorded_at: new Date().toISOString(),
                    },
                })
                .eq('id', payment.id);
        } else {
            console.log('Payment status pending/unknown:', transactionStatus.payment_status_description);
        }

        // Return acknowledgment to Pesapal (stops retry attempts)
        return new Response(
            JSON.stringify({
                orderNotificationType: orderNotificationType || 'IPNCHANGE',
                orderTrackingId: orderTrackingId,
                orderMerchantReference: orderMerchantReference || transactionStatus.merchant_reference,
                status: 200,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in pesapal-ipn-listener:', error);
        // Return 500 so Pesapal retries
        return new Response(
            JSON.stringify({
                status: 500,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
