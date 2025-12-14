# Deployment Notes

## Edge Functions

The checkout functionality requires the `create-order` Edge Function to be deployed.

### Deploy the Edge Function

```bash
# Navigate to your project root
cd solely-kenya

# Deploy the create-order function
supabase functions deploy create-order
```

### Verify Deployment

After deployment, verify the function is available:
- Check Supabase Dashboard > Edge Functions
- The function should appear in the list

### Environment Variables

The Edge Function requires these environment variables (set in Supabase Dashboard):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

These are typically set automatically when deploying via Supabase CLI.

### Troubleshooting

If you get "Failed to send a request to the Edge Function":
1. Verify the function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs create-order`
3. Ensure you're authenticated: `supabase login`
4. Verify your project is linked: `supabase link --project-ref <your-project-ref>`

