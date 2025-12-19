import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { orderId, successUrl, cancelUrl } = await req.json();

        if (!orderId) {
            throw new Error('Order ID is required');
        }

        console.log(`[Paystack] Processing order: ${orderId}`);

        // 1. Fetch order with customer profile
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('total_ksh, customer_id, profiles:customer_id(email, full_name)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('[Paystack] Order not found:', orderError);
            throw new Error('Order not found');
        }

        // 2. Fetch shipping details for phone/email
        const { data: shipping } = await supabaseClient
            .from('order_shipping_details')
            .select('email, phone, recipient_name')
            .eq('order_id', orderId)
            .single();

        // 3. Prepare customer data with fallbacks
        const email = shipping?.email || order.profiles?.email || 'customer@solelyshoes.co.ke';
        const amount = Number(order.total_ksh);

        if (isNaN(amount) || amount <= 0) {
            throw new Error(`Invalid order amount: ${order.total_ksh}`);
        }

        // Paystack requires amount in kobo/cents (multiply by 100)
        const amountInKobo = Math.round(amount * 100);

        // 4. Build Paystack payload
        const payload = {
            email: email,
            amount: amountInKobo,
            currency: 'KES',
            reference: orderId, // Use order ID as reference
            callback_url: successUrl || `${Deno.env.get('SUPABASE_URL')}/orders/${orderId}`,
            metadata: {
                order_id: orderId,
                customer_id: order.customer_id,
                cancel_url: cancelUrl,
            },
        };

        console.log('[Paystack] Initializing transaction:', JSON.stringify({ ...payload, amount: amount }));

        // 5. Call Paystack Initialize Transaction API
        const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('[Paystack] Raw response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            throw new Error(`Paystack returned invalid JSON: ${responseText.substring(0, 200)}`);
        }

        if (!response.ok || !data.status) {
            const errorMsg = data?.message || 'Unknown error';
            console.error('[Paystack] API Error:', JSON.stringify(data));
            throw new Error(`Paystack API Error: ${errorMsg}`);
        }

        if (!data.data?.authorization_url) {
            throw new Error('Paystack did not return a checkout URL');
        }

        console.log('[Paystack] Success! URL:', data.data.authorization_url);
        console.log('[Paystack] Access code:', data.data.access_code);

        return new Response(
            JSON.stringify({
                success: true,
                url: data.data.authorization_url,
                access_code: data.data.access_code,
                reference: data.data.reference,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Paystack] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
