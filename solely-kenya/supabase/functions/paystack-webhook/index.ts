import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        // 1. Verify webhook signature
        const signature = req.headers.get('x-paystack-signature');
        if (!signature) {
            console.error('[Paystack Webhook] Missing signature');
            return new Response('Unauthorized', { status: 401 });
        }

        const body = await req.text();

        // Compute hash
        const hash = createHmac('sha512', paystackSecretKey)
            .update(body)
            .digest('hex');

        if (hash !== signature) {
            console.error('[Paystack Webhook] Invalid signature');
            return new Response('Unauthorized', { status: 401 });
        }

        // 2. Parse the webhook payload
        const event = JSON.parse(body);
        console.log('[Paystack Webhook] Event received:', event.event);

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Handle different event types
        if (event.event === 'charge.success') {
            const { reference, amount, currency, customer, status } = event.data;

            console.log(`[Paystack Webhook] Payment successful for reference: ${reference}`);

            // Reference is the order ID
            const orderId = reference;

            // Fetch the order to validate
            const { data: order, error: orderError } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError || !order) {
                console.error('[Paystack Webhook] Order not found:', orderId);
                return new Response('Order not found', { status: 404 });
            }

            // Amount is in kobo, convert to KES
            const amountKES = amount / 100;

            // Find or create payment record
            const { data: existingPayments } = await supabaseClient
                .from('payments')
                .select('*')
                .eq('order_id', orderId)
                .eq('gateway', 'paystack')
                .order('created_at', { ascending: false });

            let paymentId;

            if (existingPayments && existingPayments.length > 0) {
                // Update existing payment
                const { data: updatedPayment, error: updateError } = await supabaseClient
                    .from('payments')
                    .update({
                        status: 'captured',
                        transaction_reference: reference,
                        captured_at: new Date().toISOString(),
                        metadata: {
                            paystack_customer: customer,
                            paystack_status: status,
                            currency: currency,
                        },
                    })
                    .eq('id', existingPayments[0].id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('[Paystack Webhook] Failed to update payment:', updateError);
                    throw updateError;
                }

                paymentId = updatedPayment.id;
                console.log('[Paystack Webhook] Payment updated:', paymentId);
            } else {
                // Create new payment record
                const { data: newPayment, error: paymentError } = await supabaseClient
                    .from('payments')
                    .insert({
                        order_id: orderId,
                        gateway: 'paystack',
                        status: 'captured',
                        transaction_reference: reference,
                        amount_ksh: amountKES,
                        currency: currency,
                        captured_at: new Date().toISOString(),
                        metadata: {
                            paystack_customer: customer,
                            paystack_status: status,
                        },
                    })
                    .select()
                    .single();

                if (paymentError) {
                    console.error('[Paystack Webhook] Failed to create payment:', paymentError);
                    throw paymentError;
                }

                paymentId = newPayment.id;
                console.log('[Paystack Webhook] Payment created:', paymentId);
            }

            // Create escrow transaction if not exists
            const { data: existingEscrow } = await supabaseClient
                .from('escrow_transactions')
                .select('*')
                .eq('order_id', orderId)
                .single();

            if (!existingEscrow) {
                const { error: escrowError } = await supabaseClient
                    .from('escrow_transactions')
                    .insert({
                        order_id: orderId,
                        payment_id: paymentId,
                        status: 'held',
                        held_amount: order.total_ksh,
                        commission_amount: order.commission_amount,
                        release_amount: order.payout_amount,
                    });

                if (escrowError) {
                    console.error('[Paystack Webhook] Failed to create escrow:', escrowError);
                    // Don't throw - payment is already captured
                } else {
                    console.log('[Paystack Webhook] Escrow transaction created');

                    // 4. Deduct stock
                    const { error: stockError } = await supabaseClient.rpc('deduct_order_items_stock', {
                        p_order_id: orderId
                    });

                    if (stockError) {
                        console.error('[Paystack Webhook] Failed to deduct stock:', stockError);
                    } else {
                        console.log('[Paystack Webhook] Stock deducted for order:', orderId);
                    }

                    // 5. Send order confirmation email
                    const { error: emailError } = await supabaseClient.functions.invoke('notify-buyer-order-placed', {
                        body: { orderId: orderId }
                    });

                    if (emailError) {
                        console.error('[Paystack Webhook] Failed to send email:', emailError);
                    } else {
                        console.log('[Paystack Webhook] Order confirmation email sent');
                    }
                }
            }

            return new Response(JSON.stringify({ status: 'success' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } else if (event.event === 'charge.failed') {
            console.log('[Paystack Webhook] Payment failed:', event.data.reference);

            // Optionally update payment record to failed status
            // For now, we'll just log it
            return new Response(JSON.stringify({ status: 'acknowledged' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Other events - acknowledge but don't process
        console.log('[Paystack Webhook] Event acknowledged but not processed:', event.event);
        return new Response(JSON.stringify({ status: 'acknowledged' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[Paystack Webhook] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
