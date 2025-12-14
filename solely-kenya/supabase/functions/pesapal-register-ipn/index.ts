/**
 * pesapal-register-ipn Edge Function
 * 
 * One-time setup endpoint to register the IPN URL with Pesapal.
 * Run this once after deployment to get the ipn_id required for payments.
 * 
 * Usage:
 * curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/pesapal-register-ipn \
 *   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"notificationType": "GET"}'
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
        // Parse request body
        const { notificationType = 'GET' } = await req.json().catch(() => ({}));

        // Validate notification type
        if (notificationType !== 'GET' && notificationType !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'notificationType must be GET or POST' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Build the IPN listener URL (this edge function's URL)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const ipnUrl = `${supabaseUrl}/functions/v1/pesapal-ipn-listener`;

        console.log('Registering IPN URL:', ipnUrl, 'Type:', notificationType);

        // Initialize Pesapal service and register IPN
        const pesapal = new PesapalService();
        const ipnId = await pesapal.registerIPN(ipnUrl, notificationType as 'GET' | 'POST');

        return new Response(
            JSON.stringify({
                success: true,
                ipn_id: ipnId,
                ipn_url: ipnUrl,
                notification_type: notificationType,
                message: 'IPN registered successfully. This ID is now saved and will be used for all payments.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in pesapal-register-ipn:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
