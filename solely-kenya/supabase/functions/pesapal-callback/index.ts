/**
 * pesapal-callback Edge Function
 * 
 * Handles the redirect from Pesapal after customer completes payment.
 * Verifies payment status and redirects user to appropriate page.
 * 
 * Pesapal redirects with query params:
 * - OrderTrackingId
 * - OrderMerchantReference
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { PesapalService } from "../_shared/pesapal-service.ts";

serve(async (req) => {
    try {
        const url = new URL(req.url);

        // Extract Pesapal query parameters
        const orderTrackingId = url.searchParams.get('OrderTrackingId');
        const orderMerchantReference = url.searchParams.get('OrderMerchantReference');

        console.log('Callback received:', { orderTrackingId, orderMerchantReference });

        // Get the app URL for redirects (from environment or default)
        const appUrl = Deno.env.get('APP_URL') || 'https://solely.co.ke';

        if (!orderTrackingId && !orderMerchantReference) {
            // No tracking info, redirect to home
            return Response.redirect(`${appUrl}/orders?error=missing_reference`, 302);
        }

        // Initialize services
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Find order ID from payment record or use merchant reference directly
        let orderId = orderMerchantReference;

        if (orderTrackingId) {
            const { data: payment } = await supabase
                .from('payments')
                .select('order_id')
                .eq('transaction_reference', orderTrackingId)
                .single();

            if (payment) {
                orderId = payment.order_id;
            }
        }

        if (!orderId) {
            return Response.redirect(`${appUrl}/orders?error=order_not_found`, 302);
        }

        // Verify payment status via Pesapal API
        let paymentSuccess = false;

        if (orderTrackingId) {
            try {
                const pesapal = new PesapalService();
                const status = await pesapal.getTransactionStatus(orderTrackingId);
                paymentSuccess = pesapal.isPaymentCompleted(status);
                console.log('Payment status verified:', status.payment_status_description);
            } catch (error) {
                console.error('Failed to verify payment status:', error);
                // Don't fail the redirect, let user see their order page
            }
        }

        // Redirect to order page with payment status
        const statusParam = paymentSuccess ? 'success' : 'pending';
        return Response.redirect(`${appUrl}/orders/${orderId}?payment=${statusParam}`, 302);

    } catch (error) {
        console.error('Error in pesapal-callback:', error);

        // Get app URL and redirect to orders with error
        const appUrl = Deno.env.get('APP_URL') || 'https://solely.co.ke';
        return Response.redirect(`${appUrl}/orders?error=callback_failed`, 302);
    }
});
