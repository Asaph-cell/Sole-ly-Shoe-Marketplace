/**
 * Process Payouts - Paystack Transfer API
 * 
 * Sends vendor payouts via Paystack Transfers to M-Pesa
 * Runs daily at 9 AM via cron job
 */

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

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    // Get pending payouts
    const { data: pendingPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        order_id,
        vendor_id,
        amount_ksh,
        method,
        profiles!payouts_vendor_id_fkey(mpesa_number, full_name, email)
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

    console.log(`Processing ${pendingPayouts.length} pending payouts via Paystack`);

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

        const vendorProfile = payout.profiles;
        if (!vendorProfile?.mpesa_number) {
          throw new Error('Vendor has no M-Pesa number configured');
        }

        // Format phone number for Paystack (should be like 254712345678)
        let phoneNumber = vendorProfile.mpesa_number.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '254' + phoneNumber.slice(1);
        } else if (!phoneNumber.startsWith('254')) {
          phoneNumber = '254' + phoneNumber;
        }

        // Step 1: Create a transfer recipient
        const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'mobile_money_kenya',
            name: vendorProfile.full_name || 'Vendor',
            account_number: phoneNumber,
            bank_code: 'MPESA', // Paystack's code for M-Pesa Kenya
            currency: 'KES',
          }),
        });

        const recipientData = await recipientResponse.json();
        console.log('Recipient creation response:', recipientData);

        if (!recipientData.status || !recipientData.data?.recipient_code) {
          throw new Error(recipientData.message || 'Failed to create transfer recipient');
        }

        const recipientCode = recipientData.data.recipient_code;

        // Step 2: Initiate transfer
        const transferResponse = await fetch('https://api.paystack.co/transfer', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: 'balance',
            amount: Math.round(payout.amount_ksh * 100), // Paystack uses kobo/cents
            recipient: recipientCode,
            reason: `Payout for order ${payout.order_id.substring(0, 8)}`,
            reference: `payout_${payout.id}`,
          }),
        });

        const transferData = await transferResponse.json();
        console.log('Transfer response:', transferData);

        if (transferData.status && transferData.data) {
          // Update payout with success status
          await supabase
            .from('payouts')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              reference: transferData.data.transfer_code || transferData.data.reference,
              metadata: {
                paystack_transfer_code: transferData.data.transfer_code,
                paystack_recipient_code: recipientCode,
                paystack_status: transferData.data.status,
              },
            })
            .eq('id', payout.id);

          processedPayouts.push(payout.id);
          console.log(`✅ Processed payout ${payout.id} - KES ${payout.amount_ksh} to ${phoneNumber}`);
        } else {
          throw new Error(transferData.message || 'Transfer failed');
        }

      } catch (error) {
        console.error(`❌ Failed to process payout ${payout.id}:`, error);

        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', payout.id);

        failedPayouts.push({
          payoutId: payout.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedPayouts.length} payouts, ${failedPayouts.length} failed`,
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
