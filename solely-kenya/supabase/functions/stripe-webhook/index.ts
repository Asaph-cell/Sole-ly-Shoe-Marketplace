import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe configuration missing');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;

      if (!orderId) {
        console.error('Order ID not found in payment intent metadata');
        return new Response(
          JSON.stringify({ error: 'Order ID not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update payment status
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'captured',
          captured_at: new Date().toISOString(),
        })
        .eq('transaction_reference', paymentIntent.id)
        .select()
        .single();

      if (paymentError) {
        console.error('Error updating payment:', paymentError);
        throw paymentError;
      }

      // Check if this is a delivery fee payment
      const isDeliveryFee = payment.metadata?.is_delivery_fee === true;

      if (isDeliveryFee) {
        // This is an additional payment for delivery fee
        // Get the order to update escrow with new totals
        const { data: order } = await supabase
          .from('orders')
          .select('total_ksh, commission_amount, payout_amount')
          .eq('id', orderId)
          .single();

        if (order) {
          // Update escrow transaction with new totals
          const { data: escrow } = await supabase
            .from('escrow_transactions')
            .select('id, held_amount')
            .eq('order_id', orderId)
            .single();

          if (escrow) {
            await supabase
              .from('escrow_transactions')
              .update({
                held_amount: order.total_ksh,
                commission_amount: order.commission_amount,
                release_amount: order.payout_amount,
              })
              .eq('id', escrow.id);
          }
        }
      } else {
        // This is the initial payment
        // Update order status to pending_vendor_confirmation
        await supabase
          .from('orders')
          .update({
            status: 'pending_vendor_confirmation',
          })
          .eq('id', orderId);

        // Ensure escrow transaction exists
        if (payment) {
          const { data: escrow } = await supabase
            .from('escrow_transactions')
            .select('id')
            .eq('order_id', orderId)
            .single();

          if (!escrow) {
            // Get order to calculate escrow amounts
            const { data: order } = await supabase
              .from('orders')
              .select('total_ksh, commission_amount, payout_amount')
              .eq('id', orderId)
              .single();

            if (order) {
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
            }
          }
        }
      }

      console.log(`Payment succeeded for order ${orderId}`);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;

      if (orderId) {
        await supabase
          .from('payments')
          .update({
            status: 'pending', // Keep as pending for retry
          })
          .eq('transaction_reference', paymentIntent.id);
      }

      console.log(`Payment failed for order ${orderId}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process webhook' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

