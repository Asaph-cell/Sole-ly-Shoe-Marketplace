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

        console.log(`[IntaSend] Processing order: ${orderId}`);

        // 1. Fetch order with customer profile
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('total_ksh, customer_id, profiles:customer_id(email, full_name)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('[IntaSend] Order not found:', orderError);
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
        const phone = shipping?.phone || '';
        const name = shipping?.recipient_name || order.profiles?.full_name || 'Customer';
        const amount = Number(order.total_ksh);

        if (isNaN(amount) || amount <= 0) {
            throw new Error(`Invalid order amount: ${order.total_ksh}`);
        }

        // 4. Build IntaSend payload (only required fields)
        const payload: Record<string, unknown> = {
            public_key: Deno.env.get('INTRASEND_PUBLISHABLE_KEY'),
            amount: amount,
            currency: 'KES',
            email: email,
            api_ref: orderId,
            redirect_url: successUrl || cancelUrl || 'https://solelyshoes.co.ke/orders',
        };

        // Only include phone if it looks valid (7+ digits)
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 7) {
            payload.phone_number = cleanPhone;
        }

        // Split name for first/last
        const nameParts = name.trim().split(' ');
        payload.first_name = nameParts[0] || 'Customer';
        payload.last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Buyer';

        console.log('[IntaSend] Sending request:', JSON.stringify({ ...payload, public_key: '[HIDDEN]' }));

        // 5. Call IntaSend Checkout API
        const response = await fetch('https://payment.intasend.com/api/v1/checkout/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('[IntaSend] Raw response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            throw new Error(`IntaSend returned invalid JSON: ${responseText.substring(0, 200)}`);
        }

        if (!response.ok) {
            const errorDetail = data?.errors?.[0]?.detail || data?.error || 'Unknown error';
            console.error('[IntaSend] API Error:', JSON.stringify(data));
            throw new Error(`IntaSend API Error: ${errorDetail}`);
        }

        if (!data.url) {
            throw new Error('IntaSend did not return a checkout URL');
        }

        console.log('[IntaSend] Success! URL:', data.url);

        return new Response(
            JSON.stringify({ success: true, url: data.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[IntaSend] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
