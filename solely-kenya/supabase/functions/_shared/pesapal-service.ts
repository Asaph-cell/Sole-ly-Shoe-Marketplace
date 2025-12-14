/**
 * PesapalService - Core service for Pesapal API 3.0 integration
 * 
 * Handles:
 * - Authentication with auto-refresh (5-min token expiry)
 * - IPN URL registration
 * - Order submission
 * - Transaction status verification
 * 
 * All API calls verify SSL and use environment-based URL switching
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Pesapal API endpoints
const PESAPAL_SANDBOX_URL = 'https://cybqa.pesapal.com/pesapalv3';
const PESAPAL_PRODUCTION_URL = 'https://pay.pesapal.com/v3';

interface PesapalToken {
    token: string;
    expiryDate: string;
    error: string | null;
    status: string;
    message: string;
}

interface PesapalIPNResponse {
    url: string;
    created_date: string;
    ipn_id: string;
    error: string | null;
    status: string;
}

interface PesapalOrderRequest {
    id: string;           // Merchant reference (order ID)
    currency: string;
    amount: number;
    description: string;
    callback_url: string;
    cancellation_url?: string;
    notification_id: string;
    billing_address: {
        email_address?: string;
        phone_number?: string;
        country_code?: string;
        first_name?: string;
        middle_name?: string;
        last_name?: string;
        line_1?: string;
        line_2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        zip_code?: string;
    };
}

interface PesapalOrderResponse {
    order_tracking_id: string;
    merchant_reference: string;
    redirect_url: string;
    error: string | null;
    status: string;
}

interface PesapalTransactionStatus {
    payment_method: string;
    amount: number;
    created_date: string;
    confirmation_code: string;
    payment_status_description: string;
    description: string;
    message: string;
    payment_account: string;
    call_back_url: string;
    status_code: number;
    merchant_reference: string;
    payment_status_code: string;
    currency: string;
    error: string | null;
    status: string;
}

export class PesapalService {
    private supabase: SupabaseClient;
    private consumerKey: string;
    private consumerSecret: string;
    private sandboxMode: boolean;
    private baseUrl: string;

    constructor() {
        // Initialize Supabase client with service role
        this.supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get Pesapal credentials from environment
        this.consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY') ?? '';
        this.consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET') ?? '';

        // Determine sandbox/production mode
        const sandboxEnv = Deno.env.get('PESAPAL_SANDBOX') ?? 'true';
        this.sandboxMode = sandboxEnv.toLowerCase() === 'true';

        // Set base URL based on mode
        this.baseUrl = this.sandboxMode ? PESAPAL_SANDBOX_URL : PESAPAL_PRODUCTION_URL;

        // Validate credentials
        if (!this.consumerKey || !this.consumerSecret) {
            throw new Error('Missing PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET environment variables');
        }
    }

    /**
     * Get a valid authentication token
     * Automatically refreshes if expired or near expiry (< 60 seconds remaining)
     */
    async getToken(): Promise<string> {
        // Try to get cached token from database
        const { data: config, error: configError } = await this.supabase
            .from('pesapal_config')
            .select('auth_token, token_expiry')
            .eq('id', 'default')
            .single();

        if (!configError && config?.auth_token && config?.token_expiry) {
            const expiry = new Date(config.token_expiry);
            const now = new Date();
            const remainingSeconds = (expiry.getTime() - now.getTime()) / 1000;

            // Use cached token if more than 60 seconds remaining
            if (remainingSeconds > 60) {
                console.log('Using cached Pesapal token, expires in', Math.round(remainingSeconds), 'seconds');
                return config.auth_token;
            }
        }

        // Request new token from Pesapal
        console.log('Requesting new Pesapal auth token...');

        const response = await fetch(`${this.baseUrl}/api/Auth/RequestToken`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pesapal token request failed:', response.status, errorText);
            throw new Error(`Failed to get Pesapal token: ${response.status}`);
        }

        const tokenData = await response.json();

        // Log full response for debugging
        console.log('Pesapal token response:', JSON.stringify(tokenData));

        if (tokenData.error || tokenData.status === '500') {
            const errorMsg = typeof tokenData.error === 'object'
                ? JSON.stringify(tokenData.error)
                : tokenData.error;
            const message = tokenData.message || tokenData.error?.message || 'Unknown error';
            throw new Error(`Pesapal auth error: ${errorMsg} - ${message}`);
        }

        // Cache the token in database
        const { error: updateError } = await this.supabase
            .from('pesapal_config')
            .update({
                auth_token: tokenData.token,
                token_expiry: tokenData.expiryDate,
                updated_at: new Date().toISOString(),
            })
            .eq('id', 'default');

        if (updateError) {
            console.error('Failed to cache Pesapal token:', updateError);
            // Continue anyway, token is valid
        }

        console.log('New Pesapal token obtained, expires:', tokenData.expiryDate);
        return tokenData.token;
    }

    /**
     * Register IPN URL with Pesapal (one-time setup)
     * Returns the ipn_id which must be used for all order submissions
     */
    async registerIPN(url: string, notificationType: 'GET' | 'POST' = 'GET'): Promise<string> {
        const token = await this.getToken();

        const response = await fetch(`${this.baseUrl}/api/URLSetup/RegisterIPN`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                url: url,
                ipn_notification_type: notificationType,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pesapal IPN registration failed:', response.status, errorText);
            throw new Error(`Failed to register IPN: ${response.status}`);
        }

        const ipnData: PesapalIPNResponse = await response.json();

        if (ipnData.error) {
            throw new Error(`Pesapal IPN registration error: ${ipnData.error}`);
        }

        // Save IPN ID to database
        const { error: updateError } = await this.supabase
            .from('pesapal_config')
            .update({
                ipn_id: ipnData.ipn_id,
                ipn_notification_type: notificationType,
                updated_at: new Date().toISOString(),
            })
            .eq('id', 'default');

        if (updateError) {
            console.error('Failed to save IPN ID:', updateError);
            throw new Error('Failed to save IPN ID to database');
        }

        console.log('IPN registered successfully:', ipnData.ipn_id);
        return ipnData.ipn_id;
    }

    /**
     * Get the registered IPN ID from database
     */
    async getIPNId(): Promise<string> {
        const { data: config, error } = await this.supabase
            .from('pesapal_config')
            .select('ipn_id')
            .eq('id', 'default')
            .single();

        if (error || !config?.ipn_id) {
            throw new Error('IPN not registered. Please run pesapal-register-ipn first.');
        }

        return config.ipn_id;
    }

    /**
     * Submit an order to Pesapal
     * Returns the redirect URL where the customer completes payment
     */
    async submitOrder(orderData: PesapalOrderRequest): Promise<PesapalOrderResponse> {
        const token = await this.getToken();

        const response = await fetch(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(orderData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pesapal order submission failed:', response.status, errorText);
            throw new Error(`Failed to submit order: ${response.status}`);
        }

        const orderResponse: PesapalOrderResponse = await response.json();

        if (orderResponse.error) {
            throw new Error(`Pesapal order error: ${orderResponse.error}`);
        }

        console.log('Order submitted to Pesapal:', orderResponse.order_tracking_id);
        return orderResponse;
    }

    /**
     * Get transaction status from Pesapal
     * ALWAYS call this to verify payment status - never trust IPN data directly
     */
    async getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
        const token = await this.getToken();

        const response = await fetch(
            `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pesapal transaction status check failed:', response.status, errorText);
            throw new Error(`Failed to get transaction status: ${response.status}`);
        }

        const statusData: PesapalTransactionStatus = await response.json();

        console.log('Transaction status:', orderTrackingId, statusData.payment_status_description);
        return statusData;
    }

    /**
     * Check if payment is completed based on status code
     * Status codes: 0 = Invalid, 1 = Completed, 2 = Failed, 3 = Reversed
     */
    isPaymentCompleted(status: PesapalTransactionStatus): boolean {
        return status.status_code === 1 || status.payment_status_description === 'Completed';
    }

    /**
     * Check if payment failed
     */
    isPaymentFailed(status: PesapalTransactionStatus): boolean {
        return status.status_code === 2 || status.payment_status_description === 'Failed';
    }
}

// Export singleton instance for convenience
let pesapalServiceInstance: PesapalService | null = null;

export function getPesapalService(): PesapalService {
    if (!pesapalServiceInstance) {
        pesapalServiceInstance = new PesapalService();
    }
    return pesapalServiceInstance;
}
