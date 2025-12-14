# M-Pesa Configuration Setup

## Environment Variables for Supabase Edge Functions

You need to set the following secrets in your Supabase project for the M-Pesa integration to work.

### Required Secrets

Set these in your Supabase Dashboard under **Project Settings > Edge Functions > Secrets**:

```
MPESA_CONSUMER_KEY=VUOZt9q1JBoNlAxHULNGSdQaLUj9AyM8M5sgXU9X9noKnYdp
MPESA_CONSUMER_SECRET=YLj1KVJ2bM2zfyOnVoKRAeU5HAtsGiBRUGtpFQ1qkUb8dxjqJH73cLs1Hgl9P6Xl
```

### Additional M-Pesa Configuration Needed

You'll also need to configure these additional secrets (get them from your Safaricom Developer Portal):

```
MPESA_SHORTCODE=174379

MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

MPESA_CALLBACK_URL=dffd8a09f5c7716471657a525d4df2cf1439a6f04c8df72
MPESA_INITIATOR_NAME=your_initiator_name
MPESA_INITIATOR_PASSWORD=your_initiator_password
MPESA_SECURITY_CREDENTIAL=your_security_credential
MPESA_QUEUE_TIMEOUT_URL=https://your-domain.com/mpesa/b2c-callback
MPESA_RESULT_URL=https://your-domain.com/mpesa/b2c-callback
```

## How to Set Secrets in Supabase

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **Edge Functions**
3. Click on **Secrets** tab
4. Click **Add new secret**
5. Enter the secret name (e.g., `MPESA_CONSUMER_KEY`)
6. Enter the secret value
7. Click **Save**
8. Repeat for all required secrets

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set MPESA_CONSUMER_KEY=VUOZt9q1JBoNlAxHULNGSdQaLUj9AyM8M5sgXU9X9noKnYdp
supabase secrets set MPESA_CONSUMER_SECRET=YLj1KVJ2bM2zfyOnVoKRAeU5HAtsGiBRUGtpFQ1qkUb8dxjqJH73cLs1Hgl9P6Xl
supabase secrets set MPESA_SHORTCODE=your_shortcode
supabase secrets set MPESA_PASSKEY=your_passkey
supabase secrets set MPESA_CALLBACK_URL=https://your-project-id.supabase.co/functions/v1/mpesa-callback
```

## Important Security Notes

⚠️ **NEVER commit these credentials to Git or expose them in client-side code!**

- These secrets are only used in Edge Functions (server-side)
- They are automatically encrypted by Supabase
- Never share these credentials publicly
- Rotate them if they are ever exposed

## Testing

After setting up the secrets:

1. Deploy your Edge Functions:
   ```bash
   supabase functions deploy mpesa-order-payment
   supabase functions deploy mpesa-callback
   ```

2. Test the integration using the M-Pesa sandbox environment first

3. Once verified, switch to production credentials

## Getting Additional M-Pesa Credentials

1. Go to https://developer.safaricom.co.ke
2. Log in to your account
3. Navigate to **My Apps**
4. Select your app to view:
   - Shortcode
   - Passkey
   - Initiator Name
   - Security Credential (encrypted password)

## Callback URL Setup

Make sure to configure your callback URL in the Safaricom Developer Portal:
- **STK Push Callback**: `https://your-project-id.supabase.co/functions/v1/mpesa-callback`
- **B2C Callback**: Your domain URL for payout callbacks

## Support

If you encounter issues:
- Check Supabase Edge Function logs
- Verify all secrets are set correctly
- Ensure callback URLs are accessible
- Test with M-Pesa sandbox first

