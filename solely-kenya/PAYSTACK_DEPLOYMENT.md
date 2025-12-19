# Paystack Migration - Deployment Checklist

## Prerequisites
- [x] Paystack account created
- [x] Test API keys obtained
- [x] Code changes completed

## Deployment Steps

### 1. Set Up Environment Variables

Run these commands in your terminal:

```bash
cd supabase
npx supabase secrets set PAYSTACK_SECRET_KEY="sk_test_cd2032680391846abd0f6bf6d43efb2fae38d9ac"
npx supabase secrets set PAYSTACK_PUBLIC_KEY="pk_test_38dd8719c100836563e55e9aec1f3ed42ed8f671"
```

### 2. Deploy Edge Functions

```bash
# Deploy the payment initiation function
npx supabase functions deploy paystack-initiate-payment

# Deploy the webhook handler
npx supabase functions deploy paystack-webhook
```

### 3. Run Database Migration

```bash
# Apply the migration to add 'paystack' to payment_gateway enum
npx supabase db push
```

Alternatively, run the migration via Supabase Dashboard:
1. Go to SQL Editor
2. Open file: `supabase/migrations/20251219_add_paystack_gateway.sql`
3. Execute the SQL

### 4. Configure Paystack Webhook

1. Login to Paystack Dashboard: https://dashboard.paystack.com
2. Go to **Settings** > **API Keys & Webhooks**
3. Scroll to **Webhooks** section
4. Click **Add Endpoint**
5. Enter webhook URL: 
   ```
   https://YOUR-PROJECT-ID.supabase.co/functions/v1/paystack-webhook
   ```
   (Replace YOUR-PROJECT-ID with your actual Supabase project ID)
6. Select events: `charge.success`
7. Save the webhook

### 5. Test the Integration

#### Test Checkout Flow:
1. Start dev server: `npm run dev`
2. Add items to cart and go to checkout
3. Fill in delivery details
4. Select "Pay with M-Pesa / Card"
5. Click "Place order"
6. You should be redirected to Paystack checkout
7. Use test card: `4084084084084081` (any future expiry, any CVV)
8. Complete payment
9. Verify you're redirected back to orders page
10. Check order status shows "Payment Complete"

#### Verify Database:
1. Open Supabase Dashboard > Table Editor
2. Check `payments` table - should have a record with:
   - gateway: `paystack`
   - status: `captured`
   - transaction_reference populated
3. Check `escrow_transactions` table - should have a record with:
   - status: `held`
   - correct amounts

### 6. Test Webhook (Optional but Recommended)

1. In Paystack Dashboard, go to Webhooks
2. Find your webhook endpoint
3. Use "Test Webhook" button to send a test event
4. Check Supabase Edge Function logs for `paystack-webhook`
5. Verify webhook was received and processed

### 7. Clean Up (Optional)

If you want to remove the old IntraSend function:

```bash
# List functions
npx supabase functions list

# Delete old function
npx supabase functions delete intrasend-initiate-payment
```

You can also remove the environment variable:
```bash
npx supabase secrets unset INTRASEND_PUBLISHABLE_KEY
```

## Going Live Checklist

When ready for production:

### 1. Get Live API Keys
- [ ] Complete business verification in Paystack
- [ ] Obtain live API keys (pk_live_... and sk_live_...)

### 2. Update Secrets
```bash
npx supabase secrets set PAYSTACK_SECRET_KEY="sk_live_YOUR_LIVE_KEY"
npx supabase secrets set PAYSTACK_PUBLIC_KEY="pk_live_YOUR_LIVE_KEY"
```

### 3. Update Webhook
- [ ] Update webhook URL in Paystack Dashboard to live mode
- [ ] Verify webhook is active for live transactions

### 4. Test with Small Amount
- [ ] Make a small real transaction (e.g., 100 KES)
- [ ] Verify payment is captured
- [ ] Verify escrow is created
- [ ] Test refund process if needed

### 5. Monitor
- [ ] Monitor Edge Function logs for first 24 hours
- [ ] Check Paystack Dashboard for transaction success rate
- [ ] Have support ready for customer payment issues

## Troubleshooting

### If payments fail:
1. Check Edge Function logs: Dashboard > Edge Functions > paystack-initiate-payment
2. Verify API keys are set correctly
3. Check Paystack Dashboard for error details
4. Verify amount format (should be positive number)

### If webhook not working:
1. Check Edge Function logs: Dashboard > Edge Functions > paystack-webhook
2. Verify webhook URL in Paystack Dashboard
3. Test webhook using Paystack's test feature
4. Check for signature verification errors in logs

### If database errors:
1. Ensure migration was applied successfully
2. Regenerate TypeScript types: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`
3. Restart dev server

## Support

For help, check:
- Paystack Docs: https://paystack.com/docs
- Supabase Docs: https://supabase.com/docs
- Edge Function Logs in Supabase Dashboard
