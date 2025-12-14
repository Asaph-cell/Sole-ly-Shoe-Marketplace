# Quick Fix for "Failed to initiate M-Pesa payment"

## Most Common Issue: Missing Callback URL

The error usually occurs because `MPESA_CALLBACK_URL` is not set or incorrect.

## Step-by-Step Fix

### 1. Get Your Supabase Project URL

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** > **API**
4. Copy your **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)

### 2. Set the Callback URL Secret

1. In Supabase Dashboard, go to **Project Settings** > **Edge Functions** > **Secrets**
2. Add a new secret:
   - **Name**: `MPESA_CALLBACK_URL`
   - **Value**: `https://YOUR-PROJECT-ID.supabase.co/functions/v1/mpesa-callback`
   - Replace `YOUR-PROJECT-ID` with your actual project ID from the URL

### 3. Verify All Required Secrets Are Set

Make sure these secrets are set in Supabase:

✅ `MPESA_CONSUMER_KEY` = `VUOZt9q1JBoNlAxHULNGSdQaLUj9AyM8M5sgXU9X9noKnYdp`
✅ `MPESA_CONSUMER_SECRET` = `YLj1KVJ2bM2zfyOnVoKRAeU5HAtsGiBRUGtpFQ1qkUb8dxjqJH73cLs1Hgl9P6Xl`
✅ `MPESA_SHORTCODE` = `174379`
✅ `MPESA_PASSKEY` = `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
✅ `MPESA_CALLBACK_URL` = `https://YOUR-PROJECT-ID.supabase.co/functions/v1/mpesa-callback`

### 4. Deploy the Edge Function

After setting secrets, make sure the function is deployed:

```bash
# If you have Supabase CLI installed
supabase functions deploy mpesa-order-payment
```

Or deploy via Supabase Dashboard:
1. Go to **Edge Functions**
2. Find `mpesa-order-payment`
3. Click **Deploy** or **Redeploy**

### 5. Check Function Logs

If it still fails, check the logs:

1. Go to **Edge Functions** > `mpesa-order-payment`
2. Click on **Logs**
3. Look for error messages that will now show:
   - Which configuration is missing
   - M-Pesa API error details
   - Authentication issues

## Common Error Messages and Fixes

### "Missing M-Pesa configuration: MPESA_CALLBACK_URL"
→ Set the `MPESA_CALLBACK_URL` secret as described above

### "Failed to authenticate with M-Pesa API"
→ Check that `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` are correct

### "M-Pesa STK Push request failed"
→ Check that `MPESA_SHORTCODE` and `MPESA_PASSKEY` are correct
→ Verify you're using sandbox credentials for testing

## Testing

After setting up, test with:
- Sandbox phone number: `254708374149`
- Sandbox amount: Any amount (sandbox allows any)

## Still Having Issues?

1. Check Supabase Edge Function logs for detailed error messages
2. Verify all secrets are set (no typos in secret names)
3. Make sure you're using sandbox credentials for testing
4. Check that the callback URL is publicly accessible (Supabase functions are by default)

