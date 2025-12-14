/**
 * pesapal-initiate-payment Edge Function
 * 
 * Initiates a payment by submitting an order to Pesapal.
 * Returns a redirect URL where the customer completes payment.
 * 
 * Usage:
 * const { data } = await supabase.functions.invoke('pesapal-initiate-payment', {
 *   body: { orderId: '...', callbackUrl: 'https://...' }
 * });
 * // Redirect user to data.redirectUrl
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
        const { orderId, callbackUrl, cancellationUrl } = await req.json();

        // Validate required fields
        if (!orderId) {
            return new Response(
                JSON.stringify({ error: 'Missing orderId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get order details with shipping info
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
        *,
        order_shipping_details(*),
        payments(id, status)
      `)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('Order not found:', orderError);
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== SERVER-SIDE PRICE VALIDATION =====
        // NEVER trust frontend prices - recalculate based on zone
        const ZONE_1_FEE = 200; // Nairobi
        const ZONE_2_FEE = 300; // Outside Nairobi

        const shipping = order.order_shipping_details;
        let deliveryZone: number | null = null;
        let calculatedDeliveryFee = 0;

        // Determine delivery zone from shipping address
        if (shipping && order.shipping_fee_ksh > 0) {
            const addressFields = [
                shipping.county,
                shipping.city,
                shipping.address_line1
            ].filter(Boolean).join(' ').toLowerCase();

            const isNairobi = addressFields.includes('nairobi');
            deliveryZone = isNairobi ? 1 : 2;
            calculatedDeliveryFee = isNairobi ? ZONE_1_FEE : ZONE_2_FEE;

            console.log('Zone detection:', { addressFields, isNairobi, deliveryZone, calculatedDeliveryFee });
        }

        // Recalculate expected total
        const expectedTotal = Number(order.subtotal_ksh) + calculatedDeliveryFee;
        const actualTotal = Number(order.total_ksh);

        // Log if there's a price mismatch (potential tampering attempt)
        if (Math.abs(expectedTotal - actualTotal) > 1) {
            console.warn('Price mismatch detected!', {
                orderId,
                frontendTotal: actualTotal,
                calculatedTotal: expectedTotal,
                subtotal: order.subtotal_ksh,
                deliveryFee: calculatedDeliveryFee,
                zone: deliveryZone
            });

            // Update order with correct total
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    shipping_fee_ksh: calculatedDeliveryFee,
                    total_ksh: expectedTotal,
                    payout_amount: expectedTotal - Number(order.commission_amount)
                })
                .eq('id', orderId);

            if (updateError) {
                console.error('Failed to correct order total:', updateError);
            } else {
                console.log('Order total corrected to:', expectedTotal);
                // Use corrected total for Pesapal
                order.total_ksh = expectedTotal;
            }
        }

        // Initialize Pesapal service
        const pesapal = new PesapalService();

        // Get the registered IPN ID
        const ipnId = await pesapal.getIPNId();

        // Build callback URL - use provided or construct default
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const finalCallbackUrl = callbackUrl || `${supabaseUrl}/functions/v1/pesapal-callback`;
        const finalCancellationUrl = cancellationUrl || finalCallbackUrl;

        // Prepare billing address from shipping details
        const billingAddress: Record<string, string> = {};

        if (shipping) {
            if (shipping.email) billingAddress.email_address = shipping.email;
            if (shipping.phone) billingAddress.phone_number = shipping.phone;
            if (shipping.recipient_name) {
                const nameParts = shipping.recipient_name.split(' ');
                billingAddress.first_name = nameParts[0] || '';
                billingAddress.last_name = nameParts.slice(1).join(' ') || '';
            }
            if (shipping.address_line1) billingAddress.line_1 = shipping.address_line1;
            if (shipping.address_line2) billingAddress.line_2 = shipping.address_line2;
            if (shipping.city) billingAddress.city = shipping.city;
            if (shipping.county) billingAddress.state = shipping.county;
            if (shipping.postal_code) billingAddress.postal_code = shipping.postal_code;
            billingAddress.country_code = 'KE'; // Kenya
        }

        // Submit order to Pesapal with server-validated amount
        const pesapalResponse = await pesapal.submitOrder({
            id: orderId,
            currency: 'KES',
            amount: Number(order.total_ksh),
            description: `Order #${orderId.substring(0, 8).toUpperCase()} - Solely Kenya`,
            callback_url: finalCallbackUrl,
            cancellation_url: finalCancellationUrl,
            notification_id: ipnId,
            billing_address: billingAddress,
        });

        // Update payment record with Pesapal tracking ID
        const existingPayment = order.payments?.[0];
        const paymentData = {
            order_id: orderId,
            gateway: 'pesapal' as const,
            status: 'pending' as const,
            amount_ksh: order.total_ksh,
            currency: 'KES',
            transaction_reference: pesapalResponse.order_tracking_id,
            metadata: {
                pesapal_order_tracking_id: pesapalResponse.order_tracking_id,
                pesapal_merchant_reference: pesapalResponse.merchant_reference,
                redirect_url: pesapalResponse.redirect_url,
            },
        };

        if (existingPayment) {
            await supabase
                .from('payments')
                .update(paymentData)
                .eq('id', existingPayment.id);
        } else {
            await supabase
                .from('payments')
                .insert(paymentData);
        }

        console.log('Pesapal payment initiated for order:', orderId, 'Tracking ID:', pesapalResponse.order_tracking_id);

        return new Response(
            JSON.stringify({
                success: true,
                redirectUrl: pesapalResponse.redirect_url,
                orderTrackingId: pesapalResponse.order_tracking_id,
                merchantReference: pesapalResponse.merchant_reference,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in pesapal-initiate-payment:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
