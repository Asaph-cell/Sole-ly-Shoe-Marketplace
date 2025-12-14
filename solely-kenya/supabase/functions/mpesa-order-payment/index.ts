import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, phoneNumber } = await req.json();

    if (!orderId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or phoneNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, payments(id, status)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Get M-Pesa configuration
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const shortCode = Deno.env.get('MPESA_SHORTCODE');
    const passkey = Deno.env.get('MPESA_PASSKEY');
    const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL');

    // Check which configuration is missing
    const missingConfig = [];
    if (!consumerKey) missingConfig.push('MPESA_CONSUMER_KEY');
    if (!consumerSecret) missingConfig.push('MPESA_CONSUMER_SECRET');
    if (!shortCode) missingConfig.push('MPESA_SHORTCODE');
    if (!passkey) missingConfig.push('MPESA_PASSKEY');
    if (!callbackUrl) missingConfig.push('MPESA_CALLBACK_URL');

    if (missingConfig.length > 0) {
      console.error('Missing M-Pesa configuration:', missingConfig.join(', '));
      throw new Error(`Missing M-Pesa configuration: ${missingConfig.join(', ')}. Please set these in Supabase Edge Function secrets.`);
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('M-Pesa token request failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to authenticate with M-Pesa API. Check your Consumer Key and Secret. Status: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      throw new Error(`Failed to get M-Pesa access token. Response: ${JSON.stringify(tokenData)}`);
    }

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${shortCode}${passkey}${timestamp}`);

    // Format phone number (remove + and ensure it starts with 254)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Initiate STK push
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
          Amount: Math.round(order.total_ksh),
          PartyA: formattedPhone,
          PartyB: shortCode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: `ORDER-${orderId.substring(0, 8).toUpperCase()}`,
          TransactionDesc: `Order Payment - Order #${orderId.substring(0, 8)}`,
        }),
      }
    );

    if (!stkPushResponse.ok) {
      const errorText = await stkPushResponse.text();
      console.error('M-Pesa STK Push request failed:', stkPushResponse.status, errorText);
      throw new Error(`M-Pesa STK Push request failed. Status: ${stkPushResponse.status}. Check your configuration.`);
    }

    const stkPushData = await stkPushResponse.json();
    console.log('M-Pesa STK Push response:', JSON.stringify(stkPushData));

    if (stkPushData.ResponseCode === '0') {
      // Update or create payment record
      const existingPayment = order.payments?.[0];
      const paymentData = {
        order_id: orderId,
        gateway: 'mpesa' as const,
        status: 'pending' as const,
        transaction_reference: stkPushData.CheckoutRequestID,
        amount_ksh: order.total_ksh,
        currency: 'KES',
        metadata: {
          merchant_request_id: stkPushData.MerchantRequestID,
          checkout_request_id: stkPushData.CheckoutRequestID,
          phone_number: formattedPhone,
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

      return new Response(
        JSON.stringify({
          success: true,
          message: 'M-Pesa STK push sent successfully',
          checkoutRequestId: stkPushData.CheckoutRequestID,
          merchantRequestId: stkPushData.MerchantRequestID,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('M-Pesa STK Push failed:', JSON.stringify(stkPushData));
      const errorMessage = stkPushData.ResponseDescription || stkPushData.errorMessage || 'M-Pesa STK push failed';
      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
          errorCode: stkPushData.ResponseCode,
          errorDetails: stkPushData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in mpesa-order-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

