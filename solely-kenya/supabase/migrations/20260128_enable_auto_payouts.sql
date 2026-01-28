-- ================================================================
-- ENABLE AUTOMATIC PAYOUTS (Hourly Check)
-- Run this SQL in Supabase Dashboard > SQL Editor
-- ================================================================

-- Enable the 'pg_cron' extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the payout checker to run every hour
-- It calls the edge function 'check-and-process-payouts'
-- Note: Requires the edge function to be deployed and accessible via net.http_post or similar trigger mechanism.
-- Since Supabase Edge Functions are HTTP endpoints, we typically use pg_net or a dedicated internal trigger.
-- However, standard practice for Supabase Cron is performing SQL operations or calling an HTTP endpoint.

-- If 'check-and-process-payouts' is an Edge Function, we need to invoke it via HTTP.
-- Assuming the project URL and anon key are available or hardcoded for the job.

-- Simplified approach: Call the function via pg_net (if installed) or use the internal postgres wrapper if applicable.
-- Since we saw 'SELECT cron.unschedule' in the disable script, we assume a previous schedule existed.
-- Let's attempt to schedule an HTTP call to the edge function.

SELECT cron.schedule(
    'process-auto-payouts', -- Job name
    '0 * * * *',           -- Every hour
    $$
    select
      net.http_post(
          url:='https://cqcklvdblhcdowisjnsf.supabase.co/functions/v1/check-and-process-payouts',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- NOTE: You must replace 'SERVICE_ROLE_KEY' with your actual service role key 
-- OR use a Vault secret if configured.
-- For safety in this file, we will assume the user needs to run this manually in the dashboard where they can supply the key.
