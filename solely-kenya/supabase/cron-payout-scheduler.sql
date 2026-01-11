-- ================================================================
-- AUTOMATIC PAYOUT SCHEDULER
-- ================================================================
-- This cron job checks vendor balances and triggers automatic payouts
-- when balance reaches KES 1,500
-- Runs every 5 minutes
-- ================================================================
-- IMPORTANT: Replace YOUR_SUPABASE_SERVICE_ROLE_KEY with your actual
-- service role key from Supabase Dashboard > Settings > API
-- DO NOT commit the actual key to git!
-- ================================================================

SELECT cron.schedule(
    'process-auto-payouts',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT
      net.http_post(
          url:='https://cqcklvdblhcdowisjnsf.supabase.co/functions/v1/check-and-process-payouts',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ================================================================
-- VIEW PAYOUT CRON JOB
-- ================================================================
SELECT * FROM cron.job WHERE jobname = 'process-auto-payouts';

-- ================================================================
-- UNSCHEDULE (if needed)
-- ================================================================
-- SELECT cron.unschedule('process-auto-payouts');
