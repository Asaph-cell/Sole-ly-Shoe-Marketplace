# Payment Integration Setup Guide

This document explains how to set up Paystack payment integration for the Solely marketplace.

## Overview

The payment system supports:
- **Paystack**: M-Pesa, Visa, Mastercard (unified checkout)
- **Escrow System**: Payments are held in escrow until delivery confirmation
- **Automatic Release**: Escrow auto-releases based on order timeline
- **Commission**: 10% commission automatically deducted from each sale

## Environment Variables

### Paystack Configuration

Add these to your Supabase Edge Functions secrets:

```bash
PAYSTACK_SECRET_KEY=your_secret_key
PAYSTACK_PUBLIC_KEY=your_public_key
```

**To get your Paystack credentials:**
1. Sign up at https://paystack.com
2. Complete business verification
3. Go to Settings > API Keys & Webhooks
4. Copy your Public Key (pk_test_... for testing, pk_live_... for production)
5. Copy your Secret Key (sk_test_... for testing, sk_live_... for production)

### Setting Secrets in Supabase

You can set secrets via the Supabase Dashboard or CLI:

**Via Dashboard:**
1. Go to your project dashboard
2. Navigate to Project Settings > Edge Functions
3. Add secrets:
   - PAYSTACK_SECRET_KEY
   - PAYSTACK_PUBLIC_KEY

**Via CLI:**
```bash
cd supabase
npx supabase secrets set PAYSTACK_SECRET_KEY="sk_test_your_key"
npx supabase secrets set PAYSTACK_PUBLIC_KEY="pk_test_your_key"
```

## Edge Functions

### 1. paystack-initiate-payment

Initiates a payment and returns a redirect URL.

```javascript
const { data } = await supabase.functions.invoke('paystack-initiate-payment', {
  body: { 
    orderId: '...', 
    successUrl: 'https://yoursite.com/orders/123?payment_success=true',
    cancelUrl: 'https://yoursite.com/orders/123?cancelled=true'
  }
});
// Redirect user to data.url
```

### 2. paystack-webhook

Handles Paystack webhook callbacks. Automatically updates order/payment status.

**URL**: `https://YOUR-PROJECT.supabase.co/functions/v1/paystack-webhook`

**Important**: You must configure this webhook URL in your Paystack Dashboard.

## Payment Flow

### Customer Payment Flow

1. Customer fills checkout form
2. Order created with status `pending_vendor_confirmation`
3. Payment record created with status `pending`
4. User redirected to Paystack checkout page
5. User selects payment method (M-Pesa, Card, etc.)
6. On payment success (via webhook):
   - Payment status → `captured`
   - Escrow transaction created with status `held`
7. User redirected back to order page

### Escrow Release Flow

1. Vendor accepts and marks order as `shipped`
2. Customer confirms delivery (order → `completed`)
3. Escrow auto-releases based on timeline if customer doesn't confirm
4. On release:
   - Escrow status → `released`
   - Payout record created
   - Commission recorded in ledger

## Commission Structure

- **Commission Rate**: 10% of order subtotal
- **Payout Amount**: `total - commission_amount`
- **Paystack Fees**: 
  - M-Pesa: 1.5% per transaction
  - Local cards: 2.9% per transaction
  - International cards: 3.8% per transaction

## Database Tables

| Table | Purpose |
| --- | --- |
| `orders` | Order records with commission fields |
| `payments` | Payment records (gateway = 'paystack') |
| `escrow_transactions` | Escrow status and amounts |
| `payouts` | Vendor payout records |
| `commission_ledger` | Commission transactions |

## Deployment

### 1. Deploy Edge Functions

```bash
cd supabase
npx supabase functions deploy paystack-initiate-payment
npx supabase functions deploy paystack-webhook
```

### 2. Run Database Migration

The migration `20251219_add_paystack_gateway.sql` adds 'paystack' to the payment gateway enum.

```bash
npx supabase db push
```

Or apply via Supabase Dashboard → SQL Editor.

### 3. Configure Webhook in Paystack Dashboard

1. Log into your Paystack Dashboard
2. Go to Settings > API Keys & Webhooks
3. Add webhook URL: `https://YOUR-PROJECT.supabase.co/functions/v1/paystack-webhook`
4. Select events to send: `charge.success` (required), `charge.failed` (optional)
5. Save webhook configuration

## Testing

### Paystack Test Mode

- Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` with **test** keys
- All transactions will use test mode

### Test Card Numbers

Paystack provides test cards for different scenarios:

**Success:**
- Card: `4084084084084081`
- Expiry: Any future date
- CVV: Any 3 digits

**Declined:**
- Card: `5060666666666666666`
- Expiry: Any future date
- CVV: Any 3 digits

**Insufficient Funds:**
- Card: `4111111111111111`
- Expiry: Any future date
- CVV: Any 3 digits

### Test M-Pesa

In test mode, Paystack will simulate M-Pesa payments. Follow the prompts on the checkout page.

## Webhook Verification

The webhook handler (`paystack-webhook`) includes signature verification to ensure requests are from Paystack. The signature is verified using:

```typescript
const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
  .update(request_body)
  .digest('hex');
```

This ensures payment confirmations are authentic.

## Troubleshooting

### Payment Not Initiating
- Check `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` are set correctly
- Check Edge Function logs in Supabase Dashboard
- Verify the amount is valid (greater than 0)

### Webhook Not Received
- Verify the webhook URL is publicly accessible
- Check webhook configuration in Paystack Dashboard
- Check `paystack-webhook` function logs for errors
- Verify signature verification is passing

### Payment Captured but Escrow Not Created
- Check `paystack-webhook` function logs
- Verify order exists in database
- Check database permissions for escrow_transactions table

### Amount Mismatch
- Remember: Paystack amounts are in kobo/cents (multiply by 100)
- The Edge Function handles this conversion automatically

## Going Live

When ready to go live:

1. **Get Live API Keys**:
   - Complete business verification in Paystack Dashboard
   - Navigate to Settings > API Keys & Webhooks
   - Switch to "Live" mode
   - Copy your live keys (pk_live_... and sk_live_...)

2. **Update Secrets**:
   ```bash
   npx supabase secrets set PAYSTACK_SECRET_KEY="sk_live_your_key"
   npx supabase secrets set PAYSTACK_PUBLIC_KEY="pk_live_your_key"
   ```

3. **Update Webhook URL**:
   - In Paystack Dashboard, update webhook URL to production URL
   - Ensure webhook is configured for live mode

4. **Test with Small Transaction**:
   - Make a small real transaction to verify everything works
   - Confirm payment is captured and escrow is created

## Support

For issues or questions:
- Check Supabase Edge Function logs
- Review Paystack developer documentation: https://paystack.com/docs
- Check Paystack Dashboard for transaction details
- Contact: contact@solelyshoes.co.ke
