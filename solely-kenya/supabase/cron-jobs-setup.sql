-- ================================================================
-- SOLELY KENYA - CRON JOBS SETUP
-- ================================================================
-- This SQL script schedules automated order management cron jobs
-- Run this in your Supabase SQL Editor after deploying Edge Functions
-- ================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ================================================================
-- 1. AUTO-CANCEL STALE ORDERS
-- ================================================================
-- Runs every 5 minutes
-- Cancels orders where vendor hasn't responded within 24 hours
-- ================================================================

SELECT cron.schedule(
    'auto-cancel-stale-orders',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT
      net.http_post(
          url:='https://your-project-ref.supabase.co/functions/v1/auto-cancel-stale-orders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ================================================================
-- 2. AUTO-RELEASE ESCROW
-- ================================================================
-- Runs every 10 minutes
-- Releases escrow funds 3 days after delivery confirmation
-- ================================================================

SELECT cron.schedule(
    'auto-release-escrow',
    '*/10 * * * *', -- Every 10 minutes
    $$
    SELECT
      net.http_post(
          url:='https://your-project-ref.supabase.co/functions/v1/auto-release-escrow',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ================================================================
-- 3. AUTO-REFUND UNSHIPPED ORDERS
-- ================================================================
-- Runs every hour
-- Refunds orders where vendor accepted but didn't ship within 3 days
-- ================================================================

SELECT cron.schedule(
    'auto-refund-unshipped',
    '0 * * * *', -- Every hour at minute 0
    $$
    SELECT
      net.http_post(
          url:='https://your-project-ref.supabase.co/functions/v1/auto-refund-unshipped',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ================================================================
-- VIEW SCHEDULED CRON JOBS
-- ================================================================
-- Run this to see all scheduled jobs

SELECT * FROM cron.job;

-- ================================================================
-- UNSCHEDULE JOBS (if needed)
-- ================================================================
-- Run these if you need to remove/update a cron job

-- SELECT cron.unschedule('auto-cancel-stale-orders');
-- SELECT cron.unschedule('auto-release-escrow');
-- SELECT cron.unschedule('auto-refund-unshipped');

-- ================================================================
-- NOTES
-- ================================================================
-- 1. Replace 'your-project-ref' with your actual Supabase project reference
-- 2. Replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY' with your actual service role key
--    (Found in Supabase Dashboard > Settings > API)
-- 3. Cron jobs run in UTC timezone
-- 4. Make sure Edge Functions are deployed before scheduling
-- ================================================================
