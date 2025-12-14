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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending payouts
    const { data: pendingPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        order_id,
        vendor_id,
        amount_ksh,
        method,
        profiles(mpesa_number)
      `)
      .eq('status', 'pending')
      .limit(50); // Process in batches

    if (payoutsError) {
      throw payoutsError;
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending payouts', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedPayouts = [];
    const failedPayouts = [];

    for (const payout of pendingPayouts) {
      try {
        // Update payout status to processing
        await supabase
          .from('payouts')
          .update({
            status: 'processing',
            processing_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        // For M-Pesa payouts, initiate B2C transfer
        if (payout.method === 'mpesa' && payout.profiles?.mpesa_number) {
          // Get M-Pesa configuration
          const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
          const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
          const initiatorName = Deno.env.get('MPESA_INITIATOR_NAME');
          const initiatorPassword = Deno.env.get('MPESA_INITIATOR_PASSWORD');
          const shortCode = Deno.env.get('MPESA_SHORTCODE');
          const queueTimeOutURL = Deno.env.get('MPESA_QUEUE_TIMEOUT_URL');
          const resultURL = Deno.env.get('MPESA_RESULT_URL');

          if (!consumerKey || !consumerSecret || !initiatorName || !initiatorPassword || !shortCode) {
            throw new Error('M-Pesa payout configuration missing');
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

          // Format phone number
          let phoneNumber = payout.profiles.mpesa_number.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '254' + phoneNumber.slice(1);
          } else if (!phoneNumber.startsWith('254')) {
            phoneNumber = '254' + phoneNumber;
          }

          // Generate security credential (in production, use proper encryption)
          // For sandbox, you can use a test credential
          const securityCredential = Deno.env.get('MPESA_SECURITY_CREDENTIAL') || '';

          // Initiate B2C payment
          const b2cResponse = await fetch(
            'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                InitiatorName: initiatorName,
                SecurityCredential: securityCredential,
                CommandID: 'BusinessPayment',
                Amount: Math.round(payout.amount_ksh),
                PartyA: shortCode,
                PartyB: phoneNumber,
                Remarks: `Payout for order ${payout.order_id.substring(0, 8)}`,
                QueueTimeOutURL: queueTimeOutURL || 'https://your-domain.com/mpesa/b2c-callback',
                ResultURL: resultURL || 'https://your-domain.com/mpesa/b2c-callback',
                Occasion: 'Vendor Payout',
              }),
            }
          );

          const b2cData = await b2cResponse.json();

          if (b2cData.ResponseCode === '0') {
            // Update payout with transaction reference
            await supabase
              .from('payouts')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                reference: b2cData.ConversationID || b2cData.OriginatorConversationID,
                metadata: {
                  conversation_id: b2cData.ConversationID,
                  originator_conversation_id: b2cData.OriginatorConversationID,
                },
              })
              .eq('id', payout.id);

            processedPayouts.push(payout.id);
            console.log(`Processed M-Pesa payout ${payout.id} for vendor ${payout.vendor_id}`);
          } else {
            throw new Error(b2cData.ResponseDescription || 'M-Pesa B2C payment failed');
          }
        } else {
          // For bank transfers, mark as processing (manual processing required)
          await supabase
            .from('payouts')
            .update({
              status: 'processing',
              notes: 'Bank transfer - requires manual processing',
            })
            .eq('id', payout.id);

          processedPayouts.push(payout.id);
          console.log(`Marked bank payout ${payout.id} for manual processing`);
        }
      } catch (error) {
        console.error(`Failed to process payout ${payout.id}:`, error);
        
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', payout.id);

        failedPayouts.push({ payoutId: payout.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedPayouts.length,
        failed: failedPayouts.length,
        processedPayouts,
        failedPayouts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-payouts:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process payouts',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

