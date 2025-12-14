import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, additionalAmount, paymentGateway, phoneNumber } = await req.json();

    if (!orderId || !additionalAmount || additionalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid orderId or additionalAmount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order and existing payment
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, payments(id, gateway, status, amount_ksh, transaction_reference, metadata)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    const existingPayment = order.payments?.[0];
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Create additional payment record
    const { data: additionalPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        gateway: paymentGateway || existingPayment.gateway,
        status: 'pending',
        amount_ksh: additionalAmount,
        currency: 'KES',
        metadata: {
          is_delivery_fee: true,
          original_payment_id: existingPayment.id,
        },
      })
      .select()
      .single();

    if (paymentError || !additionalPayment) {
      throw new Error('Failed to create additional payment record');
    }

    // Process based on payment gateway
    if (paymentGateway === 'card' || existingPayment.gateway === 'card') {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY not configured');
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });

      // Convert KES to USD
      const exchangeRate = 0.0065;
      const amountUsd = Math.round(additionalAmount * exchangeRate * 100);

      // Create new payment intent for additional amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountUsd,
        currency: 'usd',
        metadata: {
          order_id: orderId,
          amount_ksh: additionalAmount.toString(),
          is_delivery_fee: 'true',
          original_payment_id: existingPayment.id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update additional payment record
      await supabase
        .from('payments')
        .update({
          transaction_reference: paymentIntent.id,
          metadata: {
            ...additionalPayment.metadata,
            stripe_payment_intent_id: paymentIntent.id,
            amount_usd: amountUsd / 100,
            exchange_rate: exchangeRate,
          },
        })
        .eq('id', additionalPayment.id);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: additionalPayment.id,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          message: 'Additional payment intent created. Customer needs to complete payment.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (paymentGateway === 'mpesa' || existingPayment.gateway === 'mpesa') {
      if (!phoneNumber) {
        throw new Error('Phone number required for M-Pesa payment');
      }

      // Get M-Pesa configuration
      const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
      const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
      const shortCode = Deno.env.get('MPESA_SHORTCODE');
      const passkey = Deno.env.get('MPESA_PASSKEY');
      const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL');

      if (!consumerKey || !consumerSecret || !shortCode || !passkey || !callbackUrl) {
        throw new Error('Missing M-Pesa configuration');
      }

      // Get access token
      const auth = btoa(`${consumerKey}:${consumerSecret}`);
      const tokenResponse = await fetch(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        throw new Error('Failed to get M-Pesa access token');
      }

      // Generate timestamp and password
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = btoa(`${shortCode}${passkey}${timestamp}`);

      // Format phone number
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.slice(1);
      } else if (formattedPhone.startsWith('+254')) {
        formattedPhone = formattedPhone.slice(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      // Initiate STK push for additional amount
      const stkPushResponse = await fetch(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(additionalAmount),
            PartyA: formattedPhone,
            PartyB: shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: `DELIVERY-${orderId.substring(0, 8).toUpperCase()}`,
            TransactionDesc: `Delivery Fee - Order #${orderId.substring(0, 8)}`,
          }),
        }
      );

      const stkPushData = await stkPushResponse.json();

      if (stkPushData.ResponseCode === '0') {
        // Update additional payment record
        await supabase
          .from('payments')
          .update({
            transaction_reference: stkPushData.CheckoutRequestID,
            metadata: {
              ...additionalPayment.metadata,
              merchant_request_id: stkPushData.MerchantRequestID,
              checkout_request_id: stkPushData.CheckoutRequestID,
              phone_number: formattedPhone,
            },
          })
          .eq('id', additionalPayment.id);

        return new Response(
          JSON.stringify({
            success: true,
            paymentId: additionalPayment.id,
            checkoutRequestId: stkPushData.CheckoutRequestID,
            merchantRequestId: stkPushData.MerchantRequestID,
            message: 'M-Pesa STK push sent for delivery fee. Customer needs to complete payment.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error(stkPushData.ResponseDescription || 'M-Pesa STK push failed');
      }
    } else {
      throw new Error('Unsupported payment gateway');
    }
  } catch (error) {
    console.error('Error processing delivery fee payment:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process delivery fee payment',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

