# Payment Integration Setup Guide

This document explains how to set up Pesapal payment integration for the Solely marketplace.

## Overview

The payment system supports:
- **Pesapal**: M-Pesa, Visa, Mastercard, Airtel Money (unified checkout)
- **Escrow System**: Payments are held in escrow until delivery confirmation
- **Automatic Release**: Escrow auto-releases 3 days after shipment
- **Commission**: 10% commission automatically deducted from each sale

## Environment Variables

### Pesapal Configuration

Add these to your Supabase Edge Functions secrets:

```bash
PESAPAL_CONSUMER_KEY=your_consumer_key
PESAPAL_CONSUMER_SECRET=your_consumer_secret
PESAPAL_SANDBOX=true  # Set to 'false' for production
```

**To get your Pesapal credentials:**
1. Sign up at https://www.pesapal.com
2. Go to Dashboard > API Keys
3. Copy your Consumer Key and Consumer Secret
4. For testing, use sandbox credentials from https://developer.pesapal.com

### Setting Secrets in Supabase

```bash
cd supabase
npx supabase secrets set PESAPAL_CONSUMER_KEY="your_key"
npx supabase secrets set PESAPAL_CONSUMER_SECRET="your_secret"
npx supabase secrets set PESAPAL_SANDBOX="true"
```

## Edge Functions

### 1. pesapal-register-ipn (One-Time Setup)

Registers the IPN URL with Pesapal. **Run once after deployment.**

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/pesapal-register-ipn \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notificationType": "GET"}'
```

This saves the `ipn_id` to the database, which is required for all payments.

### 2. pesapal-initiate-payment

Initiates a payment and returns a redirect URL.

```javascript
const { data } = await supabase.functions.invoke('pesapal-initiate-payment', {
  body: { orderId: '...' }
});
// Redirect user to data.redirectUrl
```

### 3. pesapal-ipn-listener

Handles Pesapal IPN (Instant Payment Notification) callbacks. Automatically updates order/payment status.

**URL**: `https://YOUR-PROJECT.supabase.co/functions/v1/pesapal-ipn-listener`

### 4. pesapal-callback

Handles user redirect after payment completion. Redirects to `/orders/{orderId}`.

## Payment Flow

### Customer Payment Flow

1. Customer fills checkout form
2. Order created with status `pending_vendor_confirmation`
3. Payment record created with status `pending`
4. User redirected to Pesapal checkout page
5. User selects payment method (M-Pesa, Card, etc.)
6. On payment success (via IPN):
   - Payment status → `captured`
   - Escrow transaction created with status `held`
7. User redirected back to order page

### Escrow Release Flow

1. Vendor marks order as `shipped`
2. `auto_release_at` set to 3 days from shipment
3. Customer can confirm delivery (order → `completed`)
4. If customer doesn't confirm, escrow auto-releases after 3 days
5. On release:
   - Escrow status → `released`
   - Payout record created
   - Commission recorded in ledger

## Commission Structure

- **Commission Rate**: 10% of order subtotal
- **Payout Amount**: `total - commission_amount`
- **Pesapal Fees**: Deducted from the 10% commission

## Database Tables

| Table | Purpose |
| --- | --- |
| `pesapal_config` | Stores IPN ID and token cache |
| `orders` | Order records with commission fields |
| `payments` | Payment records (gateway = 'pesapal') |
| `escrow_transactions` | Escrow status and amounts |
| `payouts` | Vendor payout records |
| `commission_ledger` | Commission transactions |

## Deployment

### 1. Deploy Edge Functions

```bash
cd supabase
npx supabase functions deploy pesapal-register-ipn
npx supabase functions deploy pesapal-initiate-payment
npx supabase functions deploy pesapal-ipn-listener
npx supabase functions deploy pesapal-callback
```

### 2. Run Database Migration

```bash
npx supabase db push
```

Or run the SQL in `migrations/20251213_pesapal_config.sql` via Supabase Dashboard.

### 3. Register IPN (One-Time)

See step 1 in Edge Functions above.

## Testing

### Pesapal Sandbox

- **Sandbox URL**: https://cybqa.pesapal.com/pesapalv3
- Set `PESAPAL_SANDBOX=true` in secrets
- Use sandbox consumer key/secret from developer portal

### Test Card Numbers

Use Pesapal sandbox test cards (available on developer portal).

### Test M-Pesa

Use sandbox M-Pesa numbers provided by Pesapal.

## Troubleshooting

### Payment Not Initiating
- Check `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` are set
- Check Edge Function logs in Supabase Dashboard
- Verify IPN is registered (check `pesapal_config` table)

### IPN Not Received
- Verify the IPN URL is publicly accessible
- Check Pesapal dashboard for IPN delivery logs
- Whitelist `pesapal.com` domain if you have firewall rules

### Escrow Not Releasing
- Verify `auto_release_at` is set correctly
- Check `auto-release-escrow` function is running
- Verify order status is `shipped`

## Support

For issues or questions:
- Check Supabase Edge Function logs
- Review Pesapal developer portal
- Contact: Solely.kenya@gmail.com
